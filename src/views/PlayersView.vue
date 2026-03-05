<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { RefreshCw, Trash2, Users } from 'lucide-vue-next'
import { getMemberStatusDetail } from '../api/auth'
import { createPlayer, fetchPlayers, softDeletePlayer, updatePlayer } from '../api/players'

const OFFENSE_OPTIONS = ['QB', 'RB', 'OL', 'TE', 'WR']
const DEFENSE_OPTIONS = ['DL', 'LB', 'C', 'S']
const STATUS_OPTIONS = ['재학', '휴학', '부상']

const keyword = ref('')
const loading = ref(false)
const saving = ref(false)
const creating = ref(false)
const deletingId = ref('')
const errorMessage = ref('')
const actionMessage = ref('')
const players = ref([])

const editMode = ref(false)
const createMode = ref(false)
const canEditPlayers = ref(false)
const myRole = ref('USER')

const editRows = reactive({})
const sortBy = reactive({
  number: 'none',
  name: 'none',
  studentNo: 'none',
  offense: 'none',
  defense: 'none',
  special: 'none',
  status: 'none',
  heightCm: 'none',
  weightKg: 'none',
})
const SORT_KEYS = ['number', 'name', 'studentNo', 'offense', 'defense', 'special', 'status', 'heightCm', 'weightKg']

const newPlayer = reactive({
  number: '',
  name: '',
  studentNo: '',
  offense: '',
  defense: '',
  specialK: false,
  specialS: false,
  status: '재학',
  heightCm: '',
  weightKg: '',
  remark: '',
})

let actionMessageTimer = null

const filteredPlayers = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const base = !q
    ? [...players.value]
    : players.value.filter((p) => {
      return (
        String(p.name ?? '').toLowerCase().includes(q) ||
        String(p.number ?? '').includes(q) ||
        String(p.studentNo ?? '').includes(q) ||
        String(p.remark ?? '').toLowerCase().includes(q) ||
        (p.offensePositions || []).join(',').toLowerCase().includes(q) ||
        (p.defensePositions || []).join(',').toLowerCase().includes(q) ||
        (p.specialPositions || []).join(',').toLowerCase().includes(q)
      )
    })

  const activeKey = SORT_KEYS.find((key) => sortBy[key] && sortBy[key] !== 'none')
  if (!activeKey) return base
  const direction = sortBy[activeKey]
  return base.sort((a, b) => compareByKey(a, b, activeKey, direction))
})

const activeSortKey = computed(() => SORT_KEYS.find((key) => sortBy[key] && sortBy[key] !== 'none') || '')

function sanitizeStudentNo(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.slice(0, 2)
}

function setActionMessage(message) {
  actionMessage.value = message
  if (actionMessageTimer) clearTimeout(actionMessageTimer)
  actionMessageTimer = setTimeout(() => {
    actionMessage.value = ''
    actionMessageTimer = null
  }, 5000)
}

function resetMessages() {
  errorMessage.value = ''
  actionMessage.value = ''
  if (actionMessageTimer) {
    clearTimeout(actionMessageTimer)
    actionMessageTimer = null
  }
}

function resetSorts() {
  Object.keys(sortBy).forEach((key) => {
    sortBy[key] = 'none'
  })
}

function isSortDisabled(key) {
  return Boolean(activeSortKey.value) && activeSortKey.value !== key
}

function onSortChange(key, value) {
  if (value === 'none') {
    sortBy[key] = 'none'
    return
  }
  SORT_KEYS.forEach((k) => {
    sortBy[k] = k === key ? value : 'none'
  })
}

function resetNewPlayer() {
  newPlayer.number = ''
  newPlayer.name = ''
  newPlayer.studentNo = ''
  newPlayer.offense = ''
  newPlayer.defense = ''
  newPlayer.specialK = false
  newPlayer.specialS = false
  newPlayer.status = '재학'
  newPlayer.heightCm = ''
  newPlayer.weightKg = ''
  newPlayer.remark = ''
}

function toNullableNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function toSpecialList(row) {
  const list = []
  if (row.specialK) list.push('K')
  if (row.specialS) list.push('S')
  return list
}

function ensureEditRows() {
  players.value.forEach((p) => {
    editRows[p.id] = {
      number: p.number == null ? '' : String(p.number),
      name: String(p.name ?? ''),
      studentNo: sanitizeStudentNo(p.studentNo ?? ''),
      offense: Array.isArray(p.offensePositions) && p.offensePositions[0] ? p.offensePositions[0] : '',
      defense: Array.isArray(p.defensePositions) && p.defensePositions[0] ? p.defensePositions[0] : '',
      specialK: Array.isArray(p.specialPositions) ? p.specialPositions.includes('K') : false,
      specialS: Array.isArray(p.specialPositions) ? p.specialPositions.includes('S') : false,
      status: p.status ?? '재학',
      heightCm: p.heightCm == null ? '' : String(p.heightCm),
      weightKg: p.weightKg == null ? '' : String(p.weightKg),
      remark: String(p.remark ?? ''),
    }
  })
}

function getSortValue(player, key) {
  if (key === 'number') return Number(player.number ?? 0)
  if (key === 'name') return String(player.name ?? '')
  if (key === 'studentNo') return Number(player.studentNo ?? -1)
  if (key === 'offense') return (player.offensePositions || [])[0] ?? ''
  if (key === 'defense') return (player.defensePositions || [])[0] ?? ''
  if (key === 'special') return (player.specialPositions || []).join(',')
  if (key === 'status') return String(player.status ?? '재학')
  if (key === 'heightCm') return Number(player.heightCm ?? -1)
  if (key === 'weightKg') return Number(player.weightKg ?? -1)
  return ''
}

function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko')
}

function compareByKey(a, b, key, direction) {
  if (key === 'number' || key === 'heightCm' || key === 'weightKg' || key === 'studentNo') {
    const cmp = compareValues(getSortValue(a, key), getSortValue(b, key))
    return direction === 'desc' ? -cmp : cmp
  }

  if (key === 'name') {
    const cmp = compareValues(String(a.name ?? ''), String(b.name ?? ''))
    return direction === 'ko_desc' ? -cmp : cmp
  }

  if (key === 'offense' || key === 'defense') {
    if (direction === 'group') {
      const order = key === 'offense' ? OFFENSE_OPTIONS : DEFENSE_OPTIONS
      const av = (a[key === 'offense' ? 'offensePositions' : 'defensePositions'] || [])[0] ?? ''
      const bv = (b[key === 'offense' ? 'offensePositions' : 'defensePositions'] || [])[0] ?? ''
      const ai = order.indexOf(av)
      const bi = order.indexOf(bv)
      if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
      return 0
    }
    return compareValues(getSortValue(a, key), getSortValue(b, key))
  }

  if (key === 'status') {
    if (direction === 'group') {
      const order = STATUS_OPTIONS
      const ai = order.indexOf(String(a.status ?? '재학'))
      const bi = order.indexOf(String(b.status ?? '재학'))
      if (ai !== bi) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi)
      return 0
    }
    return compareValues(getSortValue(a, key), getSortValue(b, key))
  }

  return compareValues(getSortValue(a, key), getSortValue(b, key))
}

function isChanged(player, row) {
  const currentSpecial = (player.specialPositions || []).slice().sort().join(',')
  const nextSpecial = toSpecialList(row).slice().sort().join(',')

  return (
    Number(player.number ?? 0) !== Number(toNullableNumber(row.number) ?? 0) ||
    String(player.name ?? '').trim() !== String(row.name ?? '').trim() ||
    sanitizeStudentNo(player.studentNo ?? '') !== sanitizeStudentNo(row.studentNo ?? '') ||
    ((player.offensePositions || [])[0] ?? '') !== (row.offense || '') ||
    ((player.defensePositions || [])[0] ?? '') !== (row.defense || '') ||
    currentSpecial !== nextSpecial ||
    String(player.status ?? '재학') !== String(row.status ?? '재학') ||
    Number(player.heightCm ?? -1) !== Number(toNullableNumber(row.heightCm) ?? -1) ||
    Number(player.weightKg ?? -1) !== Number(toNullableNumber(row.weightKg) ?? -1) ||
    String(player.remark ?? '') !== String(row.remark ?? '')
  )
}

