import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db, hasFirebaseConfig, orgId } from '../plugins/firebase'

function tacticBoardsCol() {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')
  return collection(db, `orgs/${orgId}/tacticBoards`)
}

export async function fetchTactics(category = 'ALL') {
  let q
  if (category === 'ALL') {
    q = query(tacticBoardsCol(), where('isDeleted', '==', false), orderBy('updatedAt', 'desc'))
  } else {
    q = query(
      tacticBoardsCol(),
      where('isDeleted', '==', false),
      where('category', '==', category),
      orderBy('updatedAt', 'desc'),
    )
  }
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createTacticBoard(payload) {
  const user = auth.currentUser
  return addDoc(tacticBoardsCol(), {
    title: payload.title,
    category: payload.category ?? 'OFFENSE',
    tags: payload.tags ?? [],
    status: 'DRAFT',
    visibility: 'ORG',
    isDeleted: false,
    activeFormationId: payload.activeFormationId ?? 'formation_1',
    lastPublishedVersion: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}

export async function saveBoardVersion(boardId) {
  const user = auth.currentUser
  const versionDocRef = await addDoc(
    collection(db, `orgs/${orgId}/tacticBoards/${boardId}/state/versions`),
    {
      version: Date.now(),
      message: 'Saved from web UI',
      createdAt: serverTimestamp(),
      createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    },
  )

  await updateDoc(doc(db, `orgs/${orgId}/tacticBoards/${boardId}`), {
    updatedAt: serverTimestamp(),
  })

  return versionDocRef
}
