import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { authMiddleware, optionalAuth } from '../middleware/auth.js'
import * as pdfService from '../services/pdfService.js'
import { uploadToSupabase, getSignedUrl, deleteFromSupabase } from '../services/supabase.js'
import { supabase } from '../services/supabase.js'

const router = express.Router()

// Setup multer for file uploads
const upload = multer({
  dest: process.env.TEMP_DIR || '/tmp/pdfforge',
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800) },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf' && !file.originalname.endsWith('.pdf')) {
      return cb(new Error('Only PDF files allowed'))
    }
    cb(null, true)
  }
})

// Process PDF with a tool
router.post('/process', optionalAuth, upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' })
    }

    const { tool, options: optStr } = req.body
    const options = optStr ? JSON.parse(optStr) : {}
    const filePaths = req.files.map(f => f.path)

    let result
    const origName = req.files[0].originalname

    switch (tool) {
      case 'merge':
        result = await pdfService.mergePDFs(filePaths)
        break
      case 'split':
        const splits = await pdfService.splitPDF(filePaths[0])
        // For split, return first file + info about others
        result = splits[0]
        break
      case 'rotate':
        const angle = { '90° Clockwise': 90, '180°': 180, '90° Counter-clockwise': 270 }[options.rotation] || 90
        result = await pdfService.rotatePDF(filePaths[0], angle)
        break
      case 'delete':
        result = await pdfService.deletePages(filePaths[0], options.pages)
        break
      case 'extract':
        result = await pdfService.extractPages(filePaths[0], options.pages)
        break
      case 'reorder':
        result = await pdfService.reorderPages(filePaths[0], options.order)
        break
      case 'compress':
        result = await pdfService.compressPDF(filePaths[0])
        break
      case 'watermark':
        const opacity = parseFloat(options.opacity) || 0.25
        const opacityMap = { 'Light (20%)': 0.2, 'Medium (35%)': 0.35, 'Strong (50%)': 0.5 }
        const opValue = opacityMap[options.opacity] || opacity
        result = await pdfService.addWatermark(filePaths[0], options.text || 'WATERMARK', opValue, options.color)
        break
      case 'pagenumbers':
        const posMap = { 'Bottom Center': 'center', 'Bottom Right': 'right', 'Bottom Left': 'left' }
        const pos = posMap[options.position] || 'center'
        const start = parseInt(options.startnum) || 1
        result = await pdfService.addPageNumbers(filePaths[0], pos, start)
        break
      case 'metadata':
        result = await pdfService.editMetadata(filePaths[0], options)
        break
      default:
        return res.status(400).json({ error: 'Unknown tool: ' + tool })
    }

    // Save to Supabase if user is logged in
    if (req.user) {
      const storagePath = `${req.user.uid}/results/${uuidv4()}.pdf`
      await uploadToSupabase(result, storagePath)
      
      // Record in database
      await supabase.from('pdf_history').insert({
        user_id: req.user.uid,
        tool_used: tool,
        original_filename: origName,
        result_path: storagePath,
        file_size: result.length,
      })
    }

    // Send result
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${tool}_${Date.now()}.pdf"`)
    res.send(result)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Processing failed' })
  } finally {
    // Cleanup temp files
    if (req.files) {
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path) } catch (e) {}
      })
    }
  }
})

// Save file to Supabase
router.post('/files/save', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { tool, userId } = req.body
    const file = req.files?.[0] || req.file

    if (!file) return res.status(400).json({ error: 'No file provided' })

    const storagePath = `${userId}/results/${uuidv4()}.pdf`
    const fileBuffer = fs.readFileSync(file.path)

    await uploadToSupabase(fileBuffer, storagePath)

    await supabase.from('pdf_history').insert({
      user_id: userId,
      tool_used: tool,
      original_filename: file.originalname,
      result_path: storagePath,
      file_size: fileBuffer.length,
    })

    res.json({
      path: storagePath,
      size: fileBuffer.length,
      message: 'File saved',
    })

  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    if (req.file) {
      try { fs.unlinkSync(req.file.path) } catch (e) {}
    }
  }
})

// Get file history
router.get('/files/history', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get signed download URL
router.get('/files/:fileId/url', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history')
      .select('result_path')
      .eq('id', req.params.fileId)
      .eq('user_id', req.user.uid)
      .single()

    if (error || !data) return res.status(404).json({ error: 'File not found' })

    const signedUrl = await getSignedUrl(data.result_path, 3600)
    res.json({ url: signedUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete file
router.delete('/files/:fileId', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pdf_history')
      .select('result_path')
      .eq('id', req.params.fileId)
      .eq('user_id', req.user.uid)
      .single()

    if (error || !data) return res.status(404).json({ error: 'File not found' })

    await deleteFromSupabase(data.result_path)

    const { error: delError } = await supabase
      .from('pdf_history')
      .delete()
      .eq('id', req.params.fileId)

    if (delError) throw delError

    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