async function saveAllEdits() {
  saving.value = true
  resetMessages()

  try {
    let changedCount = 0

    for (const player of players.value) {
      const row = editRows[player.id]
      if (!row || !isChanged(player, row)) continue

      changedCount += 1
      await updatePlayer(player.id, {
        name: String(row.name ?? '').trim(),
        number: toNullableNumber(row.number) ?? Number(player.number ?? 0),
        studentNo: sanitizeStudentNo(row.studentNo),
        offensePositions: row.offense ? [row.offense] : [],
        defensePositions: row.defense ? [row.defense] : [],
        specialPositions: toSpecialList(row),
        status: row.status,
        heightCm: toNullableNumber(row.heightCm),
        weightKg: toNullableNumber(row.weightKg),
        age: player.age ?? null,
        department: player.department ?? '',
        remark: String(row.remark ?? ''),
      })
    }

    if (changedCount === 0) setActionMessage('변경된 내용이 없습니다.')
    else setActionMessage(`${changedCount}명 선수 정보를 저장했습니다.`)

    await loadPlayers()
    return true
  } catch (error) {
    errorMessage.value = error?.message ?? '선수 수정에 실패했습니다.'
    return false
  } finally {
    saving.value = false
  }
}

async function toggleEditMode() {
  if (!canEditPlayers.value) return
  if (!editMode.value) {
    ensureEditRows()
    editMode.value = true
    return
  }
  const saved = await saveAllEdits()
  if (saved) editMode.value = false
}

function toggleCreateMode() {
  if (!canEditPlayers.value || creating.value) return
  createMode.value = !createMode.value
  if (createMode.value) {
    resetMessages()
    resetNewPlayer()
  }
}

async function onCreatePlayer() {
  resetMessages()
  const name = String(newPlayer.name ?? '').trim()
  const number = toNullableNumber(newPlayer.number)
  if (!name) {
    errorMessage.value = '선수 이름을 입력해주세요.'
    return
  }
  if (number == null) {
    errorMessage.value = '등번호를 입력해주세요.'
    return
  }

  creating.value = true
  try {
    await createPlayer({
      name,
      number,
      studentNo: sanitizeStudentNo(newPlayer.studentNo),
      offensePositions: newPlayer.offense ? [newPlayer.offense] : [],
      defensePositions: newPlayer.defense ? [newPlayer.defense] : [],
      specialPositions: toSpecialList(newPlayer),
      status: newPlayer.status,
      heightCm: toNullableNumber(newPlayer.heightCm),
      weightKg: toNullableNumber(newPlayer.weightKg),
      age: null,
      department: '',
      remark: String(newPlayer.remark ?? ''),
    })

    setActionMessage(`${name} 선수를 추가했습니다.`)
    createMode.value = false
    resetNewPlayer()
    await loadPlayers()
  } catch (error) {
    errorMessage.value = error?.message ?? '선수 추가에 실패했습니다.'
  } finally {
    creating.value = false
  }
}

async function onDeletePlayer(player) {
  if (!canEditPlayers.value || !editMode.value) return
  const playerName = player?.name || '해당 선수'
  const ok = window.confirm(`${playerName} 선수를 삭제하시겠습니까?`)
  if (!ok) return

  deletingId.value = player.id
  resetMessages()
  try {
    await softDeletePlayer(player.id)
    setActionMessage(`${playerName} 선수를 삭제했습니다.`)
    await loadPlayers()
  } catch (error) {
    errorMessage.value = error?.message ?? '선수 삭제에 실패했습니다.'
  } finally {
    deletingId.value = ''
  }
}

