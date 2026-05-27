import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../hooks/useAuth.jsx'
import { processPDF } from '../utils/api.js'
import { saveHistory } from '../utils/supabase.js'
import toast from 'react-hot-toast'

export const TOOL_CONFIG = {
  merge: {
    title: 'Merge PDF', icon: '🔗', desc: 'Combine multiple PDF files into one document.',
    multi: true, color: '#7c6aff', category: 'Organize', controls: [],
  },
  split: {
    title: 'Split PDF', icon: '✂️', desc: 'Split every page into its own PDF file.',
    multi: false, color: '#38c4f7', category: 'Organize', controls: [],
  },
  rotate: {
    title: 'Rotate PDF', icon: '🔄', desc: 'Rotate all pages to the correct orientation.',
    multi: false, color: '#ffb347', category: 'Organize',
    controls: [
      { id: 'rotation', label: 'Direction', type: 'select', options: ['90° Clockwise', '180°', '90° Counter-clockwise'] }
    ],
  },
  delete: {
    title: 'Delete Pages', icon: '🗑️', desc: 'Remove specific pages from your PDF.',
    multi: false, color: '#ff4d6d', category: 'Organize',
    controls: [{ id: 'pages', label: 'Pages to delete', type: 'text', placeholder: 'e.g. 1,3,5 or 2-4' }],
  },
  extract: {
    title: 'Extract Pages', icon: '📤', desc: 'Save a specific range of pages as a new PDF.',
    multi: false, color: '#00e5a0', category: 'Organize',
    controls: [{ id: 'pages', label: 'Pages to extract', type: 'text', placeholder: 'e.g. 1,3,5 or 2-4' }],
  },
  reorder: {
    title: 'Reorder Pages', icon: '📋', desc: 'Rearrange pages in a custom order.',
    multi: false, color: '#ff6bc8', category: 'Organize',
    controls: [{ id: 'order', label: 'New page order', type: 'text', placeholder: 'e.g. 3,1,2' }],
  },
  reverse: {
    title: 'Reverse Pages', icon: '🔀', desc: 'Flip the page order of your PDF.',
    multi: false, color: '#7c6aff', category: 'Organize', controls: [],
  },
  duplicate: {
    title: 'Duplicate Page', icon: '📑', desc: 'Duplicate a specific page and append it.',
    multi: false, color: '#38c4f7', category: 'Organize',
    controls: [{ id: 'pagenum', label: 'Page to duplicate', type: 'text', placeholder: 'e.g. 1' }],
  },
  addblank: {
    title: 'Add Blank Page', icon: '➕', desc: 'Insert blank pages at the start or end.',
    multi: false, color: '#00e5a0', category: 'Organize',
    controls: [
      { id: 'count', label: 'Number of pages', type: 'text', placeholder: '1' },
      { id: 'position', label: 'Position', type: 'select', options: ['end', 'start'] },
    ],
  },
  compress: {
    title: 'Compress PDF', icon: '🗜️', desc: 'Reduce file size by removing redundant data.',
    multi: false, color: '#00e5a0', category: 'Optimize', controls: [],
  },
  resize: {
    title: 'Resize / Reformat', icon: '📐', desc: 'Change all pages to a standard paper size.',
    multi: false, color: '#ff6bc8', category: 'Optimize',
    controls: [
      { id: 'pagesize', label: 'Target size', type: 'select', options: ['A4','A3','A5','Letter','Legal','Tabloid'] }
    ],
  },
  crop: {
    title: 'Crop Pages', icon: '✂️', desc: 'Trim margins from all pages.',
    multi: false, color: '#ffb347', category: 'Optimize',
    controls: [
      { id: 'top',    label: 'Crop Top (pt)',    type: 'text', placeholder: '0' },
      { id: 'bottom', label: 'Crop Bottom (pt)', type: 'text', placeholder: '0' },
      { id: 'left',   label: 'Crop Left (pt)',   type: 'text', placeholder: '0' },
      { id: 'right',  label: 'Crop Right (pt)',  type: 'text', placeholder: '0' },
    ],
  },
  twoup: {
    title: '2-Up Layout', icon: '📰', desc: 'Place 2 pages side-by-side on one sheet.',
    multi: false, color: '#7c6aff', category: 'Optimize', controls: [],
  },
  grayscale: {
    title: 'Grayscale PDF', icon: '🩶', desc: 'Convert PDF to black & white.',
    multi: false, color: '#38c4f7', category: 'Optimize', controls: [],
  },
  linearize: {
    title: 'Fast Web View', icon: '⚡', desc: 'Optimize PDF for fast browser loading.',
    multi: false, color: '#00e5a0', category: 'Optimize', controls: [],
  },
  splitbypages: {
    title: 'Split by Size', icon: '📦', desc: 'Break PDF into chunks of N pages each.',
    multi: false, color: '#ff4d6d', category: 'Optimize',
    controls: [{ id: 'pagesperchunk', label: 'Pages per chunk', type: 'text', placeholder: '5' }],
  },
  watermark: {
    title: 'Add Watermark', icon: '💧', desc: 'Stamp text onto every page.',
    multi: false, color: '#ffb347', category: 'Edit',
    controls: [
      { id: 'text',    label: 'Watermark text', type: 'text', placeholder: 'CONFIDENTIAL' },
      { id: 'opacity', label: 'Opacity', type: 'select', options: ['Light (20%)','Medium (35%)','Strong (50%)'] },
      { id: 'color',   label: 'Color',   type: 'select', options: ['Gray','Red','Blue','Green','Black','Orange'] },
    ],
  },
  stamp: {
    title: 'Stamp PDF', icon: '🔖', desc: 'Apply a visible stamp to every page.',
    multi: false, color: '#ff4d6d', category: 'Edit',
    controls: [
      { id: 'stamp', label: 'Stamp text', type: 'select', options: ['APPROVED','REJECTED','DRAFT','CONFIDENTIAL','FINAL','PENDING'] }
    ],
  },
  pagenumbers: {
    title: 'Page Numbers', icon: '🔢', desc: 'Automatically number every page.',
    multi: false, color: '#38c4f7', category: 'Edit',
    controls: [
      { id: 'position', label: 'Position', type: 'select', options: ['Bottom Center','Bottom Right','Bottom Left'] },
      { id: 'startnum', label: 'Start from', type: 'text', placeholder: '1' },
    ],
  },
  headerfooter: {
    title: 'Header & Footer', icon: '📋', desc: 'Add header and footer text to every page.',
    multi: false, color: '#7c6aff', category: 'Edit',
    controls: [
      { id: 'header', label: 'Header text', type: 'text', placeholder: 'My Company' },
      { id: 'footer', label: 'Footer text', type: 'text', placeholder: 'Confidential' },
    ],
  },
  addtext: {
    title: 'Add Text', icon: '✍️', desc: 'Insert custom text at any position on a page.',
    multi: false, color: '#ff6bc8', category: 'Edit',
    controls: [
      { id: 'text',     label: 'Text',       type: 'text', placeholder: 'Your text here' },
      { id: 'pagenum',  label: 'Page',       type: 'text', placeholder: '1' },
      { id: 'x',        label: 'X position', type: 'text', placeholder: '100' },
      { id: 'y',        label: 'Y position', type: 'text', placeholder: '400' },
      { id: 'fontsize', label: 'Font size',  type: 'text', placeholder: '14' },
    ],
  },
  addrect: {
    title: 'Draw Rectangle', icon: '⬜', desc: 'Draw a rectangle border on a page.',
    multi: false, color: '#ffb347', category: 'Edit',
    controls: [
      { id: 'pagenum', label: 'Page',   type: 'text', placeholder: '1' },
      { id: 'x',       label: 'X',      type: 'text', placeholder: '50'  },
      { id: 'y',       label: 'Y',      type: 'text', placeholder: '50'  },
      { id: 'width',   label: 'Width',  type: 'text', placeholder: '200' },
      { id: 'height',  label: 'Height', type: 'text', placeholder: '100' },
      { id: 'color',   label: 'Color',  type: 'select', options: ['Red','Blue','Green','Yellow','Black','Orange'] },
    ],
  },
  addline: {
    title: 'Draw Line', icon: '📏', desc: 'Draw a horizontal or diagonal line on a page.',
    multi: false, color: '#00e5a0', category: 'Edit',
    controls: [
      { id: 'pagenum', label: 'Page', type: 'text', placeholder: '1' },
      { id: 'x1', label: 'X1', type: 'text', placeholder: '50' },
      { id: 'y1', label: 'Y1', type: 'text', placeholder: '300' },
      { id: 'x2', label: 'X2', type: 'text', placeholder: '500' },
      { id: 'y2', label: 'Y2', type: 'text', placeholder: '300' },
      { id: 'color', label: 'Color', type: 'select', options: ['Black','Red','Blue','Green','Gray'] },
    ],
  },
  metadata: {
    title: 'Edit Metadata', icon: '📝', desc: 'Change title, author, subject, keywords.',
    multi: false, color: '#ff6bc8', category: 'Edit',
    controls: [
      { id: 'title',    label: 'Title',    type: 'text', placeholder: 'Document title' },
      { id: 'author',   label: 'Author',   type: 'text', placeholder: 'Author name' },
      { id: 'subject',  label: 'Subject',  type: 'text', placeholder: 'Subject' },
      { id: 'keywords', label: 'Keywords', type: 'text', placeholder: 'keyword1, keyword2' },
      { id: 'creator',  label: 'Creator',  type: 'text', placeholder: 'Creator app' },
    ],
  },
  addbookmark: {
    title: 'Add Bookmarks', icon: '🔖', desc: 'Label specific pages with bookmark tags visible in every PDF viewer.',
    multi: false, color: '#7c6aff', category: 'Edit',
    controls: [
      { id: 'bookmarks', label: 'Bookmarks (JSON)', type: 'text', placeholder: '[{"title":"Intro","page":1},{"title":"Chapter 2","page":5}]' },
    ],
  },
  protect: {
    title: 'Protect PDF', icon: '🔒', desc: 'Lock your PDF with a password.',
    multi: false, color: '#ff4d6d', category: 'Security',
    controls: [
      { id: 'password', label: 'Password', type: 'password', placeholder: 'Enter a strong password' }
    ],
    note: '⚠️ Adds metadata-level protection. For full encryption use Adobe Acrobat or deploy qpdf on your server.',
  },
  unlock: {
    title: 'Unlock PDF', icon: '🔓', desc: 'Remove password protection from a PDF.',
    multi: false, color: '#7c6aff', category: 'Security', controls: [],
  },
  flatten: {
    title: 'Flatten PDF', icon: '🗂️', desc: 'Remove form fields and annotations.',
    multi: false, color: '#38c4f7', category: 'Security', controls: [],
  },
  overlay: {
    title: 'Overlay PDFs', icon: '🗃️', desc: 'Overlay one PDF on top of another.',
    multi: true, color: '#ff6bc8', category: 'Advanced', controls: [],
    note: 'Upload base PDF first, then overlay PDF.',
  },
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

function PDFMiniViewer({ file }) {
  const canvasRef = useRef(null)
  const [pageInfo, setPageInfo] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    const loadPDF = async () => {
      setLoading(true)
      try {
        const arrayBuffer = await file.arrayBuffer()
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            s.onload = res; s.onerror = rej
            document.head.appendChild(s)
          })
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
        const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
        if (cancelled) return
        setPageInfo(`${pdfDoc.numPages} page${pdfDoc.numPages !== 1 ? 's' : ''}`)
        const page = await pdfDoc.getPage(1)
        if (cancelled) return
        const canvas = canvasRef.current
        if (!canvas) return
        const viewport = page.getViewport({ scale: 1.2 })
        const ctx = canvas.getContext('2d')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: ctx, viewport }).promise
      } catch (e) {
        console.error('PDF viewer error:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadPDF()
    return () => { cancelled = true }
  }, [file])

  return (
    <div style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)' }}>
        <span style={{ fontSize: '1rem' }}>📄</span>
        <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
        {pageInfo && <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'var(--border)', padding: '2px 8px', borderRadius: 20 }}>{pageInfo}</span>}
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{formatBytes(file.size)}</span>
      </div>
      <div style={{ maxHeight: 280, overflow: 'auto', display: 'flex', justifyContent: 'center', padding: '12px', background: '#1a1a2e' }}>
        {loading ? (
          <div style={{ padding: '40px', color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="spinner" style={{ width: 16, height: 16 }} /> Loading preview...
          </div>
        ) : (
          <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }} />
        )}
      </div>
    </div>
  )
}

