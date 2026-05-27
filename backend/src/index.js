import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import pdfRoutes from './routes/pdf.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Create temp directory if it doesn't exist
const tempDir = process.env.TEMP_DIR || '/tmp/pdfforge'
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

// CORS — set ALLOWED_ORIGIN in .env for production (comma-separated for multiple)
// e.g. ALLOWED_ORIGIN=https://pdfforge.netlify.app,https://pdfforge.com
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',').map(o => o.trim()).filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps, Postman)
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error(`CORS: origin "${origin}" is not allowed. Add it to ALLOWED_ORIGIN in your .env`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json())
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/pdf', pdfRoutes)

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`✅ PDFforge backend running on port ${PORT}`)
  console.log(`📁 Temp directory: ${tempDir}`)
})