async function loadPlayers() {
  loading.value = true
  errorMessage.value = ''
  try {
    players.value = await fetchPlayers()
    ensureEditRows()
  } catch (error) {
    errorMessage.value = error?.message ?? '선수 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  resetSorts()
  await loadPlayers()
}

async function loadMyRole() {
  try {
    const detail = await getMemberStatusDetail()
    myRole.value = detail?.role ?? 'USER'
    canEditPlayers.value = ['ADMIN', 'COACH'].includes(myRole.value)
  } catch {
    myRole.value = 'USER'
    canEditPlayers.value = false
  }
}

onMounted(async () => {
  await loadMyRole()
  await loadPlayers()
})

onBeforeUnmount(() => {
  if (actionMessageTimer) {
    clearTimeout(actionMessageTimer)
    actionMessageTimer = null
  }
})
</script>

<template>
  <main class="page">
    <header class="panel header-panel">
      <p class="eyebrow">Player Management</p>
      <h1><Users :size="22" :stroke-width="1.9" />선수 관리</h1>
      <p class="sub">선수 조회, 등록, 상태/포지션/신체 정보 편집을 처리합니다.</p>
      <p class="meta">내 권한: {{ myRole }}</p>
    </header>

    <section class="panel">
      <div class="toolbar">
        <input v-model="keyword" type="text" placeholder="이름, 등번호, 학번, 포지션 검색">

        <button v-if="canEditPlayers" type="button" class="primary" :disabled="loading || saving" @click="toggleEditMode">
          {{ saving ? '저장 중...' : editMode ? '편집 종료' : '편집' }}
        </button>
        <button v-if="canEditPlayers" type="button" :disabled="loading || saving || creating" @click="toggleCreateMode">
          {{ createMode ? '추가 취소' : '선수 추가' }}
        </button>

        <button type="button" :disabled="loading || saving" @click="onRefresh">
          <RefreshCw :size="14" :stroke-width="1.9" />새로고침
        </button>
      </div>

      <div v-if="createMode && canEditPlayers" class="create-panel">
        <h3>선수 추가</h3>
        <div class="create-grid">
          <input v-model="newPlayer.number" type="number" placeholder="등번호">
          <input v-model="newPlayer.name" type="text" placeholder="이름">
          <input v-model="newPlayer.studentNo" type="text" inputmode="numeric" maxlength="2" placeholder="학번(2자리)" @input="newPlayer.studentNo = sanitizeStudentNo(newPlayer.studentNo)">

          <select v-model="newPlayer.offense">
            <option value="">오펜스 선택 안함</option>
            <option v-for="opt in OFFENSE_OPTIONS" :key="`new-off-${opt}`" :value="opt">{{ opt }}</option>
          </select>

          <select v-model="newPlayer.defense">
            <option value="">디펜스 선택 안함</option>
            <option v-for="opt in DEFENSE_OPTIONS" :key="`new-def-${opt}`" :value="opt">{{ opt }}</option>
          </select>

          <select v-model="newPlayer.status">
            <option v-for="opt in STATUS_OPTIONS" :key="`new-status-${opt}`" :value="opt">{{ opt }}</option>
          </select>

          <input v-model="newPlayer.heightCm" type="number" placeholder="키(cm)">
          <input v-model="newPlayer.weightKg" type="number" placeholder="몸무게(kg)">

          <div class="special-checks">
            <label><input v-model="newPlayer.specialK" type="checkbox"> 스페셜 K</label>
            <label><input v-model="newPlayer.specialS" type="checkbox"> 스페셜 S</label>
          </div>

          <input v-model="newPlayer.remark" class="remark-input" type="text" placeholder="비고">
        </div>
        <div class="create-actions">
          <button type="button" class="primary" :disabled="creating" @click="onCreatePlayer">
            {{ creating ? '추가 중...' : '추가 저장' }}
          </button>
        </div>
      </div>

      <p v-if="!canEditPlayers" class="notice">ADMIN, COACH만 선수 편집이 가능합니다.</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="actionMessage" class="success">{{ actionMessage }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th><div class="th-cell"><span>등번호</span><select :value="sortBy.number" class="sort-select" :disabled="isSortDisabled('number')" @change="onSortChange('number', $event.target.value)"><option value="none">정렬</option><option value="asc">오름차순</option><option value="desc">내림차순</option></select></div></th>
              <th><div class="th-cell"><span>이름</span><select :value="sortBy.name" class="sort-select" :disabled="isSortDisabled('name')" @change="onSortChange('name', $event.target.value)"><option value="none">정렬</option><option value="ko_asc">가나다순</option><option value="ko_desc">가나다 역순</option></select></div></th>
              <th><div class="th-cell"><span>학번</span><select :value="sortBy.studentNo" class="sort-select" :disabled="isSortDisabled('studentNo')" @change="onSortChange('studentNo', $event.target.value)"><option value="none">정렬</option><option value="asc">오름차순</option><option value="desc">내림차순</option></select></div></th>
              <th><div class="th-cell"><span>오펜스</span><select :value="sortBy.offense" class="sort-select" :disabled="isSortDisabled('offense')" @change="onSortChange('offense', $event.target.value)"><option value="none">정렬</option><option value="group">포지션별</option></select></div></th>
              <th><div class="th-cell"><span>디펜스</span><select :value="sortBy.defense" class="sort-select" :disabled="isSortDisabled('defense')" @change="onSortChange('defense', $event.target.value)"><option value="none">정렬</option><option value="group">포지션별</option></select></div></th>
              <th><div class="th-cell"><span>스페셜</span><select :value="sortBy.special" class="sort-select" :disabled="isSortDisabled('special')" @change="onSortChange('special', $event.target.value)"><option value="none">정렬</option><option value="asc">오름차순</option><option value="desc">내림차순</option></select></div></th>
              <th><div class="th-cell"><span>상태</span><select :value="sortBy.status" class="sort-select" :disabled="isSortDisabled('status')" @change="onSortChange('status', $event.target.value)"><option value="none">정렬</option><option value="group">상태별</option></select></div></th>
              <th><div class="th-cell"><span>키(cm)</span><select :value="sortBy.heightCm" class="sort-select" :disabled="isSortDisabled('heightCm')" @change="onSortChange('heightCm', $event.target.value)"><option value="none">정렬</option><option value="asc">오름차순</option><option value="desc">내림차순</option></select></div></th>
              <th><div class="th-cell"><span>몸무게(kg)</span><select :value="sortBy.weightKg" class="sort-select" :disabled="isSortDisabled('weightKg')" @change="onSortChange('weightKg', $event.target.value)"><option value="none">정렬</option><option value="asc">오름차순</option><option value="desc">내림차순</option></select></div></th>
              <th>비고</th>
              <th>작업</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="player in filteredPlayers" :key="player.id">
              <td><input v-if="editMode && canEditPlayers" v-model="editRows[player.id].number" type="number" class="num-input"><span v-else>{{ player.number }}</span></td>
              <td>
                <input v-if="editMode && canEditPlayers" v-model="editRows[player.id].name" type="text" class="cell-input">
                <span v-else>{{ player.name }}</span>
              </td>
              <td><input v-if="editMode && canEditPlayers" v-model="editRows[player.id].studentNo" type="text" inputmode="numeric" maxlength="2" class="num-input" @input="editRows[player.id].studentNo = sanitizeStudentNo(editRows[player.id].studentNo)"><span v-else>{{ player.studentNo || '-' }}</span></td>

              <td>
                <select v-if="editMode && canEditPlayers" v-model="editRows[player.id].offense" class="status-select">
                  <option value="">선택 안함</option>
                  <option v-for="opt in OFFENSE_OPTIONS" :key="`off-${player.id}-${opt}`" :value="opt">{{ opt }}</option>
                </select>
                <span v-else>{{ (player.offensePositions || []).join(', ') || '-' }}</span>
              </td>

              <td>
                <select v-if="editMode && canEditPlayers" v-model="editRows[player.id].defense" class="status-select">
                  <option value="">선택 안함</option>
                  <option v-for="opt in DEFENSE_OPTIONS" :key="`def-${player.id}-${opt}`" :value="opt">{{ opt }}</option>
                </select>
                <span v-else>{{ (player.defensePositions || []).join(', ') || '-' }}</span>
              </td>

              <td>
                <div v-if="editMode && canEditPlayers" class="special-checks in-table">
                  <label><input v-model="editRows[player.id].specialK" type="checkbox"> K</label>
                  <label><input v-model="editRows[player.id].specialS" type="checkbox"> S</label>
                </div>
                <span v-else>{{ (player.specialPositions || []).join(', ') || '-' }}</span>
              </td>

              <td>
                <select v-if="editMode && canEditPlayers" v-model="editRows[player.id].status" class="status-select">
                  <option v-for="opt in STATUS_OPTIONS" :key="`status-${player.id}-${opt}`" :value="opt">{{ opt }}</option>
                </select>
                <span v-else>{{ player.status || '재학' }}</span>
              </td>

              <td><input v-if="editMode && canEditPlayers" v-model="editRows[player.id].heightCm" type="number" class="num-input"><span v-else>{{ player.heightCm ?? '-' }}</span></td>
              <td><input v-if="editMode && canEditPlayers" v-model="editRows[player.id].weightKg" type="number" class="num-input"><span v-else>{{ player.weightKg ?? '-' }}</span></td>
              <td>
                <textarea v-if="editMode && canEditPlayers" v-model="editRows[player.id].remark" class="remark-cell-input" rows="2" />
                <span v-else>{{ player.remark || '-' }}</span>
              </td>
              <td class="action-col">
                <button
                  v-if="editMode && canEditPlayers"
                  type="button"
                  class="trash-btn"
                  :disabled="deletingId === player.id || saving || creating"
                  @click="onDeletePlayer(player)"
                >
                  <Trash2 :size="14" :stroke-width="1.9" />
                </button>
                <span v-else>-</span>
              </td>
            </tr>

            <tr v-if="!loading && filteredPlayers.length === 0">
              <td colspan="11">데이터가 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1260px;
  margin: 0 auto;
  padding: 24px 16px 32px;
  display: grid;
  gap: 12px;
}

.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 18px;
  box-shadow: var(--kw-shadow-card);
}