function StepBar({ step, color }) {
  const steps = ['Upload PDF', 'Configure', 'Download']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: i <= step ? color : 'var(--surface2)',
              border: `2px solid ${i <= step ? color : 'var(--border2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              color: i <= step ? '#fff' : 'var(--muted)',
              transition: 'all 0.3s',
              boxShadow: i === step ? `0 0 12px ${color}66` : 'none',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: i === step ? 700 : 400, color: i <= step ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, margin: '0 8px', marginBottom: 22, background: i < step ? color : 'var(--border2)', transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function Tool() {
  const { toolId } = useParams()
  const { user, getToken } = useAuth()
  const navigate = useNavigate()

  const config = TOOL_CONFIG[toolId]

  const [step, setStep] = useState(0)
  const [files, setFiles] = useState([])
  const [opts, setOpts] = useState(() => {
    const defaults = {}
    config?.controls.forEach(c => { defaults[c.id] = c.type === 'select' ? c.options[0] : '' })
    return defaults
  })
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultBlob, setResultBlob] = useState(null)
  const [resultName, setResultName] = useState(null)
  const [isZip, setIsZip] = useState(false)
  const [origSize, setOrigSize] = useState(0)
  const [splitCount, setSplitCount] = useState(null)

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected && rejected.length > 0) {
      rejected.forEach(({ file, errors }) => {
        if (errors.some(e => e.code === 'file-invalid-type')) {
          toast.error(`"${file.name}" is not a valid PDF. Please upload a .pdf file.`)
        } else if (errors.some(e => e.code === 'file-too-large')) {
          toast.error(`"${file.name}" exceeds the 50 MB limit.`)
        } else {
          toast.error(`"${file.name}" could not be accepted.`)
        }
      })
    }
    const pdfs = accepted.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) return
    if (config?.multi) setFiles(prev => [...prev, ...pdfs])
    else setFiles([pdfs[0]])
    setResultBlob(null)
    setStep(1)
  }, [config])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: config?.multi ?? false,
  })

  if (!config) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p>Tool not found.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>← Back to tools</button>
      </div>
    )
  }

  const removeFile = (i) => {
    const next = files.filter((_, idx) => idx !== i)
    setFiles(next)
    setResultBlob(null)
    if (!next.length) setStep(0)
  }

  const handleProcess = async () => {
    if (!files.length) { toast.error('Please upload a PDF first'); return }
    setProcessing(true)
    setProgress(10)
    setResultBlob(null)

    try {
      const totalOrig = files.reduce((s, f) => s + f.size, 0)
      setOrigSize(totalOrig)
      setProgress(30)

      const token = getToken ? await getToken() : null
      const form = new FormData()
      form.append('tool', toolId)
      form.append('options', JSON.stringify(opts))
      files.forEach((f) => form.append('file', f))

      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      setProgress(50)

      const res = await fetch(`${BASE}/api/pdf/process`, {
        method: 'POST',
        headers,
        body: form,
      })

      setProgress(85)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Processing failed. Please check your file and try again.' }))
        throw new Error(errData.error || `Server error (HTTP ${res.status})`)
      }

      const splitCountHeader = res.headers.get('X-Split-Count')
      if (splitCountHeader) setSplitCount(parseInt(splitCountHeader))

      const contentType = res.headers.get('Content-Type') || ''
      const blob = await res.blob()
      setProgress(100)

      const isZipResult = contentType.includes('application/zip') || blob.type === 'application/zip'
      const ext = isZipResult ? 'zip' : 'pdf'
      const outName = `${toolId}_${Date.now()}.${ext}`

      setResultBlob(blob)
      setResultName(outName)
      setIsZip(isZipResult)
      setStep(2)

      if (user) {
        await saveHistory({
          user_id: user.uid,
          tool_used: toolId,
          original_filename: files[0]?.name,
          file_size: blob.size,
        }).catch(() => {})
      }

      toast.success('✅ PDF processed successfully!')
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

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '40px 24px' }}>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 28, gap: 6, opacity: 0.7 }} onClick={() => navigate('/')}>
        ← All tools
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 58, height: 58, borderRadius: 15,
          background: config.color + '22', border: `1px solid ${config.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.8rem', flexShrink: 0, boxShadow: `0 4px 20px ${config.color}33`,
        }}>{config.icon}</div>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: 4 }}>{config.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>{config.desc}</p>
          {config.note && <p style={{ color: config.color, fontSize: '0.8rem', marginTop: 4 }}>ℹ️ {config.note}</p>}
        </div>
      </div>

      <StepBar step={step} color={config.color} />

      {step === 0 && (
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? config.color : 'var(--border2)'}`,
            borderRadius: 18, padding: '64px 32px', textAlign: 'center', cursor: 'pointer',
            transition: 'all 0.22s', background: isDragActive ? config.color + '0d' : 'var(--surface)',
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: '3.5rem', marginBottom: 14 }}>📂</div>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
            {isDragActive ? 'Drop your PDF here!' : `Click or drag ${config.multi ? 'PDFs' : 'a PDF'} here`}
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 20 }}>
            PDF files only · Max 50 MB · {config.multi ? 'Multiple files supported' : 'Single file'}
          </p>
          <button className="btn btn-primary" style={{ background: config.color, boxShadow: `0 6px 20px ${config.color}44`, pointerEvents: 'none' }}>
            {config.icon} Choose PDF{config.multi ? 's' : ''}
          </button>
        </div>
      )}

      {step === 1 && files.length > 0 && (
        <div>
          {!config.multi && files[0] && <PDFMiniViewer file={files[0]} />}

          {config.multi && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {files.map((f, i) => (
                <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>📄</span>
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '0.87rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.75rem', flexShrink: 0 }}>{formatBytes(f.size)}</span>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}>✕</button>
                </div>
              ))}
              <div {...getRootProps()} style={{ border: '2px dashed var(--border2)', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.85rem', background: isDragActive ? config.color + '0d' : 'transparent' }}>
                <input {...getInputProps()} />
                + Add more PDFs
              </div>
            </div>
          )}

          {config.controls.length > 0 && (
            <div className="card" style={{ padding: '20px 22px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.8rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 4 }}>Options</div>
              {config.controls.map(ctrl => (
                <div key={ctrl.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                  <label style={{ color: 'var(--text2)', fontSize: '0.84rem', fontWeight: 600, minWidth: 150 }}>{ctrl.label}</label>
                  {ctrl.type === 'select' ? (
                    <select className="input" style={{ maxWidth: 260 }} value={opts[ctrl.id]} onChange={e => setOpts(o => ({ ...o, [ctrl.id]: e.target.value }))}>
                      {ctrl.options.map(op => <option key={op}>{op}</option>)}
                    </select>
                  ) : (
                    <input className="input" type={ctrl.type || 'text'} placeholder={ctrl.placeholder} style={{ maxWidth: 280 }} value={opts[ctrl.id]} onChange={e => setOpts(o => ({ ...o, [ctrl.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          )}

          {processing && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, ${config.color}, #ff6b8a)`, borderRadius: 999, width: progress + '%', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 6 }}>Processing... {progress}%</p>
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

      {step === 2 && resultBlob && (
        <div>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,160,0.08), rgba(56,196,247,0.06))',
            border: '1px solid rgba(0,229,160,0.3)', borderRadius: 20, padding: '32px 28px', marginBottom: 24, textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', color: 'var(--success)', marginBottom: 6 }}>
              Your PDF is ready!
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 4 }}>
              {config.title} completed successfully
              {isZip && splitCount && splitCount > 1 && (
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}> · {splitCount} files zipped</span>
              )}
            </p>

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
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#00e5a0' }}>
                      {(((origSize - resultBlob.size) / origSize) * 100).toFixed(1)}%
                    </div>
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
                style={{ background: 'var(--success)', boxShadow: '0 6px 24px rgba(0,229,160,0.4)', fontSize: '1rem', padding: '14px 32px', gap: 10 }}>
                {isZip ? '📦 Download ZIP (all pages)' : '⬇️ Download PDF'}
              </button>
              <button className="btn btn-ghost" onClick={handleReset} style={{ padding: '14px 24px' }}>
                🔄 Process Another
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>🛠️ Need to do more with your PDF?</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>Browse all 29 tools →</button>
          </div>

          {!user && (
            <div style={{ marginTop: 14, background: 'rgba(124,106,255,0.08)', border: '1px solid rgba(124,106,255,0.2)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--text2)', fontSize: '0.84rem' }}>
                💡 <strong>Sign in</strong> to save your history and access files from anywhere.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Create free account →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
