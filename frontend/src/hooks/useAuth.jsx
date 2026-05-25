import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../utils/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const t = await u.getIdToken()
        setToken(t)
      } else {
        setToken(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const loginEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const registerEmail = async (email, password, name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    return cred
  }

  const loginGoogle = () => signInWithPopup(auth, googleProvider)

  const logout = () => signOut(auth)

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  const getToken = async () => {
    if (user) return await user.getIdToken(true)
    return null
  }

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      loginEmail, registerEmail, loginGoogle, logout, resetPassword, getToken
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
