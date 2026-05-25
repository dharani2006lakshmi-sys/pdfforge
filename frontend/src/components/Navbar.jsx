import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out')
    navigate('/')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(7,7,13,0.88)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 32px',
      height: 62,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 30, height: 30,
          background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 800, color: '#fff',
          fontFamily: 'Syne',
        }}>P</div>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.15rem' }}>
          <span className="gradient-text">PDF</span>
          <span style={{ color: 'var(--text)' }}>forge</span>
        </span>
      </Link>

      {/* Desktop Links */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[
          { to: '/', label: 'Tools' },
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/history', label: 'History' },
        ].map(({ to, label }) => (
          <Link key={to} to={to} style={{
            padding: '6px 14px',
            borderRadius: 8,
            fontSize: '0.87rem',
            fontWeight: 500,
            color: isActive(to) ? 'var(--text)' : 'var(--muted)',
            background: isActive(to) ? 'var(--surface2)' : 'transparent',
            transition: 'all 0.18s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => { if (!isActive(to)) e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { if (!isActive(to)) e.currentTarget.style.color = 'var(--muted)' }}
          >{label}</Link>
        ))}
      </div>

      {/* Auth area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {user ? (
          <>
            <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 700, color: '#fff',
                overflow: 'hidden',
              }}>
                {user.photoURL
                  ? <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (user.displayName || user.email || 'U')[0].toUpperCase()
                }
              </div>
              <span style={{ fontSize: '0.84rem', color: 'var(--text2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.displayName || user.email}
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Sign out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
          </>
        )}
      </div>
    </nav>
  )
}
