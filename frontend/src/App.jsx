import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import Dashboard from './pages/Dashboard.jsx'
import History from './pages/History.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Tool from './pages/Tool.jsx'

function Splash() {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2600)
    return () => clearTimeout(t)
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a16', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
      animation: 'fadeOut 0.6s ease 2s forwards'
    }}>
      <style>{`
        @keyframes pulseGlow {
          0% { filter: drop-shadow(0 0 10px rgba(255,0,127,0.3)); transform: scale(1); }
          50% { filter: drop-shadow(0 0 40px rgba(255,179,71,0.7)); transform: scale(1.08); }
          100% { filter: drop-shadow(0 0 10px rgba(255,0,127,0.3)); transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes fadeOut {
          to { opacity: 0; visibility: hidden; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <img src="/logo.png" alt="PDFforge" style={{
         width: 140, height: 140,
         animation: 'pulseGlow 2.5s infinite ease-in-out, float 3s ease-in-out infinite'
      }} />
      <h1 style={{
         fontFamily: 'Syne', fontWeight: 800, fontSize: '3rem',
         marginTop: 24, letterSpacing: '1px',
         background: 'linear-gradient(135deg, #ff007f, #ffb347)',
         WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
         animation: 'fadeInUp 0.8s ease 0.4s both'
      }}>
        PDFforge
      </h1>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Splash />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tool/:toolId" element={<Tool />} />
      </Routes>
    </>
  )
}
