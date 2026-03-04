import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { auth, db, hasFirebaseConfig, orgId } from '../plugins/firebase'

function playersCol() {
  if (!hasFirebaseConfig || !db) throw new Error('Firebase Firestore is not configured. Check .env.local')
  if (!orgId) throw new Error('VITE_ORG_ID is not configured.')
  return collection(db, `orgs/${orgId}/players`)
}

export async function fetchPlayers() {
  const q = query(playersCol(), where('isDeleted', '==', false), orderBy('number', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function createPlayer(input) {
  const user = auth.currentUser
  return addDoc(playersCol(), {
    name: input.name,
    age: input.age ?? null,
    studentNo: input.studentNo ?? '',
    department: input.department ?? '',
    joinedAt: input.joinedAt ?? serverTimestamp(),
    number: input.number,
    positions: input.positions ?? [],
    heightCm: input.heightCm ?? null,
    weightKg: input.weightKg ?? null,
    traits: input.traits ?? { speed: 0, power: 0, agility: 0, iq: 0 },
    tags: input.tags ?? [],
    isDeleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: { uid: user?.uid ?? 'unknown', displayName: user?.displayName ?? 'unknown' },
  })
}
