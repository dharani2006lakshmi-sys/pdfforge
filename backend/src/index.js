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

// CORS - restrict to frontend domain
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:5173').split(',')
app.use(cors({
  origin: allowedOrigins,
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
