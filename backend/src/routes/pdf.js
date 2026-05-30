import express from 'express'
import * as advancedPdf from '../services/advancedPdfService.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware, optionalAuth } from '../middleware/auth.js'
import * as pdf from '../services/pdfService.js'
import { uploadToSupabase, getSignedUrl, deleteFromSupabase } from '../services/supabase.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()
const tempDir = process.env.TEMP_DIR || '/tmp/pdfforge'

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, tempDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`),
})

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800') },
  fileFilter: (req, file, cb) => {
    const isPDF = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')
    const isImage = file.mimetype.startsWith('image/') || file.originalname.match(/\.(png|jpe?g)$/i)
    const isWord = file.originalname.match(/\.(docx)$/i)
    if (!isPDF && !isImage && !isWord) return cb(new Error('Only PDF, image, and Word files are allowed.'))
    cb(null, true)
  },
})

function cleanup(files) {
  if (!files) return
  const arr = Array.isArray(files) ? files : [files]
  arr.forEach(f => { try { fs.unlinkSync(f.path) } catch (_) {} })
}

function sendZip(res, buffers, baseName) {
  return new Promise((resolve, reject) => {
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.zip"`)
    res.setHeader('X-Split-Count', buffers.length)
    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.on('error', reject)
    archive.on('end', resolve)
    archive.pipe(res)
    buffers.forEach((buf, i) => {
      archive.append(Buffer.from(buf), { name: `${baseName}_part${i + 1}.pdf` })
    })
    archive.finalize()
  })
}

// ─── GET PDF INFO ─────────────────────────────────────────────────────────────
router.post('/info', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })
    const info = await pdf.getPDFInfo(req.file.path)
    res.json(info)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to read PDF info' })
  } finally {
    cleanup(req.file)
  }
})

