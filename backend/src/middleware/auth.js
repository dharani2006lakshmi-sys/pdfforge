import { firebaseAuth } from '../services/firebase.js'

export async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }
    
    const decodedToken = await firebaseAuth.verifyIdToken(token)
    req.user = decodedToken
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token: ' + err.message })
  }
}

export function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (token) {
    firebaseAuth.verifyIdToken(token)
      .then(decoded => {
        req.user = decoded
        next()
      })
      .catch(() => next()) // Optional, so continue anyway
  } else {
    next()
  }
}
