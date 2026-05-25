import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { getUserHistory, deleteFile, getSignedUrl } from '../utils/supabase.js'
import toast from 'react-hot-toast'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatBytes(b) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

export default function History() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [user])

  const loadHistory = async () => {
    try {
      const data = await getUserHistory(user.uid, 50)
      setHistory(data || [])
    } catch (err) {
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, path) => {
    setDeleting(id)
    try {
      await deleteFile(path)
      setHistory(h => h.filter(x => x.id !== id))
      toast.success('File deleted')
    } catch (err) {
      toast.error('Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const handleDownload = async (path, filename) => {
    try {
      const url = await getSignedUrl(path)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      toast.error('Download failed')
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 6 }}>Your Files</h1>
        <p style={{ color: 'var(--muted)' }}>All PDF files you've processed and saved.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : history.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📭</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>No files yet</h3>
          <p style={{ color: 'var(--muted)' }}>Use a tool to process a PDF and it will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {history.map((item) => (
            <div key={item.id} className="card" style={{
              padding: '16px 18px',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all 0.18s',
            }}>
              <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.92rem',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.original_filename || 'Untitled'}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 3, display: 'flex', gap: 8 }}>
                  <span>{item.tool_used}</span>
                  <span>•</span>
                  <span>{formatBytes(item.file_size)}</span>
                  <span>•</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDownload(item.result_path, item.original_filename)}
                >
                  ⬇️ Download
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(item.id, item.result_path)}
                  disabled={deleting === item.id}
                >
                  {deleting === item.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