.eyebrow { margin: 0; font-size: 12px; letter-spacing: 0.08em; color: var(--kw-text-soft); text-transform: uppercase; }
.header-panel h1 { margin: 6px 0 8px; font-size: 28px; display: flex; align-items: center; gap: 8px; }
.sub { margin: 0; color: var(--kw-text-muted); }
.meta { margin: 8px 0 0; color: var(--kw-text-soft); font-size: 13px; }

.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.toolbar input { flex: 1; height: 40px; border: 1px solid var(--kw-line-strong); border-radius: var(--kw-radius-sm); padding: 0 12px; }
.toolbar button { display: inline-flex; align-items: center; gap: 6px; height: 40px; border: 1px solid var(--kw-line-strong); border-radius: var(--kw-radius-sm); padding: 0 12px; background: var(--kw-surface); }
.toolbar .primary { background: var(--kw-primary); border-color: var(--kw-primary); color: var(--kw-primary-contrast); }

.create-panel { margin: 0 0 12px; border: 1px solid var(--kw-line); border-radius: var(--kw-radius-md); background: var(--kw-surface-muted); padding: 12px; }
.create-panel h3 { margin: 0 0 10px; font-size: 15px; }
.create-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.create-grid input, .create-grid select { height: 36px; border: 1px solid var(--kw-line-strong); border-radius: 8px; background: #fff; padding: 0 10px; }
.create-grid textarea { border: 1px solid var(--kw-line-strong); border-radius: 8px; background: #fff; padding: 8px 10px; box-sizing: border-box; resize: vertical; }
.remark-input { grid-column: span 2; }

.special-checks { display: flex; align-items: center; gap: 14px; font-size: 13px; color: var(--kw-text-muted); }
.special-checks.in-table { min-width: 100px; }

.create-actions { margin-top: 10px; }
.create-actions button { height: 36px; border: 1px solid var(--kw-line-strong); border-radius: 8px; padding: 0 12px; background: var(--kw-surface); }
.create-actions .primary { background: var(--kw-primary); border-color: var(--kw-primary); color: var(--kw-primary-contrast); }

.notice { margin: 0 0 10px; color: #92400e; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 10px; padding: 8px 10px; font-size: 13px; }
.error { margin: 0 0 10px; color: var(--kw-danger-text); font-size: 13px; }
.success { margin: 0 0 10px; color: var(--kw-success-text); font-size: 13px; }

.table-wrap { border: 1px solid var(--kw-line); border-radius: var(--kw-radius-md); overflow: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { padding: 11px 12px; border-bottom: 1px solid #eceff3; text-align: center; font-size: 14px; vertical-align: middle; }
th { background: var(--kw-surface-muted); color: var(--kw-text-muted); font-weight: 600; }

.th-cell { display: grid; gap: 6px; min-width: 110px; }
.sort-select {
  width: 11ch;
  height: 28px;
  margin: 0 auto;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: var(--kw-text-muted);
  padding: 0 8px;
}

th:first-child, td:first-child { width: 72px; min-width: 72px; max-width: 72px; }
th:first-child .th-cell { min-width: 0; }

/* 이름 컬럼 폭 축소 */
th:nth-child(2),
td:nth-child(2) {
  width: 12ch;
  min-width: 12ch;
  max-width: 14ch;
}

/* 학번 컬럼 폭 축소 */
th:nth-child(3),
td:nth-child(3) {
  width: 6ch;
  min-width: 6ch;
  max-width: 8ch;
}

/* 비고 컬럼 줄바꿈 */
th:nth-child(10),
td:nth-child(10) {
  width: 24ch;
  min-width: 20ch;
  max-width: 28ch;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
  overflow: hidden;
}

th:nth-child(8),
td:nth-child(8) {
  width: 8ch;
  min-width: 8ch;
  max-width: 10ch;
}

th:nth-child(9),
td:nth-child(9) {
  width: 8ch;
  min-width: 8ch;
  max-width: 10ch;
}

.cell-input, .num-input, .status-select {
  width: 100%;
  min-width: 84px;
  max-width: 100%;
  height: 32px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 8px;
  background: #fff;
  text-align: center;
  box-sizing: border-box;
}

.remark-cell-input {
  width: 100%;
  max-width: 100%;
  min-height: 44px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 8px;
  background: #fff;
  resize: none;
  box-sizing: border-box;
  text-align: left;
  overflow: auto;
}

/* 이름(2열), 비고(10열)을 제외한 나머지 열 폭 축소 */
th:not(:nth-child(2)):not(:nth-child(10)):not(:nth-child(11)) .th-cell {
  min-width: 6ch;
}


tbody td:not(:nth-child(2)):not(:nth-child(10)):not(:nth-child(11)) {
  width: 3ch;
  white-space: nowrap;
}

tbody td:not(:nth-child(2)):not(:nth-child(10)):not(:nth-child(11)) .cell-input,
tbody td:not(:nth-child(2)):not(:nth-child(10)):not(:nth-child(11)) .num-input,
tbody td:not(:nth-child(2)):not(:nth-child(10)):not(:nth-child(11)) .status-select {
  min-width: 3ch;
}

.delete-btn {
  height: 30px;
  border: 1px solid #dc2626;
  border-radius: 8px;
  background: #fee2e2;
  color: #991b1b;
  padding: 0 10px;
}

.inline-delete-btn {
  margin-top: 6px;
}

.action-col {
  width: 52px;
}

.trash-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff5f5;
  color: #dc2626;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 960px) {
  .toolbar { flex-direction: column; }
  .create-grid { grid-template-columns: 1fr 1fr; }
  .remark-input { grid-column: span 2; }
}
</style>
