import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1d1d2a',
              color: '#eeeef8',
              border: '1px solid #252535',
              borderRadius: '12px',
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '0.88rem',
            },
            success: { iconTheme: { primary: '#00e5a0', secondary: '#07070d' } },
            error: { iconTheme: { primary: '#ff4d6d', secondary: '#07070d' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
