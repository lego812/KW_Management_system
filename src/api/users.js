import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { auth, db, hasFirebaseConfig, orgId } from '../plugins/firebase'

function ensureFirestore() {
  if (!hasFirebaseConfig || !db) {
    throw new Error('Firebase Firestore is not configured. Check .env.local')
  }
  if (!orgId) {
    throw new Error('VITE_ORG_ID is not configured.')
  }
}

function membersCol() {
  ensureFirestore()
  return collection(db, `orgs/${orgId}/members`)
}

function memberDoc(memberId) {
  ensureFirestore()
  return doc(db, `orgs/${orgId}/members/${memberId}`)
}

export async function listUsers() {
  const q = query(membersCol(), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)

  return snap.docs.map((d) => {
    const data = d.data()
    return {
      id: d.id,
      uid: data.uid ?? d.id,
      name: data.name ?? data.displayName ?? '',
      email: data.email ?? '',
      role: String(data.role ?? 'USER').toUpperCase(),
      status: String(data.status ?? 'PENDING').toUpperCase(),
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
      approvedAt: data.approvedAt ?? null,
      approvedBy: data.approvedBy ?? null,
    }
  })
}

export async function getMyMemberProfile() {
  ensureFirestore()
  const uid = auth.currentUser?.uid
  if (!uid) return null

  const snap = await getDoc(memberDoc(uid))
  if (!snap.exists()) return null

  const data = snap.data()
  return {
    id: snap.id,
    uid,
    role: String(data.role ?? 'USER').toUpperCase(),
    status: String(data.status ?? 'PENDING').toUpperCase(),
  }
}

export async function approveMember(memberId) {
  ensureFirestore()
  const adminUid = auth.currentUser?.uid
  if (!adminUid) {
    throw new Error('로그인 정보가 없어 승인할 수 없습니다.')
  }

  await updateDoc(memberDoc(memberId), {
    status: 'APPROVED',
    approvedAt: serverTimestamp(),
    approvedBy: adminUid,
    updatedAt: serverTimestamp(),
  })
}

export async function updateMemberRole(memberId, role) {
  ensureFirestore()
  const adminUid = auth.currentUser?.uid
  if (!adminUid) {
    throw new Error('로그인 정보가 없어 권한을 변경할 수 없습니다.')
  }

  const normalizedRole = String(role ?? '').toUpperCase()
  if (!['COACH', 'USER'].includes(normalizedRole)) {
    throw new Error('권한은 COACH 또는 USER만 설정할 수 있습니다.')
  }

  await updateDoc(memberDoc(memberId), {
    role: normalizedRole,
    updatedAt: serverTimestamp(),
  })
}
