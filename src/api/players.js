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

const OFFENSE_SET = new Set(['QB', 'RB', 'OL', 'TE', 'WR'])
const DEFENSE_SET = new Set(['DL', 'LB', 'C', 'S'])
const SPECIAL_SET = new Set(['K', 'S'])

function playersCol() {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')
  return collection(db, `orgs/${orgId}/players`)
}

function playerDoc(playerId) {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')
  return doc(db, `orgs/${orgId}/players/${playerId}`)
}

export async function fetchPlayers() {
  const q = query(playersCol(), where('isDeleted', '==', false), orderBy('number', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const data = d.data()
    const legacyPositions = Array.isArray(data.positions) ? data.positions : []
    const offensePositions = Array.isArray(data.offensePositions)
      ? data.offensePositions
      : legacyPositions.filter((p) => OFFENSE_SET.has(p))
    const defensePositions = Array.isArray(data.defensePositions)
      ? data.defensePositions
      : legacyPositions.filter((p) => DEFENSE_SET.has(p))
    const specialPositions = Array.isArray(data.specialPositions)
      ? data.specialPositions
      : legacyPositions.filter((p) => SPECIAL_SET.has(p))

    return {
      id: d.id,
      ...data,
      status: data.status ?? '재학',
      offensePositions,
      defensePositions,
      specialPositions,
      studentNo: data.studentNo ?? '',
      remark: data.remark ?? '',
    }
  })
}

export async function createPlayer(input) {
  const user = auth.currentUser
  const offensePositions = input.offensePositions ?? []
  const defensePositions = input.defensePositions ?? []
  const specialPositions = input.specialPositions ?? []

  return addDoc(playersCol(), {
    name: input.name,
    age: input.age ?? null,
    studentNo: input.studentNo ?? '',
    department: input.department ?? '',
    joinedAt: input.joinedAt ?? serverTimestamp(),
    number: input.number,
    positions: input.positions ?? [...offensePositions, ...defensePositions, ...specialPositions],
    offensePositions,
    defensePositions,
    specialPositions,
    heightCm: input.heightCm ?? null,
    weightKg: input.weightKg ?? null,
    traits: input.traits ?? { speed: 0, power: 0, agility: 0, iq: 0 },
    tags: input.tags ?? [],
    status: input.status ?? '재학',
    remark: input.remark ?? '',
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}

export async function updatePlayer(playerId, input) {
  const offensePositions = input.offensePositions ?? []
  const defensePositions = input.defensePositions ?? []
  const specialPositions = input.specialPositions ?? []

  await updateDoc(playerDoc(playerId), {
    name: input.name,
    number: input.number,
    positions: input.positions ?? [...offensePositions, ...defensePositions, ...specialPositions],
    offensePositions,
    defensePositions,
    specialPositions,
    status: input.status ?? '재학',
    age: input.age ?? null,
    heightCm: input.heightCm ?? null,
    weightKg: input.weightKg ?? null,
    studentNo: input.studentNo ?? '',
    department: input.department ?? '',
    remark: input.remark ?? '',
    updatedAt: serverTimestamp(),
  })
}

export async function softDeletePlayer(playerId) {
  await updateDoc(playerDoc(playerId), {
    isDeleted: true,
    updatedAt: serverTimestamp(),
  })
}
