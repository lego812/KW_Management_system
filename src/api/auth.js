import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, orgId } from '../plugins/firebase'
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

export async function signUpByEmail(email, password) {
  ensureAuth()
  return createUserWithEmailAndPassword(auth, email, password)
}

export async function signInByGoogle() {
  ensureAuth()
  return signInWithPopup(auth, provider)
}

export async function signOutUser() {
  ensureAuth()
  return signOut(auth)
}

export async function createPendingMemberProfile(user, payload = {}) {
  ensureAuth()
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')
  if (!user?.uid) throw new Error('회원가입 사용자 정보가 없습니다.')

  const displayName = payload.displayName ?? user.displayName ?? ''
  const email = payload.email ?? user.email ?? ''

  await setDoc(
    doc(db, `users/${user.uid}`),
    {
      uid: user.uid,
      email,
      displayName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  )

  await setDoc(
    doc(db, `orgs/${orgId}/members/${user.uid}`),
    {
      uid: user.uid,
      email,
      displayName,
      role: payload.role ?? 'USER',
      status: 'PENDING',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function getMemberStatus(userId) {
  ensureAuth()
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')

  const targetUid = userId ?? auth.currentUser?.uid
  if (!targetUid) return null

  const snap = await getDoc(doc(db, `orgs/${orgId}/members/${targetUid}`))
  if (!snap.exists()) return 'PENDING'

  return String(snap.data().status ?? 'PENDING').toUpperCase()
}

export async function getMemberStatusDetail(userId) {
  ensureAuth()
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')

  const targetUid = userId ?? auth.currentUser?.uid
  if (!targetUid) {
    return {
      uid: '',
      orgId,
      path: '',
      exists: false,
      status: null,
      role: null,
    }
  }

  const path = `orgs/${orgId}/members/${targetUid}`
  const snap = await getDoc(doc(db, path))

  return {
    uid: targetUid,
    orgId,
    path,
    exists: snap.exists(),
    status: snap.exists() ? String(snap.data().status ?? 'PENDING').toUpperCase() : 'PENDING',
    role: snap.exists() ? String(snap.data().role ?? 'USER').toUpperCase() : 'USER',
  }
}


