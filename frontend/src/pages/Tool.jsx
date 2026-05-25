import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../hooks/useAuth.jsx'
import { processPDF } from '../utils/api.js'
import { saveHistory } from '../utils/supabase.js'
import toast from 'react-hot-toast'

const TOOL_CONFIG = {
  merge: {
    title: 'Merge PDF', icon: '🔗', desc: 'Combine multiple PDF files into a single document.',
    multi: true, color: '#7c6aff',
    controls: [],
  },
  split: {
    title: 'Split PDF', icon: '✂️', desc: 'Split each page into its own PDF file.',
    multi: false, color: '#38c4f7',
    controls: [],
  },
  rotate: {
    title: 'Rotate PDF', icon: '🔄', desc: 'Rotate all pages to the correct orientation.',
    multi: false, color: '#ffb347',
    controls: [
      { id: 'rotation', label: 'Rotation Direction', type: 'select', options: ['90° Clockwise', '180°', '90° Counter-clockwise'] }
    ],
  },
  delete: {
    title: 'Delete Pages', icon: '🗑️', desc: 'Remove specific pages from your PDF.',
    multi: false, color: '#ff4d6d',
    controls: [
      { id: 'pages', label: 'Pages to delete', type: 'text', placeholder: 'e.g. 1,3,5 or 2-4' }
    ],
  },
  extract: {
    title: 'Extract Pages', icon: '📤', desc: 'Save a specific range of pages as a new PDF.',
    multi: false, color: '#00e5a0',
    controls: [
      { id: 'pages', label: 'Pages to extract', type: 'text', placeholder: 'e.g. 1,3,5 or 2-4' }
    ],
  },
  reorder: {
    title: 'Reorder Pages', icon: '📋', desc: 'Rearrange the pages in a custom order.',
    multi: false, color: '#ff6bc8',
    controls: [
      { id: 'order', label: 'New page order', type: 'text', placeholder: 'e.g. 3,1,2 (comma-separated)' }
    ],
  },
  compress: {
    title: 'Compress PDF', icon: '🗜️', desc: 'Reduce file size by removing redundant data.',
    multi: false, color: '#00e5a0',
    controls: [],
  },
  watermark: {
    title: 'Add Watermark', icon: '💧', desc: 'Stamp text onto every page of your PDF.',
    multi: false, color: '#ffb347',
    controls: [
      { id: 'text', label: 'Watermark text', type: 'text', placeholder: 'e.g. CONFIDENTIAL' },
      { id: 'opacity', label: 'Opacity', type: 'select', options: ['Light (20%)', 'Medium (35%)', 'Strong (50%)'] },
      { id: 'color', label: 'Color', type: 'select', options: ['Gray', 'Red', 'Blue', 'Green'] },
    ],
  },
  pagenumbers: {
    title: 'Add Page Numbers', icon: '🔢', desc: 'Automatically number every page of your PDF.',
    multi: false, color: '#38c4f7',
    controls: [
      { id: 'position', label: 'Position', type: 'select', options: ['Bottom Center', 'Bottom Right', 'Bottom Left'] },
      { id: 'startnum', label: 'Start from', type: 'text', placeholder: '1' },
    ],
  },
  protect: {
    title: 'Protect PDF', icon: '🔒', desc: 'Lock your PDF with a password.',
    multi: false, color: '#ff4d6d',
    controls: [
      { id: 'password', label: 'Password', type: 'password', placeholder: 'Enter a strong password' }
    ],
  },
  unlock: {
    title: 'Unlock PDF', icon: '🔓', desc: 'Remove password protection from a PDF.',
    multi: false, color: '#7c6aff',
    controls: [
      { id: 'password', label: 'Current password', type: 'password', placeholder: 'Enter the PDF password' }
    ],
  },
  metadata: {
    title: 'Edit Metadata', icon: '📝', desc: 'Change the title, author, and other document info.',
    multi: false, color: '#ff6bc8',
    controls: [
      { id: 'title', label: 'Title', type: 'text', placeholder: 'Document title' },
      { id: 'author', label: 'Author', type: 'text', placeholder: 'Author name' },
      { id: 'subject', label: 'Subject', type: 'text', placeholder: 'Subject or description' },
    ],
  },
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

export default function Tool() {
  const { toolId } = useParams()
  const { user, getToken } = useAuth()
  const navigate = useNavigate()

  const config = TOOL_CONFIG[toolId]
  const [files, setFiles] = useState([])
  const [opts, setOpts] = useState(() => {
    const defaults = {}
    config?.controls.forEach(c => {
      if (c.type === 'select') defaults[c.id] = c.options[0]
      else defaults[c.id] = ''
    })
    return defaults
  })
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resultBlob, setResultBlob] = useState(null)
  const [resultName, setResultName] = useState(null)
  const [origSize, setOrigSize] = useState(0)

  const onDrop = useCallback((accepted) => {
    const pdfs = accepted.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'))
    if (!pdfs.length) { toast.error('Please drop PDF files only'); return }
    if (config.multi) setFiles(prev => [...prev, ...pdfs])
    else setFiles([pdfs[0]])
    setResultBlob(null)
  }, [config])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: config?.multi,
  })

  if (!config) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <p>Tool not found.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>← Back</button>
      </div>
    )
  }

  const removeFile = (i) => {
    setFiles(f => f.filter((_, idx) => idx !== i))
    setResultBlob(null)
  }

  const handleProcess = async () => {
    if (!files.length) { toast.error('Please add at least one PDF'); return }
    setProcessing(true)
    setProgress(10)
    setResultBlob(null)

    try {
      const totalOrig = files.reduce((s, f) => s + f.size, 0)
      setOrigSize(totalOrig)

      setProgress(30)
      const blob = await processPDF(toolId, files, { ...opts, onProgress: setProgress }, getToken)
      setProgress(100)

      const outName = `${toolId}_${Date.now()}.pdf`
      setResultBlob(blob)
      setResultName(outName)

      // Save history if logged in
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
      toast.error(err?.response?.data?.error || err.message || 'Processing failed')
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
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 24, gap: 6 }} onClick={() => navigate('/')}>
        ← All tools
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: config.color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.7rem', flexShrink: 0,
        }}>{config.icon}</div>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, marginBottom: 4 }}>{config.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{config.desc}</p>
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} style={{
        border: `2px dashed ${isDragActive ? config.color : 'var(--border2)'}`,
        borderRadius: 16,
        padding: '48px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: isDragActive ? config.color + '0d' : 'var(--surface)',
        marginBottom: 16,
      }}>
        <input {...getInputProps()} />
        <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>📂</div>
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>
          {isDragActive ? 'Drop here!' : `Click or drag ${config.multi ? 'PDFs' : 'a PDF'} here`}
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
          PDF files only · {config.multi ? 'Multiple files supported' : 'Single file'}
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: '1.3rem' }}>📄</span>
              <span style={{ flex: 1, fontWeight: 500, fontSize: '0.87rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: 'var(--muted)', fontSize: '0.76rem', flexShrink: 0 }}>{formatBytes(f.size)}</span>
              <button onClick={() => removeFile(i)} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
                fontSize: '1rem', padding: '2px 6px', borderRadius: 6,
                transition: 'color 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      {config.controls.length > 0 && (
        <div className="card" style={{ padding: '20px 22px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {config.controls.map(ctrl => (
            <div key={ctrl.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <label style={{ color: 'var(--text2)', fontSize: '0.85rem', fontWeight: 600, minWidth: 140 }}>{ctrl.label}</label>
              {ctrl.type === 'select' ? (
                <select className="input" style={{ maxWidth: 240 }}
                  value={opts[ctrl.id]} onChange={e => setOpts(o => ({ ...o, [ctrl.id]: e.target.value }))}>
                  {ctrl.options.map(op => <option key={op}>{op}</option>)}
                </select>
              ) : (
                <input className="input" type={ctrl.type || 'text'} placeholder={ctrl.placeholder}
                  style={{ maxWidth: 280 }}
                  value={opts[ctrl.id]} onChange={e => setOpts(o => ({ ...o, [ctrl.id]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress */}
      {processing && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: `linear-gradient(90deg, ${config.color}, #ff6b8a)`,
              borderRadius: 999,
              width: progress + '%',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 6 }}>Processing... {progress}%</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleProcess}
          disabled={processing || files.length === 0}
          style={{ background: config.color, boxShadow: `0 6px 20px ${config.color}44` }}
        >
          {processing
            ? <><div className="spinner" /> Processing...</>
            : <>{config.icon} Process {config.title}</>
          }
        </button>
        {files.length > 0 && (
          <button className="btn btn-ghost" onClick={() => { setFiles([]); setResultBlob(null) }}>
            Clear files
          </button>
        )}
      </div>

      {/* Result */}
      {resultBlob && (
        <div style={{
          marginTop: 24,
          background: 'rgba(0,229,160,0.07)',
          border: '1px solid rgba(0,229,160,0.25)',
          borderRadius: 14,
          padding: '22px 24px',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--success)' }}>Done! Your file is ready.</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginTop: 2 }}>
                Output size: {formatBytes(resultBlob.size)}
                {toolId === 'compress' && origSize > 0 && resultBlob.size < origSize && (
                  <span style={{ color: 'var(--success)', marginLeft: 8 }}>
                    ({(((origSize - resultBlob.size) / origSize) * 100).toFixed(1)}% smaller)
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleDownload} style={{ gap: 8 }}>
            ⬇️ Download {resultName}
          </button>
        </div>
      )}

      {/* Login nudge */}
      {!user && resultBlob && (
        <div style={{
          marginTop: 14,
          background: 'rgba(124,106,255,0.08)',
          border: '1px solid rgba(124,106,255,0.2)',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
        }}>
          <p style={{ color: 'var(--text2)', fontSize: '0.84rem' }}>
            💡 <strong>Sign in</strong> to save your file history and access from anywhere.
          </p>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Create free account →</button>
        </div>
      )}
    </div>
  )
}