// ─── MAIN PROCESS ─────────────────────────────────────────────────────────────
router.post('/process', optionalAuth, upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' })
    }

    const { tool } = req.body
    if (!tool) return res.status(400).json({ error: 'No tool specified' })

    const options = req.body.options ? JSON.parse(req.body.options) : {}
    const filePaths = req.files.map(f => f.path)
    const origName = req.files[0].originalname

    let result
    let isSplit = false

    switch (tool) {
      case 'merge':
        if (filePaths.length < 2) return res.status(400).json({ error: 'Please upload at least 2 PDFs to merge' })
        result = await pdf.mergePDFs(filePaths)
        break
      case 'split':
        result = await pdf.splitPDF(filePaths[0])
        isSplit = true
        break
      case 'rotate':
        const angleMap = { '90° Clockwise': 90, '180°': 180, '90° Counter-clockwise': 270 }
        result = await pdf.rotatePDF(filePaths[0], angleMap[options.rotation] || 90)
        break
      case 'delete':
        if (!options.pages) return res.status(400).json({ error: 'Specify pages to delete (e.g. 1,3,5 or 2-4)' })
        result = await pdf.deletePages(filePaths[0], options.pages)
        break
      case 'extract':
        if (!options.pages) return res.status(400).json({ error: 'Specify pages to extract (e.g. 1,3,5 or 2-4)' })
        result = await pdf.extractPages(filePaths[0], options.pages)
        break
      case 'reorder':
        if (!options.order) return res.status(400).json({ error: 'Specify new page order (e.g. 3,1,2)' })
        result = await pdf.reorderPages(filePaths[0], options.order)
        break
      case 'reverse':
        result = await pdf.reversePages(filePaths[0])
        break
      case 'duplicate':
        result = await pdf.duplicatePage(filePaths[0], options.pagenum || 1)
        break
      case 'addblank':
        result = await pdf.addBlankPages(filePaths[0], options.count || 1, options.position || 'end')
        break
      case 'compress':
        result = await pdf.compressPDF(filePaths[0])
        break
      case 'resize':
        result = await pdf.resizePages(filePaths[0], options.pagesize || 'A4')
        break
      case 'crop':
        result = await pdf.cropPDF(filePaths[0], options.top||0, options.right||0, options.bottom||0, options.left||0)
        break
      case 'twoup':
        result = await pdf.twoUpLayout(filePaths[0])
        break
      case 'grayscale':
        result = await pdf.grayscalePDF(filePaths[0])
        break
      case 'linearize':
        result = await pdf.linearizePDF(filePaths[0])
        break
      case 'splitbypages':
        if (options.pagesperchunk && parseInt(options.pagesperchunk) < 1) {
          return res.status(400).json({ error: 'Pages per chunk must be at least 1' })
        }
        result = await pdf.splitByPageCount(filePaths[0], options.pagesperchunk || 5)
        isSplit = true
        break
      case 'watermark':
        if (!options.text || !options.text.trim()) return res.status(400).json({ error: 'Watermark text cannot be empty' })
        const opMap = { 'Light (20%)': 0.2, 'Medium (35%)': 0.35, 'Strong (50%)': 0.5 }
        result = await pdf.addWatermark(filePaths[0], options.text, opMap[options.opacity] || parseFloat(options.opacity) || 0.25, options.color || 'gray')
        break
      case 'stamp':
        result = await pdf.stampPDF(filePaths[0], options.stamp || 'APPROVED')
        break
      case 'pagenumbers':
        const posMap = { 'Bottom Center': 'center', 'Bottom Right': 'right', 'Bottom Left': 'left' }
        result = await pdf.addPageNumbers(filePaths[0], posMap[options.position] || 'center', parseInt(options.startnum)||1)
        break
      case 'headerfooter':
        if (!options.header && !options.footer) return res.status(400).json({ error: 'Provide at least a header or footer text' })
        result = await pdf.addHeaderFooter(filePaths[0], options.header || '', options.footer || '')
        break
      case 'addtext':
        if (!options.text || !options.text.trim()) return res.status(400).json({ error: 'Text cannot be empty' })
        result = await pdf.addTextAnnotation(filePaths[0], options.text, options.x||100, options.y||100, options.fontsize||14, options.pagenum||1)
        break
      case 'addrect':
        result = await pdf.addRectangle(filePaths[0], options.x||50, options.y||50, options.width||200, options.height||100, options.color||'red', options.pagenum||1)
        break
      case 'addline':
        result = await pdf.addLine(filePaths[0], options.x1||50, options.y1||100, options.x2||400, options.y2||100, options.color||'black', options.pagenum||1)
        break
      case 'metadata':
        if (!options.title && !options.author && !options.subject && !options.keywords && !options.creator)
          return res.status(400).json({ error: 'Fill in at least one metadata field' })
        result = await pdf.editMetadata(filePaths[0], options)
        break
      case 'addbookmark': {
        let bookmarks = options.bookmarks
        if (typeof bookmarks === 'string') {
          try { bookmarks = JSON.parse(bookmarks) } catch { bookmarks = [] }
        }
        result = await pdf.addBookmark(filePaths[0], bookmarks)
        break
      }
      case 'protect':
        if (!options.password || !options.password.trim()) return res.status(400).json({ error: 'Password is required' })
        result = await pdf.protectPDF(filePaths[0], options.password)
        break
      case 'unlock':
        result = await pdf.unlockPDF(filePaths[0])
        break
      case 'flatten':
        result = await pdf.flattenPDF(filePaths[0])
        break
      case 'overlay':
        if (filePaths.length < 2) return res.status(400).json({ error: 'Upload base PDF first, then overlay PDF (2 files required)' })
        result = await pdf.overlayPDFs(filePaths[0], filePaths[1])
        break
      case 'img2pdf':
        if (filePaths.length === 0) return res.status(400).json({ error: 'Upload at least one image' })
        result = await pdf.imageToPDF(filePaths)
        break
      case 'background':
        result = await pdf.addBackground(filePaths[0], options.color || 'White')
        break
      case 'academicpagenumbers':
        result = await pdf.addAcademicPageNumbers(filePaths[0], options)
        break
      case 'word2pdf':
        if (filePaths.length === 0) return res.status(400).json({ error: 'Upload a word document' })
        result = await advancedPdf.word2pdf(filePaths[0])
        break
      case 'pdf2word':
        result = await advancedPdf.pdf2word(filePaths[0])
        break
      case 'pdf2excel':
        result = await advancedPdf.pdf2excel(filePaths[0])
        break
      case 'pdf2ppt':
        result = await advancedPdf.pdf2ppt(filePaths[0])
        break
      case 'html2pdf':
        if (!options.url) return res.status(400).json({ error: 'URL is required' })
        result = await advancedPdf.html2pdf(options.url)
        break
      default:
        return res.status(400).json({ error: `Unknown tool: "${tool}"` })
    }

    if (req.user) {
      try {
        const buf = isSplit ? result[0] : result
        const storagePath = `${req.user.uid}/results/${uuidv4()}.pdf`
        await uploadToSupabase(buf, storagePath)
        await supabase.from('pdf_history').insert({
          user_id: req.user.uid, tool_used: tool,
          original_filename: origName, result_path: storagePath, file_size: buf.length,
        })
      } catch (_) {}
    }

    if (isSplit && Array.isArray(result)) {
      if (result.length === 1) {
        const ext = tool === 'pdf2img' ? 'png' : 'pdf'
        const mime = tool === 'pdf2img' ? 'image/png' : 'application/pdf'
        res.setHeader('Content-Type', mime)
        res.setHeader('Content-Disposition', `attachment; filename="${tool}_${Date.now()}.${ext}"`)
        res.setHeader('X-Split-Count', '1')
        return res.send(Buffer.from(result[0]))
      }
      await sendZip(res, result, `${tool}_${Date.now()}`)
    } else {
      let ext = 'pdf'
      let mime = 'application/pdf'
      if (tool === 'pdf2word') { ext = 'docx'; mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      if (tool === 'pdf2excel') { ext = 'xlsx'; mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      if (tool === 'pdf2ppt') { ext = 'pptx'; mime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }

      res.setHeader('Content-Type', mime)
      res.setHeader('Content-Disposition', `attachment; filename="${tool}_${Date.now()}.${ext}"`)
      res.send(Buffer.from(result))
    }

  } catch (err) {
    console.error('[PDF Process Error]', err)
    res.status(500).json({ error: err.message || 'Processing failed' })
  } finally {
    cleanup(req.files)
  }
})

