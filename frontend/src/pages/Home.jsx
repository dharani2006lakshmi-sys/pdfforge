import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const TOOL_CATEGORIES = [
  {
    label: '📁 Organize',
    tools: [
      { id: 'merge', icon: '🔗', name: 'Merge PDF', desc: 'Combine multiple PDFs into one', color: 'purple', multi: true },
      { id: 'split', icon: '✂️', name: 'Split PDF', desc: 'Extract every page as its own file', color: 'blue' },
      { id: 'rotate', icon: '🔄', name: 'Rotate PDF', desc: 'Fix page orientation', color: 'orange' },
      { id: 'delete', icon: '🗑️', name: 'Delete Pages', desc: 'Remove unwanted pages', color: 'red' },
      { id: 'extract', icon: '📤', name: 'Extract Pages', desc: 'Save a subset of pages', color: 'green' },
      { id: 'reorder', icon: '📋', name: 'Reorder Pages', desc: 'Drag pages to your order', color: 'pink' },
    ]
  },
  {
    label: '⚡ Optimize',
    tools: [
      { id: 'compress', icon: '🗜️', name: 'Compress PDF', desc: 'Shrink file size without quality loss', color: 'green' },
      { id: 'watermark', icon: '💧', name: 'Watermark', desc: 'Brand or protect your docs', color: 'orange' },
      { id: 'pagenumbers', icon: '🔢', name: 'Page Numbers', desc: 'Auto-number your pages', color: 'blue' },
    ]
  },
  {
    label: '🔐 Security',
    tools: [
      { id: 'protect', icon: '🔒', name: 'Protect PDF', desc: 'Add password protection', color: 'red' },
      { id: 'unlock', icon: '🔓', name: 'Unlock PDF', desc: 'Remove PDF password', color: 'purple' },
      { id: 'metadata', icon: '📝', name: 'Edit Metadata', desc: 'Set title, author, keywords', color: 'pink' },
    ]
  },
]

const colorMap = {
  purple: { bg: 'rgba(124,106,255,0.14)', glow: 'rgba(124,106,255,0.25)', border: 'rgba(124,106,255,0.3)', icon: 'rgba(124,106,255,0.2)' },
  blue:   { bg: 'rgba(56,196,247,0.1)',  glow: 'rgba(56,196,247,0.2)',   border: 'rgba(56,196,247,0.28)',  icon: 'rgba(56,196,247,0.18)' },
  orange: { bg: 'rgba(255,179,71,0.1)',  glow: 'rgba(255,179,71,0.2)',   border: 'rgba(255,179,71,0.28)',  icon: 'rgba(255,179,71,0.18)' },
  red:    { bg: 'rgba(255,77,109,0.1)',  glow: 'rgba(255,77,109,0.2)',   border: 'rgba(255,77,109,0.28)',  icon: 'rgba(255,77,109,0.18)' },
  green:  { bg: 'rgba(0,229,160,0.08)', glow: 'rgba(0,229,160,0.18)',   border: 'rgba(0,229,160,0.25)',   icon: 'rgba(0,229,160,0.16)' },
  pink:   { bg: 'rgba(255,105,200,0.1)', glow: 'rgba(255,105,200,0.2)', border: 'rgba(255,105,200,0.28)', icon: 'rgba(255,105,200,0.18)' },
}

function ToolCard({ tool }) {
  const navigate = useNavigate()
  const c = colorMap[tool.color]

  return (
    <div
      onClick={() => navigate(`/tool/${tool.id}`)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '22px 18px',
        cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.borderColor = c.border
        e.currentTarget.style.boxShadow = `0 10px 40px ${c.glow}`
        e.currentTarget.style.background = c.bg
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.background = 'var(--surface)'
      }}
    >
      <div style={{
        width: 44, height: 44,
        borderRadius: 11,
        background: c.icon,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.35rem',
      }}>{tool.icon}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.92rem' }}>{tool.name}</div>
      <div style={{ fontSize: '0.77rem', color: 'var(--muted)', lineHeight: 1.45 }}>{tool.desc}</div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '88px 20px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* BG glow */}
        <div style={{
          position: 'absolute', top: -120, left: '50%', transform: 'translateX(-50%)',
          width: 800, height: 600,
          background: 'radial-gradient(ellipse, rgba(124,106,255,0.14) 0%, transparent 68%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="badge badge-accent" style={{ marginBottom: 20 }}>
            ✦ 100% Free · Browser-Based · No Limits
          </div>
          <h1 style={{ fontSize: 'clamp(2.6rem, 6.5vw, 4.4rem)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 18 }}>
            Every PDF Tool<br/>You'll Ever{' '}
            <span className="gradient-text">Need.</span>
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '1.05rem', maxWidth: 500, margin: '0 auto 32px', fontWeight: 300, lineHeight: 1.7 }}>
            Merge, split, compress, rotate, watermark and secure your PDFs — all in one place, powered by modern web tech.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                Go to Dashboard →
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                  Get started free
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => {
                  document.getElementById('tools-section').scrollIntoView({ behavior: 'smooth' })
                }}>
                  Browse tools
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'flex', gap: 0,
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {[
          { v: '12+', l: 'PDF Tools' },
          { v: '100%', l: 'Free Forever' },
          { v: '0', l: 'Files Uploaded to Servers' },
          { v: '⚡', l: 'Instant Processing' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '22px 40px',
            textAlign: 'center',
            borderRight: i < 3 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.8rem', color: 'var(--accent)' }}>{s.v}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tools */}
      <div id="tools-section" style={{ maxWidth: 1160, margin: '0 auto', padding: '60px 24px 80px' }}>
        {TOOL_CATEGORIES.map(cat => (
          <div key={cat.label} style={{ marginBottom: 52 }}>
            <div style={{
              fontFamily: 'Syne', fontSize: '0.8rem', fontWeight: 700,
              color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '2.5px',
              marginBottom: 18, paddingLeft: 2,
            }}>{cat.label}</div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 14,
            }}>
              {cat.tools.map(t => <ToolCard key={t.id} tool={t} />)}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Banner */}
      {!user && (
        <div style={{
          maxWidth: 860, margin: '0 auto 80px',
          background: 'linear-gradient(135deg, rgba(124,106,255,0.15), rgba(255,107,138,0.1))',
          border: '1px solid rgba(124,106,255,0.25)',
          borderRadius: 20,
          padding: '48px 40px',
          textAlign: 'center',
          marginLeft: 24, marginRight: 24,
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 12 }}>
            Save your work across sessions
          </h2>
          <p style={{ color: 'var(--text2)', marginBottom: 28, fontSize: '0.95rem', fontWeight: 300 }}>
            Create a free account to access your file history, cloud storage via Supabase, and more.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
            Create free account →
          </button>
        </div>
      )}
    </div>
  )
}
