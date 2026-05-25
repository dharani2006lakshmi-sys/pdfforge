import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getUserHistory } from '../utils/supabase.js'
import toast from 'react-hot-toast'

const TOOLS = [
  { id: 'merge', icon: '🔗', name: 'Merge PDF', color: '#7c6aff' },
  { id: 'split', icon: '✂️', name: 'Split PDF', color: '#38c4f7' },
  { id: 'compress', icon: '🗜️', name: 'Compress', color: '#00e5a0' },
  { id: 'rotate', icon: '🔄', name: 'Rotate', color: '#ffb347' },
  { id: 'watermark', icon: '💧', name: 'Watermark', color: '#ffb347' },
  { id: 'protect', icon: '🔒', name: 'Protect', color: '#ff4d6d' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    if (user) {
      getUserHistory(user.uid, 5)
        .then(setHistory)
        .catch(() => {})
        .finally(() => setLoadingHistory(false))
    }
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div style={{ maxWidth: 1060, margin: '0 auto', padding: '48px 24px' }}>
      {/* Welcome */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 6 }}>{greeting()},</p>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 10 }}>
          {user?.displayName || user?.email?.split('@')[0] || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>
          What would you like to do with a PDF today?
        </p>
      </div>

      {/* Quick access tools */}
      <div style={{ marginBottom: 44 }}>
        <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Quick Access
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 12,
        }}>
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => navigate(`/tool/${t.id}`)} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '20px 16px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              transition: 'all 0.18s',
              color: 'var(--text)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = 'var(--surface2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
            >
              <div style={{ fontSize: '1.6rem' }}>{t.icon}</div>
              <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.82rem' }}>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 44 }}>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Account</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 700, color: '#fff', overflow: 'hidden',
              flexShrink: 0,
            }}>
              {user?.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user?.displayName || user?.email || 'U')[0].toUpperCase()
              }
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user?.displayName || 'User'}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{user?.email}</div>
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Plan</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: '1.5rem' }}>🚀</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.1rem' }} className="gradient-text">Free Plan</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>All 12 tools · Unlimited use</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent history */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
            Recent Files
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>View all →</button>
        </div>

        {loadingHistory ? (
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No files yet. Use a tool to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(item => (
              <div key={item.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: '1.2rem' }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.original_filename || 'Untitled'}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>
                    {item.tool_used} · {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="badge badge-accent">{item.tool_used}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
