import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { getUserHistory } from '../utils/supabase.js'

const ALL_TOOLS = [
  // Organize
  { id: 'merge',       icon: '🔗', name: 'Merge PDF',       desc: 'Combine multiple PDFs',        color: '#7c6aff', cat: 'Organize' },
  { id: 'split',       icon: '✂️', name: 'Split PDF',       desc: 'Extract pages as files',       color: '#38c4f7', cat: 'Organize' },
  { id: 'rotate',      icon: '🔄', name: 'Rotate Pages',    desc: 'Fix page orientation',         color: '#ffb347', cat: 'Organize' },
  { id: 'delete',      icon: '🗑️', name: 'Delete Pages',    desc: 'Remove unwanted pages',        color: '#ff4d6d', cat: 'Organize' },
  { id: 'extract',     icon: '📤', name: 'Extract Pages',   desc: 'Save a subset of pages',       color: '#00e5a0', cat: 'Organize' },
  { id: 'reorder',     icon: '📋', name: 'Reorder Pages',   desc: 'Drag pages to your order',     color: '#ff6b8a', cat: 'Organize' },
  { id: 'crop',        icon: '✂',  name: 'Crop PDF',        desc: 'Trim page margins & areas',    color: '#a0e5ff', cat: 'Organize' },
  // Optimize
  { id: 'compress',    icon: '🗜️', name: 'Compress PDF',    desc: 'Shrink without quality loss',  color: '#00e5a0', cat: 'Optimize' },
  { id: 'watermark',   icon: '💧', name: 'Watermark',       desc: 'Brand or protect your docs',   color: '#ffb347', cat: 'Optimize' },
  { id: 'pagenumbers', icon: '🔢', name: 'Page Numbers',    desc: 'Auto-number your pages',       color: '#38c4f7', cat: 'Optimize' },
  { id: 'flatten',     icon: '📐', name: 'Flatten PDF',     desc: 'Remove form fields & layers',  color: '#c4b5ff', cat: 'Optimize' },
  { id: 'repair',      icon: '🔧', name: 'Repair PDF',      desc: 'Fix corrupted PDFs',           color: '#ffb347', cat: 'Optimize' },
  // Security
  { id: 'protect',     icon: '🔒', name: 'Protect PDF',     desc: 'Add password protection',      color: '#ff4d6d', cat: 'Security' },
  { id: 'unlock',      icon: '🔓', name: 'Unlock PDF',      desc: 'Remove PDF password',          color: '#7c6aff', cat: 'Security' },
  { id: 'metadata',    icon: '📝', name: 'Edit Metadata',   desc: 'Title, author, keywords',      color: '#ff6b8a', cat: 'Security' },
  { id: 'redact',      icon: '⬛', name: 'Redact PDF',      desc: 'Permanently hide text',        color: '#ff4d6d', cat: 'Security' },
  { id: 'sign',        icon: '✍️', name: 'Sign PDF',        desc: 'Add digital signature',        color: '#00e5a0', cat: 'Security' },
  // Convert
  { id: 'pdf2img',     icon: '🖼️', name: 'PDF to Image',    desc: 'Export pages as PNG/JPG',      color: '#38c4f7', cat: 'Convert' },
  { id: 'img2pdf',     icon: '📸', name: 'Image to PDF',    desc: 'Convert JPG/PNG to PDF',       color: '#7c6aff', cat: 'Convert' },
  { id: 'pdf2word',    icon: '📄', name: 'PDF to Word',     desc: 'Export as editable .docx',     color: '#ff6b8a', cat: 'Convert' },
  { id: 'word2pdf',    icon: '📃', name: 'Word to PDF',     desc: 'Convert .docx to PDF',         color: '#ffb347', cat: 'Convert' },
  { id: 'pdf2excel',   icon: '📊', name: 'PDF to Excel',    desc: 'Extract tables to spreadsheet',color: '#00e5a0', cat: 'Convert' },
  { id: 'pdf2ppt',     icon: '📑', name: 'PDF to PPT',      desc: 'Convert slides to PowerPoint', color: '#c4b5ff', cat: 'Convert' },
  { id: 'html2pdf',    icon: '🌐', name: 'HTML to PDF',     desc: 'Snapshot a webpage as PDF',    color: '#38c4f7', cat: 'Convert' },
  // Edit & Enhance
  { id: 'annotate',    icon: '✏️', name: 'Annotate PDF',    desc: 'Add comments & highlights',    color: '#ffb347', cat: 'Edit' },
  { id: 'ocr',         icon: '🔍', name: 'OCR PDF',         desc: 'Make scanned PDFs searchable', color: '#7c6aff', cat: 'Edit' },
  { id: 'fillform',    icon: '📋', name: 'Fill Forms',      desc: 'Fill PDF form fields online',  color: '#00e5a0', cat: 'Edit' },
  { id: 'header',      icon: '📌', name: 'Header & Footer', desc: 'Add header or footer text',    color: '#ff6b8a', cat: 'Edit' },
  { id: 'background',  icon: '🎨', name: 'Add Background',  desc: 'Insert color/image background',color: '#a0e5ff', cat: 'Edit' },
  { id: 'grayscale',   icon: '🖤', name: 'Grayscale PDF',   desc: 'Convert to black & white',     color: '#a8a8c4', cat: 'Edit' },
]

