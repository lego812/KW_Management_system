import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db, hasFirebaseConfig, orgId } from '../plugins/firebase'

const EMPTY_STATE = {
  activeFormationId: '',
  players: [],
  drawings: [],
  annotations: [],
}

function requireFirestore() {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')
}

function tacticBoardsCol() {
  requireFirestore()
  return collection(db, `orgs/${orgId}/tacticBoards`)
}

function tacticBooksCol() {
  requireFirestore()
  return collection(db, `orgs/${orgId}/tacticBooks`)
}

function bookDoc(bookId) {
  requireFirestore()
  return doc(db, `orgs/${orgId}/tacticBooks/${bookId}`)
}

function boardDoc(boardId) {
  requireFirestore()
  return doc(db, `orgs/${orgId}/tacticBoards/${boardId}`)
}

function boardCurrentDoc(boardId) {
  requireFirestore()
  return doc(db, `orgs/${orgId}/tacticBoards/${boardId}/state/current`)
}

function boardVersionsCol(boardId) {
  requireFirestore()
  return collection(db, `orgs/${orgId}/tacticBoards/${boardId}/state/versions`)
}

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function sanitizeNode(node, index) {
  const nodeId = String(node?.nodeId ?? `n_${Date.now()}_${index}`)
  const pos = node?.pos ?? {}
  return {
    nodeId,
    playerId: String(node?.playerId ?? ''),
    label: String(node?.label ?? ''),
    iconType: String(node?.iconType ?? 'NUMBER'),
    pos: {
      x: clamp01(pos.x),
      y: clamp01(pos.y),
    },
    rotation: Number(node?.rotation ?? 0),
  }
}

function sanitizeDrawing(drawing, index) {
  const rawPoints = Array.isArray(drawing?.points) && drawing.points.length > 0
    ? drawing.points
    : (drawing?.to ? [drawing.to] : [])

  const points = rawPoints.map((p) => ({ x: clamp01(p?.x), y: clamp01(p?.y) }))

  return {
    drawId: String(drawing?.drawId ?? `d_${Date.now()}_${index}`),
    type: String(drawing?.type ?? 'ROUTE'),
    style: String(drawing?.style ?? 'SOLID'),
    fromNodeId: String(drawing?.fromNodeId ?? ''),
    points,
    marker: String(drawing?.marker ?? 'ARROW'),
  }
}

function sanitizeAnnotation(annotation, index) {
  const pos = annotation?.pos ?? {}
  return {
    annotationId: String(annotation?.annotationId ?? `a_${Date.now()}_${index}`),
    text: String(annotation?.text ?? ''),
    pos: {
      x: clamp01(pos.x),
      y: clamp01(pos.y),
    },
  }
}

function sanitizeState(input) {
  const base = input ?? EMPTY_STATE
  return {
    activeFormationId: String(base.activeFormationId ?? ''),
    players: Array.isArray(base.players) ? base.players.map((node, idx) => sanitizeNode(node, idx)) : [],
    drawings: Array.isArray(base.drawings) ? base.drawings.map((d, idx) => sanitizeDrawing(d, idx)) : [],
    annotations: Array.isArray(base.annotations)
      ? base.annotations.map((a, idx) => sanitizeAnnotation(a, idx))
      : [],
  }
}

