/**
 * Cloudflare Worker for PDFforge
 * Rate limits requests, handles CORS, caches responses
 */

const RATE_LIMIT = 30 // requests per minute
const BACKEND_URL = 'https://pdfforge-3iaz.onrender.com' // Change to your backend

// Simple in-memory rate limiter (will reset per worker restart)
const rateLimitMap = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const key = `ip:${ip}`
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, [])
  }
  
  const times = rateLimitMap.get(key).filter(t => t > now - 60000)
  rateLimitMap.set(key, times)
  
  if (times.length >= RATE_LIMIT) {
    return false
  }
  
  times.push(now)
  return true
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown'

    // Rate limiting for API calls
    if (url.pathname.startsWith('/api/')) {
      if (!checkRateLimit(clientIp)) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Max 30 requests/minute.' }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        )
      }
    }

    // Health check
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'cloudflare', timestamp: new Date().toISOString() }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Proxy to backend
    const backendUrl = BACKEND_URL + url.pathname + url.search
    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.method !== 'GET' ? request.body : undefined,
    }

    // Remove host header to avoid issues
    init.headers.delete('host')
    
    // Add security headers
    init.headers.set('X-Forwarded-For', clientIp)

    try {
      let response = await fetch(backendUrl, init)

      // Clone response so we can modify headers
      response = new Response(response.body, response)

      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

      // CORS headers
      response.headers.set('Access-Control-Allow-Origin', request.headers.get('origin') || '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

      // Cache PDFs for 1 hour
      if (url.pathname.includes('/pdf') && response.status === 200) {
        response.headers.set('Cache-Control', 'public, max-age=3600')
      }

      return response
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Backend unavailable: ' + error.message }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
  },
}
