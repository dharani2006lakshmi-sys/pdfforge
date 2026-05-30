import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../hooks/useAuth.jsx'
import { saveHistory } from '../utils/supabase.js'
import toast from 'react-hot-toast'

// ─── TOOL CONFIG ──────────────────────────────────────────────────────────────
// IDs must match backend switch cases in routes/pdf.js
export const TOOL_CONFIG = {
  // Organize
  merge:       { title: 'Merge PDF',        icon: '🔗', desc: 'Combine multiple PDF files into one document.', multi: true,  color: '#7c6aff', category: 'Organize', controls: [] },
  split:       { title: 'Split PDF',         icon: '✂️', desc: 'Split every page into its own PDF file.',        multi: false, color: '#38c4f7', category: 'Organize', controls: [] },
  rotate:      { title: 'Rotate PDF',        icon: '🔄', desc: 'Rotate all pages to the correct orientation.',   multi: false, color: '#ffb347', category: 'Organize', controls: [{ id: 'rotation', label: 'Direction', type: 'select', options: ['90° Clockwise', '180°', '90° Counter-clockwise'] }] },
  delete:      { title: 'Delete Pages',      icon: '🗑️', desc: 'Remove specific pages from your PDF.',           multi: false, color: '#ff4d6d', category: 'Organize', controls: [{ id: 'pages', label: 'Pages to delete', type: 'text', placeholder: 'e.g. 1,3,5 or 2-4' }] },
  extract:     { title: 'Extract Pages',     icon: '📤', desc: 'Save a specific range of pages as a new PDF.',   multi: false, color: '#00e5a0', category: 'Organize', controls: [{ id: 'pages', label: 'Pages to extract', type: 'text', placeholder: 'e.g. 1,3,5 or 2-4' }] },
  reorder:     { title: 'Reorder Pages',     icon: '📋', desc: 'Rearrange pages in a custom order.',             multi: false, color: '#ff6bc8', category: 'Organize', controls: [{ id: 'order', label: 'New page order', type: 'text', placeholder: 'e.g. 3,1,2' }] },
  reverse:     { title: 'Reverse Pages',     icon: '🔀', desc: 'Flip the page order of your PDF.',               multi: false, color: '#7c6aff', category: 'Organize', controls: [] },
  duplicate:   { title: 'Duplicate Page',    icon: '📑', desc: 'Duplicate a specific page and append it.',       multi: false, color: '#38c4f7', category: 'Organize', controls: [{ id: 'pagenum', label: 'Page to duplicate', type: 'text', placeholder: 'e.g. 1' }] },
  addblank:    { title: 'Add Blank Page',    icon: '➕', desc: 'Insert blank pages at the start or end.',        multi: false, color: '#00e5a0', category: 'Organize', controls: [{ id: 'count', label: 'Number of pages', type: 'text', placeholder: '1' }, { id: 'position', label: 'Position', type: 'select', options: ['end', 'start'] }] },
  crop:        { title: 'Crop Pages',        icon: '✂',  desc: 'Trim margins from all pages.',                   multi: false, color: '#a0e5ff', category: 'Organize', controls: [{ id: 'top', label: 'Crop Top (pt)', type: 'text', placeholder: '0' }, { id: 'bottom', label: 'Crop Bottom (pt)', type: 'text', placeholder: '0' }, { id: 'left', label: 'Crop Left (pt)', type: 'text', placeholder: '0' }, { id: 'right', label: 'Crop Right (pt)', type: 'text', placeholder: '0' }] },
  // Optimize
  compress:    { title: 'Compress PDF',      icon: '🗜️', desc: 'Reduce file size without losing quality.',       multi: false, color: '#00e5a0', category: 'Optimize', controls: [] },
  resize:      { title: 'Resize / Reformat', icon: '📐', desc: 'Change all pages to a standard paper size.',    multi: false, color: '#ff6bc8', category: 'Optimize', controls: [{ id: 'pagesize', label: 'Target size', type: 'select', options: ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid'] }] },
  twoup:       { title: '2-Up Layout',       icon: '📰', desc: 'Place 2 pages side-by-side on one sheet.',      multi: false, color: '#7c6aff', category: 'Optimize', controls: [] },
  grayscale:   { title: 'Grayscale PDF',     icon: '🖤', desc: 'Convert PDF to black & white.',                  multi: false, color: '#a8a8c4', category: 'Optimize', controls: [] },
  linearize:   { title: 'Fast Web View',     icon: '⚡', desc: 'Optimize PDF for fast browser loading.',         multi: false, color: '#00e5a0', category: 'Optimize', controls: [] },
  splitbypages:{ title: 'Split by Size',     icon: '📦', desc: 'Break PDF into chunks of N pages each.',        multi: false, color: '#ff4d6d', category: 'Optimize', controls: [{ id: 'pagesperchunk', label: 'Pages per chunk', type: 'text', placeholder: '5' }] },
  repair:      { title: 'Repair PDF',        icon: '🔧', desc: 'Attempt to fix and recover corrupted PDFs.',    multi: false, color: '#ffb347', category: 'Optimize', controls: [] },
  // Edit
  watermark:   { title: 'Add Watermark',     icon: '💧', desc: 'Stamp text onto every page.',                   multi: false, color: '#ffb347', category: 'Edit', controls: [{ id: 'text', label: 'Watermark text', type: 'text', placeholder: 'CONFIDENTIAL' }, { id: 'opacity', label: 'Opacity', type: 'select', options: ['Light (20%)', 'Medium (35%)', 'Strong (50%)'] }, { id: 'color', label: 'Color', type: 'select', options: ['Gray', 'Red', 'Blue', 'Green', 'Black', 'Orange'] }] },
  stamp:       { title: 'Stamp PDF',         icon: '🔖', desc: 'Apply a visible stamp to every page.',          multi: false, color: '#ff4d6d', category: 'Edit', controls: [{ id: 'stamp', label: 'Stamp text', type: 'select', options: ['APPROVED', 'REJECTED', 'DRAFT', 'CONFIDENTIAL', 'FINAL', 'PENDING'] }] },
  pagenumbers: { title: 'Page Numbers',      icon: '🔢', desc: 'Automatically number every page.',              multi: false, color: '#38c4f7', category: 'Edit', controls: [{ id: 'position', label: 'Position', type: 'select', options: ['Bottom Center', 'Bottom Right', 'Bottom Left'] }, { id: 'startnum', label: 'Start from', type: 'text', placeholder: '1' }] },
  // Home uses id='header' but backend uses 'headerfooter' — we map it:
  header:      { title: 'Header & Footer',   icon: '📌', desc: 'Add header and footer text to every page.',     multi: false, color: '#ff6bc8', category: 'Edit', controls: [{ id: 'header', label: 'Header text', type: 'text', placeholder: 'My Company' }, { id: 'footer', label: 'Footer text', type: 'text', placeholder: 'Confidential' }], backendTool: 'headerfooter' },
  headerfooter:{ title: 'Header & Footer',   icon: '📋', desc: 'Add header and footer text to every page.',     multi: false, color: '#7c6aff', category: 'Edit', controls: [{ id: 'header', label: 'Header text', type: 'text', placeholder: 'My Company' }, { id: 'footer', label: 'Footer text', type: 'text', placeholder: 'Confidential' }] },
  addtext:     { title: 'Add Text',          icon: '✍️', desc: 'Insert custom text at any position on a page.', multi: false, color: '#ff6bc8', category: 'Edit', controls: [{ id: 'text', label: 'Text', type: 'text', placeholder: 'Your text here' }, { id: 'pagenum', label: 'Page', type: 'text', placeholder: '1' }, { id: 'x', label: 'X position', type: 'text', placeholder: '100' }, { id: 'y', label: 'Y position', type: 'text', placeholder: '400' }, { id: 'fontsize', label: 'Font size', type: 'text', placeholder: '14' }] },
  addrect:     { title: 'Draw Rectangle',    icon: '⬜', desc: 'Draw a rectangle border on a page.',             multi: false, color: '#ffb347', category: 'Edit', controls: [{ id: 'pagenum', label: 'Page', type: 'text', placeholder: '1' }, { id: 'x', label: 'X', type: 'text', placeholder: '50' }, { id: 'y', label: 'Y', type: 'text', placeholder: '50' }, { id: 'width', label: 'Width', type: 'text', placeholder: '200' }, { id: 'height', label: 'Height', type: 'text', placeholder: '100' }, { id: 'color', label: 'Color', type: 'select', options: ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'Orange'] }] },
  addline:     { title: 'Draw Line',         icon: '📏', desc: 'Draw a horizontal or diagonal line on a page.',  multi: false, color: '#00e5a0', category: 'Edit', controls: [{ id: 'pagenum', label: 'Page', type: 'text', placeholder: '1' }, { id: 'x1', label: 'X1', type: 'text', placeholder: '50' }, { id: 'y1', label: 'Y1', type: 'text', placeholder: '300' }, { id: 'x2', label: 'X2', type: 'text', placeholder: '500' }, { id: 'y2', label: 'Y2', type: 'text', placeholder: '300' }, { id: 'color', label: 'Color', type: 'select', options: ['Black', 'Red', 'Blue', 'Green', 'Gray'] }] },
  metadata:    { title: 'Edit Metadata',     icon: '📝', desc: 'Change title, author, subject, keywords.',       multi: false, color: '#ff6bc8', category: 'Edit', controls: [{ id: 'title', label: 'Title', type: 'text', placeholder: 'Document title' }, { id: 'author', label: 'Author', type: 'text', placeholder: 'Author name' }, { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Subject' }, { id: 'keywords', label: 'Keywords', type: 'text', placeholder: 'keyword1, keyword2' }, { id: 'creator', label: 'Creator', type: 'text', placeholder: 'Creator app' }] },
  addbookmark: { title: 'Add Bookmarks',     icon: '🔖', desc: 'Label specific pages with bookmark tags.',       multi: false, color: '#7c6aff', category: 'Edit', controls: [{ id: 'bookmarks', label: 'Bookmarks (JSON)', type: 'text', placeholder: '[{"title":"Intro","page":1}]' }] },
  annotate:    { title: 'Annotate PDF',      icon: '✏️', desc: 'Add comments and highlights to your PDF.',       multi: false, color: '#ffb347', category: 'Edit', controls: [{ id: 'text', label: 'Comment text', type: 'text', placeholder: 'Your annotation...' }, { id: 'pagenum', label: 'Page', type: 'text', placeholder: '1' }] },
  fillform:    { title: 'Fill Forms',        icon: '📋', desc: 'Fill in PDF form fields online.',                 multi: false, color: '#00e5a0', category: 'Edit', controls: [] },
  background:  { title: 'Add Background',    icon: '🎨', desc: 'Insert a color background on every page.',        multi: false, color: '#a0e5ff', category: 'Edit', controls: [{ id: 'color', label: 'Background color', type: 'select', options: ['White', 'Light Gray', 'Cream', 'Light Blue', 'Light Yellow'] }] },
  // Security
  protect:     { title: 'Protect PDF',       icon: '🔒', desc: 'Lock your PDF with a password.',                 multi: false, color: '#ff4d6d', category: 'Security', controls: [{ id: 'password', label: 'Password', type: 'password', placeholder: 'Enter a strong password' }], note: '⚠️ Adds metadata-level protection.' },
  unlock:      { title: 'Unlock PDF',        icon: '🔓', desc: 'Remove password protection from a PDF.',         multi: false, color: '#7c6aff', category: 'Security', controls: [] },
  flatten:     { title: 'Flatten PDF',       icon: '🗂️', desc: 'Remove form fields and annotations.',            multi: false, color: '#38c4f7', category: 'Security', controls: [] },
  redact:      { title: 'Redact PDF',        icon: '⬛', desc: 'Permanently hide sensitive text from your PDF.', multi: false, color: '#ff4d6d', category: 'Security', controls: [{ id: 'text', label: 'Text to redact', type: 'text', placeholder: 'e.g. John Doe, SSN' }] },
  sign:        { title: 'Sign PDF',          icon: '✍️', desc: 'Add a digital signature to your PDF.',           multi: false, color: '#00e5a0', category: 'Security', controls: [{ id: 'name', label: 'Signature name', type: 'text', placeholder: 'Your full name' }, { id: 'pagenum', label: 'Page', type: 'text', placeholder: '1' }, { id: 'position', label: 'Position', type: 'select', options: ['Bottom Right', 'Bottom Left', 'Bottom Center'] }] },
  // Convert
  pdf2img:     { title: 'PDF to Image',      icon: '🖼️', desc: 'Export each PDF page as a PNG or JPG image.',   multi: false, color: '#38c4f7', category: 'Convert', controls: [{ id: 'format', label: 'Image format', type: 'select', options: ['PNG', 'JPG'] }] },
  img2pdf:     { title: 'Image to PDF',      icon: '📸', desc: 'Convert JPG/PNG images into a PDF.',             multi: true,  color: '#7c6aff', category: 'Convert', controls: [], note: 'Upload JPG or PNG image files.' },
  pdf2word:    { title: 'PDF to Word',       icon: '📄', desc: 'Export your PDF as an editable .docx file.',     multi: false, color: '#ff6bc8', category: 'Convert', controls: [] },
  word2pdf:    { title: 'Word to PDF',       icon: '📃', desc: 'Convert a .docx Word document into a PDF.',      multi: false, color: '#ffb347', category: 'Convert', controls: [], note: 'Upload a .docx file.' },
  pdf2excel:   { title: 'PDF to Excel',      icon: '📊', desc: 'Extract tables from your PDF into a spreadsheet.',multi: false, color: '#00e5a0', category: 'Convert', controls: [] },
  pdf2ppt:     { title: 'PDF to PPT',        icon: '📑', desc: 'Convert PDF slides into a PowerPoint file.',     multi: false, color: '#c4b5ff', category: 'Convert', controls: [] },
  html2pdf:    { title: 'HTML to PDF',       icon: '🌐', desc: 'Snapshot a webpage as a PDF.',                   multi: false, color: '#38c4f7', category: 'Convert', controls: [{ id: 'url', label: 'Webpage URL', type: 'text', placeholder: 'https://example.com' }] },
  ocr:         { title: 'OCR PDF',           icon: '🔍', desc: 'Make scanned PDFs searchable with OCR.',         multi: false, color: '#7c6aff', category: 'Convert', controls: [{ id: 'language', label: 'Language', type: 'select', options: ['English', 'Spanish', 'French', 'German', 'Hindi'] }] },
  // Advanced
  overlay:     { title: 'Overlay PDFs',      icon: '🗃️', desc: 'Overlay one PDF on top of another.',             multi: true,  color: '#ff6bc8', category: 'Advanced', controls: [], note: 'Upload base PDF first, then overlay PDF.' },
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function formatBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

async function ensurePdfJs() {
  if (window.pdfjsLib) return
  await new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload = res; s.onerror = rej
    document.head.appendChild(s)
  })
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
}

// ─── PDF VIEWER ───────────────────────────────────────────────────────────────
function PDFViewer({ source, label, accentColor = '#7c6aff', maxHeight = 360 }) {
  const canvasRef = useRef(null)
  const renderTaskRef = useRef(null)
  const [pdfDoc, setPdfDoc] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [rendering, setRendering] = useState(false)

  // Load document
  useEffect(() => {
    if (!source) return
    let cancelled = false
    setLoading(true); setCurrentPage(1); setPdfDoc(null); setTotalPages(0)
    ;(async () => {
      try {
        await ensurePdfJs()
        const buf = await source.arrayBuffer()
        if (cancelled) return
        const doc = await window.pdfjsLib.getDocument({ data: buf }).promise
        if (cancelled) return
        setPdfDoc(doc); setTotalPages(doc.numPages)
      } catch (e) { console.error('PDF load:', e) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [source])

  // Render current page
  useEffect(() => {
    if (!pdfDoc) return
    let cancelled = false
    setRendering(true)
    ;(async () => {
      try {
        if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null }
        const page = await pdfDoc.getPage(currentPage)
        if (cancelled || !canvasRef.current) return
        const canvas = canvasRef.current
        const parentW = canvas.parentElement?.clientWidth || 640
        const vp0 = page.getViewport({ scale: 1 })
        const scale = Math.min((parentW - 28) / vp0.width, 2)
        const vp = page.getViewport({ scale })
        canvas.width = vp.width; canvas.height = vp.height
        const task = page.render({ canvasContext: canvas.getContext('2d'), viewport: vp })
        renderTaskRef.current = task
        await task.promise
      } catch (e) { if (e?.name !== 'RenderingCancelledException') console.error('Render:', e) }
      finally { if (!cancelled) setRendering(false) }
    })()
    return () => { cancelled = true }
  }, [pdfDoc, currentPage])

  const goTo = n => setCurrentPage(Math.max(1, Math.min(totalPages, n)))
  const name = source?.name || label || 'document.pdf'

  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 14, border: `1px solid ${accentColor}44`, overflow: 'hidden', marginBottom: 20, boxShadow: `0 4px 24px ${accentColor}14` }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)' }}>
        <span>📄</span>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        {totalPages > 0 && (
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', background: `${accentColor}22`, border: `1px solid ${accentColor}44`, padding: '2px 10px', borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
            {totalPages} page{totalPages !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', flexShrink: 0 }}>{formatBytes(source?.size ?? 0)}</span>
      </div>

      {/* Canvas */}
      <div style={{ maxHeight, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: 14, background: '#0f0f1e', minHeight: 100 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 40, color: 'var(--muted)', fontSize: '0.85rem' }}>
            <div className="spinner" style={{ width: 20, height: 20 }} />
            Loading preview…
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {rendering && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,15,30,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, borderRadius: 4 }}>
                <div className="spinner" style={{ width: 18, height: 18 }} />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
          </div>
        )}
      </div>

      {/* Page nav */}
      {totalPages > 1 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--surface)' }}>
          {[['«', 1], ['‹', currentPage - 1]].map(([lbl, target]) => (
            <button key={lbl} onClick={() => goTo(target)} disabled={currentPage === 1}
              style={{ background: 'none', border: '1px solid var(--border2)', color: currentPage === 1 ? 'var(--muted)' : 'var(--text)', borderRadius: 6, padding: '3px 9px', cursor: currentPage === 1 ? 'default' : 'pointer', fontSize: '0.78rem' }}>{lbl}</button>
          ))}
          <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
            <span style={{ color: accentColor }}>{currentPage}</span> / {totalPages}
          </span>
          {[['›', currentPage + 1], ['»', totalPages]].map(([lbl, target]) => (
            <button key={lbl} onClick={() => goTo(target)} disabled={currentPage === totalPages}
              style={{ background: 'none', border: '1px solid var(--border2)', color: currentPage === totalPages ? 'var(--muted)' : 'var(--text)', borderRadius: 6, padding: '3px 9px', cursor: currentPage === totalPages ? 'default' : 'pointer', fontSize: '0.78rem' }}>{lbl}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── STEP BAR ─────────────────────────────────────────────────────────────────
function StepBar({ step, color }) {
  const steps = ['Upload', 'Configure', 'Result']
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i <= step ? color : 'var(--surface2)', border: `2px solid ${i <= step ? color : 'var(--border2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: i <= step ? '#fff' : 'var(--muted)', transition: 'all 0.3s', boxShadow: i === step ? `0 0 12px ${color}66` : 'none' }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: i === step ? 700 : 400, color: i <= step ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: i < step ? color : 'var(--border2)', transition: 'background 0.3s' }} />}
        </div>
      ))}
    </div>
  )
}

// ─── MAIN TOOL PAGE ───────────────────────────────────────────────────────────
export default function Tool() {
  const { toolId } = useParams()
  const { user, getToken } = useAuth()
  const navigate = useNavigate()

  const config = TOOL_CONFIG[toolId]

  const [step, setStep] = useState(0)
  const [files, setFiles] = useState([])
  const [opts, setOpts] = useState({})
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultBlob, setResultBlob] = useState(null)
  const [resultName, setResultName] = useState(null)
  const [isZip, setIsZip] = useState(false)
  const [origSize, setOrigSize] = useState(0)
  const [splitCount, setSplitCount] = useState(null)

  // Reset opts when tool changes
  useEffect(() => {
    if (!config) return
    const defaults = {}
    config.controls?.forEach(c => { defaults[c.id] = c.type === 'select' ? c.options[0] : '' })
    setOpts(defaults)
  }, [toolId])

  // img2pdf and word2pdf accept non-PDF files
  const isImgTool = toolId === 'img2pdf'
  const isWordTool = toolId === 'word2pdf'

  const onDrop = useCallback((accepted, rejected) => {
    rejected?.forEach(({ file, errors }) => {
      if (errors.some(e => e.code === 'file-too-large')) toast.error(`"${file.name}" exceeds the 50 MB limit.`)
      else toast.error(`"${file.name}" could not be accepted.`)
    })
    if (!accepted.length) return
    if (config?.multi) setFiles(prev => [...prev, ...accepted])
    else setFiles([accepted[0]])
    setResultBlob(null)
    setStep(1)
  }, [config])

  const acceptMap = isImgTool
    ? { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }
    : isWordTool
      ? { 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] }
      : { 'application/pdf': ['.pdf'] }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptMap,
    multiple: config?.multi ?? false,
    maxSize: 52428800,
  })

  if (!config) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>Tool not found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>← Back to tools</button>
      </div>
    )
  }

  const removeFile = i => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next); setResultBlob(null)
    if (!next.length) setStep(0)
  }

  const handleProcess = async () => {
    if (!files.length) { toast.error('Please upload a file first'); return }
    setProcessing(true); setProgress(10); setResultBlob(null)

    try {
      setOrigSize(files.reduce((s, f) => s + f.size, 0))
      setProgress(30)

      // Use backendTool alias if defined (e.g. 'header' → 'headerfooter')
      const backendTool = config.backendTool || toolId

      const token = getToken ? await getToken() : null
      const form = new FormData()
      form.append('tool', backendTool)
      form.append('options', JSON.stringify(opts))
      files.forEach(f => form.append('file', f))

      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      setProgress(50)
      const res = await fetch(`${BASE}/api/pdf/process`, { method: 'POST', headers, body: form })
      setProgress(85)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error (HTTP ${res.status})` }))
        throw new Error(err.error || 'Processing failed')
      }

      const sc = res.headers.get('X-Split-Count')
      if (sc) setSplitCount(parseInt(sc))

      const contentType = res.headers.get('Content-Type') || ''
      const blob = await res.blob()
      setProgress(100)

      const zipResult = contentType.includes('application/zip') || blob.type === 'application/zip'
      const ext = zipResult ? 'zip' : 'pdf'
      setResultBlob(blob)
      setResultName(`${toolId}_${Date.now()}.${ext}`)
      setIsZip(zipResult)
      setStep(2)

      if (user) {
        await saveHistory({ user_id: user.uid, tool_used: toolId, original_filename: files[0]?.name, file_size: blob.size }).catch(() => {})
      }
      toast.success('✅ Processed successfully!')
    } catch (err) {
      toast.error(err.message || 'Processing failed. Please try again.')
    } finally {
      setProcessing(false)
      setTimeout(() => setProgress(0), 800)
    }
  }

  const handleDownload = () => {
    if (!resultBlob) return
    const url = URL.createObjectURL(resultBlob)
    const a = document.createElement('a')
    a.href = url; a.download = resultName
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Download started!')
  }

  const handleReset = () => {
    setFiles([]); setResultBlob(null); setResultName(null)
    setStep(0); setProgress(0); setSplitCount(null); setIsZip(false)
  }

  const uploadLabel = isImgTool ? 'images' : isWordTool ? 'a .docx file' : config.multi ? 'PDFs' : 'a PDF'
  const uploadAcceptLabel = isImgTool ? 'JPG / PNG images' : isWordTool ? '.docx files only' : 'PDF files only'

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 28, opacity: 0.7 }} onClick={() => navigate('/')}>← All tools</button>

      {/* Tool header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{ width: 58, height: 58, borderRadius: 15, background: config.color + '22', border: `1px solid ${config.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0, boxShadow: `0 4px 20px ${config.color}33` }}>{config.icon}</div>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 4 }}>{config.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{config.desc}</p>
          {config.note && <p style={{ color: config.color, fontSize: '0.8rem', marginTop: 4 }}>ℹ️ {config.note}</p>}
        </div>
      </div>

      <StepBar step={step} color={config.color} />

      {/* ── STEP 0: Upload ── */}
      {step === 0 && (
        <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? config.color : 'var(--border2)'}`, borderRadius: 18, padding: '64px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.22s', background: isDragActive ? config.color + '0d' : 'var(--surface)' }}>
          <input {...getInputProps()} />
          <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>📂</div>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
            {isDragActive ? 'Drop here!' : `Click or drag ${uploadLabel} here`}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 20 }}>
            {uploadAcceptLabel} · Max 50 MB{config.multi ? ' · Multiple files supported' : ''}
          </p>
          <button className="btn btn-primary" style={{ background: config.color, boxShadow: `0 6px 20px ${config.color}44`, pointerEvents: 'none' }}>
            {config.icon} Choose file{config.multi ? 's' : ''}
          </button>
        </div>
      )}

      {/* ── STEP 1: Preview uploaded + options ── */}
      {step === 1 && files.length > 0 && (
        <div>
          {/* Single file preview */}
          {!config.multi && files[0] && (
            <PDFViewer source={files[0]} accentColor={config.color} maxHeight={300} />
          )}

          {/* Multi file previews */}
          {config.multi && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                Uploaded Files ({files.length})
              </div>
              {files.map((f, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <PDFViewer source={f} accentColor={config.color} maxHeight={260} />
                  <button onClick={() => removeFile(i)}
                    style={{ position: 'absolute', top: 10, right: 14, zIndex: 10, background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.4)', color: '#ff4d6d', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,109,0.3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,77,109,0.15)'}>
                    ✕ Remove
                  </button>
                </div>
              ))}
              <div {...getRootProps()} style={{ border: '2px dashed var(--border2)', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.85rem', background: isDragActive ? config.color + '0d' : 'transparent' }}>
                <input {...getInputProps()} />
                + Add more files
              </div>
            </div>
          )}

          {/* Options */}
          {config.controls?.length > 0 && (
            <div className="card" style={{ padding: '20px 22px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>Options</div>
              {config.controls.map(ctrl => (
                <div key={ctrl.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <label style={{ color: 'var(--text2)', fontSize: '0.84rem', fontWeight: 600, minWidth: 150 }}>{ctrl.label}</label>
                  {ctrl.type === 'select' ? (
                    <select className="input" style={{ maxWidth: 260 }} value={opts[ctrl.id] ?? ctrl.options[0]} onChange={e => setOpts(o => ({ ...o, [ctrl.id]: e.target.value }))}>
                      {ctrl.options.map(op => <option key={op}>{op}</option>)}
                    </select>
                  ) : (
                    <input className="input" type={ctrl.type || 'text'} placeholder={ctrl.placeholder} style={{ maxWidth: 280 }} value={opts[ctrl.id] ?? ''} onChange={e => setOpts(o => ({ ...o, [ctrl.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {processing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, ${config.color}, #ff6b8a)`, borderRadius: 999, width: progress + '%', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 6 }}>Processing… {progress}%</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleProcess} disabled={processing || files.length === 0}
              style={{ background: config.color, boxShadow: `0 6px 20px ${config.color}44`, minWidth: 180 }}>
              {processing ? <><div className="spinner" /> Processing…</> : <>{config.icon} Process Now</>}
            </button>
            <button className="btn btn-ghost" onClick={handleReset}>← Change file</button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Result ── */}
      {step === 2 && resultBlob && (
        <div>
          {/* Output preview (PDF only, not ZIP) */}
          {!isZip && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00e5a0', boxShadow: '0 0 8px #00e5a0' }} />
                <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#6eefc0' }}>Output Preview</span>
              </div>
              <PDFViewer source={resultBlob} label={`${toolId}_output.pdf`} accentColor="#00e5a0" maxHeight={440} />
            </div>
          )}

          {/* Result card */}
          <div style={{ background: 'linear-gradient(135deg, rgba(0,229,160,0.08), rgba(56,196,247,0.06))', border: '1px solid rgba(0,229,160,0.3)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', color: 'var(--success)', marginBottom: 6 }}>Your file is ready!</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 4 }}>
              {config.title} completed successfully
              {isZip && splitCount && splitCount > 1 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> · {splitCount} files zipped</span>}
            </p>

            {/* Size stats */}
            <div style={{ display: 'inline-flex', gap: 24, marginTop: 16, marginBottom: 24, background: 'var(--surface2)', borderRadius: 12, padding: '12px 24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>ORIGINAL</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{formatBytes(origSize)}</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>OUTPUT</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--success)' }}>{formatBytes(resultBlob.size)}</div>
              </div>
              {toolId === 'compress' && origSize > 0 && resultBlob.size < origSize && (
                <>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>SAVED</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#00e5a0' }}>{(((origSize - resultBlob.size) / origSize) * 100).toFixed(1)}%</div>
                  </div>
                </>
              )}
              {splitCount && (
                <>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>CHUNKS</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{splitCount}</div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={handleDownload}
                style={{ background: 'var(--success)', boxShadow: '0 6px 24px rgba(0,229,160,0.4)', fontSize: '1rem', padding: '14px 32px' }}>
                {isZip ? '📦 Download ZIP' : '⬇️ Download PDF'}
              </button>
              <button className="btn btn-ghost" onClick={handleReset} style={{ padding: '14px 24px' }}>🔄 Process Another</button>
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>🛠️ Need to do more with your PDF?</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>Browse all tools →</button>
          </div>

          {!user && (
            <div style={{ marginTop: 14, background: 'rgba(124,106,255,0.08)', border: '1px solid rgba(124,106,255,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--text2)', fontSize: '0.84rem' }}>💡 <strong>Sign in</strong> to save your history.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Create free account →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