export async function fetchTactics(category = 'ALL') {
  const q = query(tacticBoardsCol(), where('isDeleted', '==', false), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (category === 'ALL') return rows
  return rows.filter((row) => row.category === category)
}

export async function fetchTacticsByBook(bookId, category = 'ALL') {
  const q = query(
    tacticBoardsCol(),
    where('isDeleted', '==', false),
    where('bookId', '==', String(bookId ?? '')),
    orderBy('updatedAt', 'desc'),
  )
  const snap = await getDocs(q)
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  if (category === 'ALL') return rows
  return rows.filter((row) => row.category === category)
}

export async function fetchPlaybooks() {
  const q = query(tacticBooksCol(), where('isDeleted', '==', false), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createPlaybook(payload) {
  requireFirestore()
  const user = auth?.currentUser
  const title = String(payload?.title ?? '').trim() || '새 전술집'
  const description = String(payload?.description ?? '').trim()

  return addDoc(tacticBooksCol(), {
    title,
    description,
    version: 1,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}

export async function deletePlaybook(bookId) {
  requireFirestore()
  const user = auth?.currentUser

  await updateDoc(bookDoc(bookId), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })

  const boards = await getDocs(query(tacticBoardsCol(), where('bookId', '==', String(bookId ?? '')), where('isDeleted', '==', false)))
  await Promise.all(
    boards.docs.map((row) =>
      updateDoc(row.ref, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
        updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
      }),
    ),
  )
}

export async function clonePlaybook(bookId) {
  requireFirestore()
  const source = await getDoc(bookDoc(bookId))
  if (!source.exists()) throw new Error('전술집이 존재하지 않습니다.')

  const user = auth?.currentUser
  const sourceData = source.data()
  const clonedBookRef = await addDoc(tacticBooksCol(), {
    title: `${String(sourceData?.title ?? '전술집')} (복제본)`,
    description: String(sourceData?.description ?? ''),
    version: Number(sourceData?.version ?? 1) + 1,
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })

  const boardRows = await getDocs(query(tacticBoardsCol(), where('bookId', '==', String(bookId ?? '')), where('isDeleted', '==', false)))
  for (const row of boardRows.docs) {
    const sourceBoard = row.data()
    const nextBoardRef = await addDoc(tacticBoardsCol(), {
      title: String(sourceBoard?.title ?? '새 작전'),
      category: String(sourceBoard?.category ?? 'OFFENSE'),
      tags: Array.isArray(sourceBoard?.tags) ? sourceBoard.tags : [],
      summary: String(sourceBoard?.summary ?? ''),
      roleDescription: String(sourceBoard?.roleDescription ?? ''),
      bookId: clonedBookRef.id,
      status: 'DRAFT',
      visibility: 'ORG',
      isDeleted: false,
      activeFormationId: String(sourceBoard?.activeFormationId ?? ''),
      lastPublishedVersion: Number(sourceBoard?.lastPublishedVersion ?? 0),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
      updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    })

    const state = await fetchBoardState(row.id)
    await setDoc(boardCurrentDoc(nextBoardRef.id), {
      ...state,
      updatedAt: serverTimestamp(),
      updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    })
  }

  return clonedBookRef
}

export async function createTacticBoard(payload) {
  requireFirestore()

  const user = auth?.currentUser
  const tags = Array.isArray(payload?.tags)
    ? payload.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : []

  const boardRef = await addDoc(tacticBoardsCol(), {
    title: String(payload?.title ?? '새 전술').trim() || '새 전술',
    category: String(payload?.category ?? 'OFFENSE'),
    tags,
    summary: String(payload?.summary ?? ''),
    roleDescription: String(payload?.roleDescription ?? ''),
    bookId: String(payload?.bookId ?? ''),
    status: 'DRAFT',
    visibility: 'ORG',
    isDeleted: false,
    activeFormationId: String(payload?.activeFormationId ?? ''),
    lastPublishedVersion: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })

  await setDoc(boardCurrentDoc(boardRef.id), {
    ...sanitizeState(payload?.initialState),
    updatedAt: serverTimestamp(),
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })

  return boardRef
}

export async function fetchBoardState(boardId) {
  requireFirestore()
  const snap = await getDoc(boardCurrentDoc(boardId))
  if (!snap.exists()) {
    return sanitizeState(EMPTY_STATE)
  }
  return sanitizeState(snap.data())
}

export async function deleteTacticBoard(boardId) {
  requireFirestore()
  const user = auth?.currentUser
  await updateDoc(boardDoc(boardId), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}

export async function updateTacticBoardMeta(boardId, payload) {
  requireFirestore()
  const user = auth?.currentUser
  await updateDoc(boardDoc(boardId), {
    title: String(payload?.title ?? '').trim() || '새 작전',
    category: String(payload?.category ?? 'OFFENSE'),
    summary: String(payload?.summary ?? ''),
    roleDescription: String(payload?.roleDescription ?? ''),
    updatedAt: serverTimestamp(),
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}

export async function saveBoardState(boardId, state) {
  requireFirestore()
  const user = auth?.currentUser
  const nextState = sanitizeState(state)

  await setDoc(
    boardCurrentDoc(boardId),
    {
      ...nextState,
      updatedAt: serverTimestamp(),
      updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    },
    { merge: true },
  )

  await updateDoc(boardDoc(boardId), {
    activeFormationId: nextState.activeFormationId,
    updatedAt: serverTimestamp(),
    updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}

export async function fetchBoardVersions(boardId) {
  requireFirestore()
  const q = query(boardVersionsCol(boardId), orderBy('version', 'desc'), limit(20))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function saveBoardVersion(boardId, message = '') {
  requireFirestore()
  const user = auth?.currentUser
  const currentState = await fetchBoardState(boardId)

  const nextVersion = await runTransaction(db, async (tx) => {
    const boardRef = boardDoc(boardId)
    const boardSnap = await tx.get(boardRef)
    if (!boardSnap.exists()) throw new Error('보드가 존재하지 않습니다.')

    const prevVersion = Number(boardSnap.data()?.lastPublishedVersion ?? 0)
    const version = prevVersion + 1

    tx.update(boardRef, {
      lastPublishedVersion: version,
      updatedAt: serverTimestamp(),
      updatedBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
    })

    return version
  })

  const versionRef = await addDoc(boardVersionsCol(boardId), {
    version: nextVersion,
    message: String(message ?? '').trim() || `v${nextVersion} 저장`,
    snapshot: currentState,
    createdAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })

  return { id: versionRef.id, version: nextVersion }
}

export async function applyBoardVersion(boardId, versionId) {
  requireFirestore()
  const snap = await getDoc(doc(db, `orgs/${orgId}/tacticBoards/${boardId}/state/versions/${versionId}`))
  if (!snap.exists()) throw new Error('선택한 버전이 존재하지 않습니다.')

  const snapshot = sanitizeState(snap.data()?.snapshot)
  await saveBoardState(boardId, snapshot)
}

