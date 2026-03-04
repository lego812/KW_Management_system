import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import { auth, hasFirebaseConfig } from '../plugins/firebase'

const provider = new GoogleAuthProvider()

function ensureAuth() {
  if (!hasFirebaseConfig || !auth) {
    throw new Error('Firebase Auth is not configured. Check .env.local')
  }
}

export function watchAuthState(callback) {
  ensureAuth()
  return onAuthStateChanged(auth, callback)
}

export function waitForAuthReady() {
  ensureAuth()
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe()
      resolve(user)
    })
  })
}

export async function signInByEmail(email, password) {
  ensureAuth()
  return signInWithEmailAndPassword(auth, email, password)
}

export async function signInByGoogle() {
  ensureAuth()
  return signInWithRedirect(auth, provider)
}

export async function signOutUser() {
  ensureAuth()
  return signOut(auth)
}