const CAT_COLORS = {
  Organize: { from: 'rgba(124,106,255,0.25)', to: 'rgba(56,196,247,0.1)', label: '#a89cff', dot: '#7c6aff' },
  Optimize: { from: 'rgba(0,229,160,0.15)', to: 'rgba(255,179,71,0.1)', label: '#6eefc0', dot: '#00e5a0' },
  Security: { from: 'rgba(255,77,109,0.18)', to: 'rgba(124,106,255,0.1)', label: '#ff8fa3', dot: '#ff4d6d' },
  Convert:  { from: 'rgba(56,196,247,0.15)', to: 'rgba(255,107,138,0.08)', label: '#7dd8f5', dot: '#38c4f7' },
  Edit:     { from: 'rgba(255,179,71,0.15)', to: 'rgba(0,229,160,0.08)', label: '#ffd080', dot: '#ffb347' },
}

const CAT_ICONS = { Organize: '📁', Optimize: '⚡', Security: '🔐', Convert: '🔄', Edit: '✏️' }

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) {
      getUserHistory(user.uid, 6)
        .then(setHistory).catch(() => {}).finally(() => setLoadingHistory(false))
    } else setLoadingHistory(false)
  }, [user])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const categories = ['All', ...Object.keys(CAT_COLORS)]
  const filtered = ALL_TOOLS.filter(t => {
    const matchCat = activeFilter === 'All' || t.cat === activeFilter
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.desc.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const grouped = categories.slice(1).reduce((acc, cat) => {
    const tools = filtered.filter(t => t.cat === cat)
    if (tools.length) acc[cat] = tools
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 24px 80px' }}>

      {/* === WELCOME HEADER === */}
      <div style={{ marginBottom: 40, animation: 'floatUp 0.5s ease forwards' }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 6, letterSpacing: '0.5px' }}>
          {greeting()},
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
          {user?.displayName || user?.email?.split('@')[0] || 'there'} 👋
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '0.95rem', fontWeight: 300 }}>
          30 PDF tools at your fingertips — what do you want to do today?
        </p>
      </div>

      {/* === STATS ROW === */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 40 }}>
        {[
          { val: '30', label: 'PDF Tools', icon: '🛠️', color: '#7c6aff' },
          { val: '100%', label: 'Free Forever', icon: '✨', color: '#00e5a0' },
          { val: '0', label: 'Files Stored', icon: '🔒', color: '#ff6b8a' },
          { val: '⚡', label: 'Instant Results', icon: '⚡', color: '#ffb347' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{
            padding: '18px 20px',
            display: 'flex', alignItems: 'center', gap: 14,
            animation: `floatUp 0.5s ease ${i * 0.07}s forwards`,
            opacity: 0,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `${s.color}22`,
              border: `1px solid ${s.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', flexShrink: 0,
            }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* === ACCOUNT + PLAN CARDS === */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 44 }}>
        <div className="glass-card" style={{ padding: 22 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14 }}>Account</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c6aff, #ff6b8a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', fontWeight: 700, color: '#fff',
              overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 4px 16px rgba(124,106,255,0.35)',
            }}>
              {user?.photoURL
                ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user?.displayName || user?.email || 'U')[0].toUpperCase()
              }
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user?.displayName || 'User'}</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>
        </div>
        <div className="glass-card" style={{ padding: 22, background: 'linear-gradient(135deg, rgba(124,106,255,0.1), rgba(255,107,138,0.06))' }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 14 }}>Plan</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '1.8rem' }}>🚀</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.1rem' }} className="gradient-text">Free Plan</div>
              <div style={{ color: 'var(--muted)', fontSize: '0.76rem', marginTop: 2 }}>All 30 tools · Unlimited use</div>
            </div>
          </div>
        </div>
      </div>

      {/* === ALL TOOLS SECTION === */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: '1rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text2)' }}>
            All Tools
          </h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}>🔍</span>
              <input
                className="input"
                placeholder="Search tools…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, width: 180, fontSize: '0.82rem', height: 36 }}
              />
            </div>
          </div>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveFilter(cat)} style={{
              padding: '6px 16px',
              borderRadius: 999,
              border: activeFilter === cat ? '1px solid rgba(124,106,255,0.6)' : '1px solid var(--glass-border)',
              background: activeFilter === cat ? 'rgba(124,106,255,0.18)' : 'rgba(255,255,255,0.04)',
              color: activeFilter === cat ? '#a89cff' : 'var(--text2)',
              fontFamily: 'Syne',
              fontWeight: 700,
              fontSize: '0.77rem',
              letterSpacing: '0.5px',
              cursor: 'pointer',
              transition: 'all 0.18s',
              backdropFilter: 'blur(10px)',
            }}>
              {cat !== 'All' ? `${CAT_ICONS[cat]} ` : '✦ '}{cat}
            </button>
          ))}
        </div>

        {/* Tools grid grouped by category */}
        {activeFilter === 'All' ? (
          Object.entries(grouped).map(([cat, tools]) => {
            const cc = CAT_COLORS[cat]
            return (
              <div key={cat} style={{ marginBottom: 38 }}>
                {/* Category header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: cc.dot,
                    boxShadow: `0 0 8px ${cc.dot}`,
                  }} />
                  <span style={{
                    fontFamily: 'Syne', fontWeight: 700, fontSize: '0.78rem',
                    textTransform: 'uppercase', letterSpacing: '2px',
                    color: cc.label,
                  }}>{CAT_ICONS[cat]} {cat}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 4 }}>({tools.length})</span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
                  gap: 12,
                }}>
                  {tools.map((t, i) => <ToolCard key={t.id} tool={t} navigate={navigate} idx={i} />)}
                </div>
              </div>
            )
          })
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))',
            gap: 12,
          }}>
            {filtered.map((t, i) => <ToolCard key={t.id} tool={t} navigate={navigate} idx={i} />)}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No tools match "{search}"</p>
          </div>
        )}
      </div>

      {/* === RECENT FILES === */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Syne', fontSize: '1rem', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text2)' }}>
            Recent Files
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>View all →</button>
        </div>
        {loadingHistory ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : history.length === 0 ? (
          <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No files yet — pick a tool above to get started!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(item => (
              <div key={item.id} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(124,106,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.original_filename || 'Untitled'}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.74rem', marginTop: 2 }}>
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

function ToolCard({ tool: t, navigate, idx }) {
  const hex = t.color
  const glow = hex + '40'
  const bg   = hex + '18'
  const border = hex + '50'

  return (
    <div
      onClick={() => navigate(`/tool/${t.id}`)}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 16,
        padding: '18px 16px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
        position: 'relative', overflow: 'hidden',
        animation: `floatUp 0.4s ease ${idx * 0.03}s forwards`,
        opacity: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px) scale(1.02)'
        e.currentTarget.style.borderColor = border
        e.currentTarget.style.boxShadow = `0 12px 40px ${glow}, inset 0 1px 0 rgba(255,255,255,0.15)`
        e.currentTarget.style.background = `linear-gradient(135deg, ${bg} 0%, rgba(255,255,255,0.03) 100%)`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
      }}
    >
      {/* Highlight top edge */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: bg,
        border: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.25rem',
        boxShadow: `0 4px 12px ${glow}`,
      }}>{t.icon}</div>
      <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.3 }}>{t.name}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.45 }}>{t.desc}</div>
    </div>
  )
}