// ─── SAVE FILE TO SUPABASE ───────────────────────────────────────────────────
router.post('/files/save', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { tool, userId } = req.body
    const file = req.file
    if (!file) return res.status(400).json({ error: 'No file provided' })
    const storagePath = `${userId}/results/${uuidv4()}.pdf`
    const fileBuffer = fs.readFileSync(file.path)
    await uploadToSupabase(fileBuffer, storagePath)
    await supabase.from('pdf_history').insert({
      user_id: userId, tool_used: tool,
      original_filename: file.originalname,
      result_path: storagePath, file_size: fileBuffer.length,
    })
    res.json({ path: storagePath, size: fileBuffer.length, message: 'File saved' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    cleanup(req.file)
  }
})

// ─── HISTORY / FILE OPS ──────────────────────────────────────────────────────
router.get('/files/history', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history').select('*')
      .eq('user_id', req.user.uid)
      .order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/files/:fileId/url', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history').select('result_path')
      .eq('id', req.params.fileId).eq('user_id', req.user.uid).single()
    if (error || !data) return res.status(404).json({ error: 'File not found' })
    const signedUrl = await getSignedUrl(data.result_path, 3600)
    res.json({ url: signedUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/files/:fileId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history').select('result_path')
      .eq('id', req.params.fileId).eq('user_id', req.user.uid).single()
    if (error || !data) return res.status(404).json({ error: 'File not found' })
    await deleteFromSupabase(data.result_path)
    await supabase.from('pdf_history').delete().eq('id', req.params.fileId)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
