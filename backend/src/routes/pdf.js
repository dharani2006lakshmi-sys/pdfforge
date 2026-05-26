import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
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
    if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
      return cb(new Error('Only PDF files are allowed'))
    }
    cb(null, true)
  },
})

function cleanup(files) {
  if (!files) return
  const arr = Array.isArray(files) ? files : [files]
  arr.forEach(f => { try { fs.unlinkSync(f.path) } catch (_) {} })
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
    const options = req.body.options ? JSON.parse(req.body.options) : {}
    const filePaths = req.files.map(f => f.path)
    const origName = req.files[0].originalname

    let result          // Buffer | Buffer[]
    let isSplit = false

    switch (tool) {
      // ── Organize ──
      case 'merge':
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
        if (!options.pages) return res.status(400).json({ error: 'Specify pages to delete' })
        result = await pdf.deletePages(filePaths[0], options.pages)
        break
      case 'extract':
        if (!options.pages) return res.status(400).json({ error: 'Specify pages to extract' })
        result = await pdf.extractPages(filePaths[0], options.pages)
        break
      case 'reorder':
        if (!options.order) return res.status(400).json({ error: 'Specify new order' })
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

      // ── Optimize ──
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
        result = await pdf.splitByPageCount(filePaths[0], options.pagesperchunk || 5)
        isSplit = true
        break

      // ── Annotate / Edit ──
      case 'watermark':
        const opMap = { 'Light (20%)': 0.2, 'Medium (35%)': 0.35, 'Strong (50%)': 0.5 }
        result = await pdf.addWatermark(
          filePaths[0],
          options.text || 'WATERMARK',
          opMap[options.opacity] || parseFloat(options.opacity) || 0.25,
          options.color || 'gray'
        )
        break
      case 'stamp':
        result = await pdf.stampPDF(filePaths[0], options.stamp || 'APPROVED')
        break
      case 'pagenumbers':
        const posMap = { 'Bottom Center': 'center', 'Bottom Right': 'right', 'Bottom Left': 'left' }
        result = await pdf.addPageNumbers(filePaths[0], posMap[options.position] || 'center', parseInt(options.startnum)||1)
        break
      case 'headerfooter':
        result = await pdf.addHeaderFooter(filePaths[0], options.header || '', options.footer || '')
        break
      case 'addtext':
        result = await pdf.addTextAnnotation(filePaths[0], options.text||'Text', options.x||100, options.y||100, options.fontsize||14, options.pagenum||1)
        break
      case 'addrect':
        result = await pdf.addRectangle(filePaths[0], options.x||50, options.y||50, options.width||200, options.height||100, options.color||'red', options.pagenum||1)
        break
      case 'addline':
        result = await pdf.addLine(filePaths[0], options.x1||50, options.y1||100, options.x2||400, options.y2||100, options.color||'black', options.pagenum||1)
        break
      case 'metadata':
        result = await pdf.editMetadata(filePaths[0], options)
        break

      // ── Security ──
      case 'protect':
        if (!options.password) return res.status(400).json({ error: 'Password required' })
        result = await pdf.protectPDF(filePaths[0], options.password)
        break
      case 'unlock':
        result = await pdf.unlockPDF(filePaths[0])
        break

      // ── Advanced ──
      case 'flatten':
        result = await pdf.flattenPDF(filePaths[0])
        break
      case 'overlay':
        if (filePaths.length < 2) return res.status(400).json({ error: 'Two PDFs required for overlay' })
        result = await pdf.overlayPDFs(filePaths[0], filePaths[1])
        break

      default:
        return res.status(400).json({ error: `Unknown tool: ${tool}` })
    }

    // ── Save history if logged in ──
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

    // ── Send result ──
    if (isSplit && Array.isArray(result)) {
      // Return first chunk; client knows it's a split
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${tool}_page1_${Date.now()}.pdf"`)
      res.setHeader('X-Split-Count', result.length)
      res.send(Buffer.from(result[0]))
    } else {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${tool}_${Date.now()}.pdf"`)
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
