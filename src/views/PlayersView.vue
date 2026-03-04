<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { RefreshCw, Users } from 'lucide-vue-next'
import { getMemberStatusDetail } from '../api/auth'
import { fetchPlayers, updatePlayer } from '../api/players'

const OFFENSE_OPTIONS = ['QB', 'RB', 'OL', 'TE', 'WR']
const DEFENSE_OPTIONS = ['DL', 'LB', 'C', 'S']
const SPECIAL_OPTIONS = ['K', 'S']
const STATUS_OPTIONS = ['재학', '휴학', '부상']

const keyword = ref('')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const players = ref([])

const editMode = ref(false)
const canEditPlayers = ref(false)
const myRole = ref('USER')

const editRows = reactive({})
const sortBy = reactive({
  number: 'none',
  name: 'none',
  offense: 'none',
  defense: 'none',
  special: 'none',
  status: 'none',
  heightCm: 'none',
  weightKg: 'none',
})
const openMenuKey = ref('')

const filteredPlayers = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  const base = !q
    ? [...players.value]
    : players.value.filter((p) => {
      const offense = (p.offensePositions || []).join(',').toLowerCase()
      const defense = (p.defensePositions || []).join(',').toLowerCase()
      const special = (p.specialPositions || []).join(',').toLowerCase()

      return (
        String(p.name ?? '').toLowerCase().includes(q) ||
        offense.includes(q) ||
        defense.includes(q) ||
        special.includes(q) ||
        String(p.number ?? '').includes(q)
      )
    })

  const orderedKeys = ['number', 'name', 'offense', 'defense', 'special', 'status', 'heightCm', 'weightKg']
  return base.sort((a, b) => {
    for (const key of orderedKeys) {
      const direction = sortBy[key]
      if (!direction || direction === 'none') continue
      const cmp = compareByKey(a, b, key, direction)
      if (cmp !== 0) return cmp
    }
    return 0
  })
})

function resetMessages() {
  errorMessage.value = ''
  actionMessage.value = ''
}

function ensureEditRows() {
  players.value.forEach((p) => {
    editRows[p.id] = {
      number: p.number == null ? '' : String(p.number),
      name: String(p.name ?? ''),
      status: p.status ?? '재학',
      offensePositions: Array.isArray(p.offensePositions) ? [...p.offensePositions] : [],
      defensePositions: Array.isArray(p.defensePositions) ? [...p.defensePositions] : [],
      specialPositions: Array.isArray(p.specialPositions) ? [...p.specialPositions] : [],
      heightCm: p.heightCm == null ? '' : String(p.heightCm),
      weightKg: p.weightKg == null ? '' : String(p.weightKg),
    }
  })
}

function togglePosition(playerId, key, value) {
  const row = editRows[playerId]
  if (!row) return

  const list = row[key]
  const idx = list.indexOf(value)
  if (idx >= 0) {
    list.splice(idx, 1)
  } else {
    list.push(value)
  }
}

function menuKey(playerId, key) {
  return `${playerId}:${key}`
}

function togglePositionMenu(playerId, key) {
  const mk = menuKey(playerId, key)
  openMenuKey.value = openMenuKey.value === mk ? '' : mk
}

function isPositionMenuOpen(playerId, key) {
  return openMenuKey.value === menuKey(playerId, key)
}

function getSortValue(player, key) {
  if (key === 'number') return Number(player.number ?? 0)
  if (key === 'name') return String(player.name ?? '')
  if (key === 'offense') return (player.offensePositions || []).join(',')
  if (key === 'defense') return (player.defensePositions || []).join(',')
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
  if (key === 'number' || key === 'heightCm' || key === 'weightKg') {
    const av = getSortValue(a, key)
    const bv = getSortValue(b, key)
    const cmp = compareValues(av, bv)
    return direction === 'desc' ? -cmp : cmp
  }

  if (key === 'name') {
    const av = String(a.name ?? '')
    const bv = String(b.name ?? '')
    const cmp = av.localeCompare(bv, 'ko')
    return direction === 'ko_desc' ? -cmp : cmp
  }

  if (key === 'offense' || key === 'defense') {
    const selected = String(direction)
    const listKey = key === 'offense' ? 'offensePositions' : 'defensePositions'
    const order = key === 'offense' ? OFFENSE_OPTIONS : DEFENSE_OPTIONS
    if (selected === 'group') {
      const getIndex = (item) => {
        const list = item[listKey] || []
        const indices = list.map((v) => order.indexOf(v)).filter((v) => v >= 0)
        if (indices.length === 0) return Number.MAX_SAFE_INTEGER
        return Math.min(...indices)
      }
      const ai = getIndex(a)
      const bi = getIndex(b)
      if (ai !== bi) return ai - bi
    } else {
      const aHas = (a[listKey] || []).includes(selected)
      const bHas = (b[listKey] || []).includes(selected)
      if (aHas !== bHas) return aHas ? -1 : 1
    }
    const av = (a[listKey] || []).join(',')
    const bv = (b[listKey] || []).join(',')
    return av.localeCompare(bv, 'ko')
  }

  if (key === 'status') {
    const selected = String(direction)
    const statusOrder = STATUS_OPTIONS
    const aStatus = String(a.status ?? '재학')
    const bStatus = String(b.status ?? '재학')
    if (selected === 'group') {
      const ai = statusOrder.indexOf(aStatus)
      const bi = statusOrder.indexOf(bStatus)
      if (ai !== bi) return ai - bi
      return aStatus.localeCompare(bStatus, 'ko')
    }
    const aHas = aStatus === selected
    const bHas = bStatus === selected
    if (aHas !== bHas) return aHas ? -1 : 1
    return aStatus.localeCompare(bStatus, 'ko')
  }

  const av = getSortValue(a, key)
  const bv = getSortValue(b, key)
  const cmp = compareValues(av, bv)
  return direction === 'desc' ? -cmp : cmp
}

function toNullableNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function sortedList(list) {
  return Array.isArray(list) ? [...list].sort() : []
}

function isSameList(a, b) {
  const aa = sortedList(a)
  const bb = sortedList(b)
  if (aa.length !== bb.length) return false
  return aa.every((v, i) => v === bb[i])
}

function isChanged(player, row) {
  const currentNumber = player.number == null ? null : Number(player.number)
  const nextNumber = toNullableNumber(row.number)
  const currentName = String(player.name ?? '').trim()
  const nextName = String(row.name ?? '').trim()
  const currentStatus = player.status ?? '재학'
  const nextStatus = row.status ?? '재학'
  const currentHeight = player.heightCm == null ? null : Number(player.heightCm)
  const nextHeight = toNullableNumber(row.heightCm)
  const currentWeight = player.weightKg == null ? null : Number(player.weightKg)
  const nextWeight = toNullableNumber(row.weightKg)

  return (
    currentNumber !== nextNumber ||
    currentName !== nextName ||
    currentStatus !== nextStatus ||
    currentHeight !== nextHeight ||
    currentWeight !== nextWeight ||
    !isSameList(player.offensePositions, row.offensePositions) ||
    !isSameList(player.defensePositions, row.defensePositions) ||
    !isSameList(player.specialPositions, row.specialPositions)
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
      const updatedNumber = toNullableNumber(row.number)
      await updatePlayer(player.id, {
        name: String(row.name ?? '').trim(),
        number: updatedNumber ?? Number(player.number ?? 0),
        status: row.status,
        offensePositions: row.offensePositions,
        defensePositions: row.defensePositions,
        specialPositions: row.specialPositions,
        heightCm: toNullableNumber(row.heightCm),
        weightKg: toNullableNumber(row.weightKg),
        age: player.age ?? null,
        studentNo: player.studentNo ?? '',
        department: player.department ?? '',
      })
    }

    if (changedCount === 0) {
      actionMessage.value = '변경된 내용이 없습니다.'
    } else {
      actionMessage.value = `${changedCount}명 선수 정보를 저장했습니다.`
    }

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
    openMenuKey.value = ''
    editMode.value = true
    return
  }

  const saved = await saveAllEdits()
  if (saved) {
    openMenuKey.value = ''
    editMode.value = false
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
</script>

<template>
  <main class="page">
    <header class="panel header-panel">
      <p class="eyebrow">Player Management</p>
      <h1><Users :size="22" :stroke-width="1.9" />선수 관리</h1>
      <p class="sub">선수 조회, 포지션/상태/신체 정보 편집을 처리합니다.</p>
      <p class="meta">내 권한: {{ myRole }}</p>
    </header>

    <section class="panel">
      <div class="toolbar">
        <input v-model="keyword" type="text" placeholder="이름, 번호, 포지션 검색">

        <button
          v-if="canEditPlayers"
          type="button"
          class="primary"
          :disabled="loading || saving"
          @click="toggleEditMode"
        >
          {{ saving ? '저장 중...' : editMode ? '편집 종료' : '편집' }}
        </button>

        <button type="button" :disabled="loading || saving" @click="loadPlayers">
          <RefreshCw :size="14" :stroke-width="1.9" />새로고침
        </button>
      </div>

      <p v-if="!canEditPlayers" class="notice">ADMIN, COACH만 선수 편집이 가능합니다.</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
      <p v-if="actionMessage" class="success">{{ actionMessage }}</p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <div class="th-cell">
                  <span>등번호</span>
                  <select v-model="sortBy.number" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="asc">오름차순</option>
                    <option value="desc">내림차순</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>이름</span>
                  <select v-model="sortBy.name" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="ko_asc">가나다순</option>
                    <option value="ko_desc">가나다 역순</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>오펜스</span>
                  <select v-model="sortBy.offense" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="group">포지션별</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>디펜스</span>
                  <select v-model="sortBy.defense" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="group">포지션별</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>스페셜</span>
                  <select v-model="sortBy.special" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="asc">오름차순</option>
                    <option value="desc">내림차순</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>상태</span>
                  <select v-model="sortBy.status" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="group">상태별</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>키(cm)</span>
                  <select v-model="sortBy.heightCm" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="asc">오름차순</option>
                    <option value="desc">내림차순</option>
                  </select>
                </div>
              </th>
              <th>
                <div class="th-cell">
                  <span>몸무게(kg)</span>
                  <select v-model="sortBy.weightKg" class="sort-select">
                    <option value="none">정렬</option>
                    <option value="asc">오름차순</option>
                    <option value="desc">내림차순</option>
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="player in filteredPlayers" :key="player.id">
              <td>
                <input v-if="editMode && canEditPlayers" v-model="editRows[player.id].number" type="number" class="num-input">
                <span v-else>{{ player.number }}</span>
              </td>

              <td>
                <input v-if="editMode && canEditPlayers" v-model="editRows[player.id].name" type="text" class="cell-input">
                <span v-else>{{ player.name }}</span>
              </td>

              <td>
                <div v-if="editMode && canEditPlayers" class="position-picker">
                  <button type="button" class="picker-trigger" @click="togglePositionMenu(player.id, 'offensePositions')">
                    <span v-if="editRows[player.id].offensePositions.length === 0" class="placeholder">옵션 선택</span>
                    <span
                      v-for="opt in editRows[player.id].offensePositions"
                      :key="`off-tag-${player.id}-${opt}`"
                      class="chip active"
                    >
                      {{ opt }}
                    </span>
                  </button>
                  <div v-if="isPositionMenuOpen(player.id, 'offensePositions')" class="picker-menu">
                    <button
                      v-for="opt in OFFENSE_OPTIONS"
                      :key="`off-${player.id}-${opt}`"
                      type="button"
                      class="picker-option"
                      :class="{ selected: editRows[player.id].offensePositions.includes(opt) }"
                      @click.stop="togglePosition(player.id, 'offensePositions', opt)"
                    >
                      {{ opt }}
                    </button>
                  </div>
                </div>
                <span v-else>{{ (player.offensePositions || []).join(', ') || '-' }}</span>
              </td>

              <td>
                <div v-if="editMode && canEditPlayers" class="position-picker">
                  <button type="button" class="picker-trigger" @click="togglePositionMenu(player.id, 'defensePositions')">
                    <span v-if="editRows[player.id].defensePositions.length === 0" class="placeholder">옵션 선택</span>
                    <span
                      v-for="opt in editRows[player.id].defensePositions"
                      :key="`def-tag-${player.id}-${opt}`"
                      class="chip active"
                    >
                      {{ opt }}
                    </span>
                  </button>
                  <div v-if="isPositionMenuOpen(player.id, 'defensePositions')" class="picker-menu">
                    <button
                      v-for="opt in DEFENSE_OPTIONS"
                      :key="`def-${player.id}-${opt}`"
                      type="button"
                      class="picker-option"
                      :class="{ selected: editRows[player.id].defensePositions.includes(opt) }"
                      @click.stop="togglePosition(player.id, 'defensePositions', opt)"
                    >
                      {{ opt }}
                    </button>
                  </div>
                </div>
                <span v-else>{{ (player.defensePositions || []).join(', ') || '-' }}</span>
              </td>

              <td>
                <div v-if="editMode && canEditPlayers" class="position-picker">
                  <button type="button" class="picker-trigger" @click="togglePositionMenu(player.id, 'specialPositions')">
                    <span v-if="editRows[player.id].specialPositions.length === 0" class="placeholder">옵션 선택</span>
                    <span
                      v-for="opt in editRows[player.id].specialPositions"
                      :key="`sp-tag-${player.id}-${opt}`"
                      class="chip active"
                    >
                      {{ opt }}
                    </span>
                  </button>
                  <div v-if="isPositionMenuOpen(player.id, 'specialPositions')" class="picker-menu">
                    <button
                      v-for="opt in SPECIAL_OPTIONS"
                      :key="`sp-${player.id}-${opt}`"
                      type="button"
                      class="picker-option"
                      :class="{ selected: editRows[player.id].specialPositions.includes(opt) }"
                      @click.stop="togglePosition(player.id, 'specialPositions', opt)"
                    >
                      {{ opt }}
                    </button>
                  </div>
                </div>
                <span v-else>{{ (player.specialPositions || []).join(', ') || '-' }}</span>
              </td>

              <td>
                <select v-if="editMode && canEditPlayers" v-model="editRows[player.id].status" class="status-select">
                  <option v-for="opt in STATUS_OPTIONS" :key="`status-${player.id}-${opt}`" :value="opt">{{ opt }}</option>
                </select>
                <span v-else class="status-chip" :class="`status-${(player.status || '재학')}`">
                  {{ player.status || '재학' }}
                </span>
              </td>

              <td>
                <input v-if="editMode && canEditPlayers" v-model="editRows[player.id].heightCm" type="number" class="num-input">
                <span v-else>{{ player.heightCm ?? '-' }}</span>
              </td>

              <td>
                <input v-if="editMode && canEditPlayers" v-model="editRows[player.id].weightKg" type="number" class="num-input">
                <span v-else>{{ player.weightKg ?? '-' }}</span>
              </td>
            </tr>

            <tr v-if="!loading && filteredPlayers.length === 0">
              <td colspan="8">데이터가 없습니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 1180px;
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

.eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: var(--kw-text-soft);
  text-transform: uppercase;
}

.header-panel h1 {
  margin: 6px 0 8px;
  font-size: 28px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sub {
  margin: 0;
  color: var(--kw-text-muted);
}

.meta {
  margin: 8px 0 0;
  color: var(--kw-text-soft);
  font-size: 13px;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar input {
  flex: 1;
  height: 40px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
}

.toolbar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  border: 1px solid var(--kw-line-strong);
  border-radius: var(--kw-radius-sm);
  padding: 0 12px;
  background: var(--kw-surface);
}

.toolbar .primary {
  background: var(--kw-primary);
  border-color: var(--kw-primary);
  color: var(--kw-primary-contrast);
}

.th-cell {
  display: grid;
  gap: 4px;
  min-width: 120px;
}

.sort-select {
  height: 28px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  background: #fff;
  font-size: 12px;
  color: var(--kw-text-muted);
  padding: 0 8px;
}

.notice {
  margin: 0 0 10px;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
}

.error {
  margin: 0 0 10px;
  color: var(--kw-danger-text);
  font-size: 13px;
}

.success {
  margin: 0 0 10px;
  color: var(--kw-success-text);
  font-size: 13px;
}

.table-wrap {
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-md);
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 11px 12px;
  border-bottom: 1px solid #eceff3;
  text-align: left;
  font-size: 14px;
  vertical-align: top;
}

th {
  background: var(--kw-surface-muted);
  color: var(--kw-text-muted);
  font-weight: 600;
}

.cell-input,
.num-input {
  width: 100%;
  min-width: 80px;
  height: 32px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 8px;
}

.toggle-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 120px;
}

.chip {
  height: 28px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 6px;
  background: #fff;
  color: var(--kw-text);
  padding: 0 8px;
  font-size: 12px;
}

.chip.active {
  border-color: var(--kw-line-strong);
  background: #fff;
  color: var(--kw-text);
}

.position-picker {
  position: relative;
  min-width: 150px;
}

.picker-trigger {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 8px;
}

.placeholder {
  color: #94a3b8;
  font-size: 12px;
}

.picker-menu {
  position: absolute;
  z-index: 5;
  top: calc(100% + 6px);
  left: 0;
  width: 220px;
  border: 1px solid var(--kw-line);
  border-radius: 12px;
  background: #fff;
  box-shadow: var(--kw-shadow-card);
  padding: 8px;
  display: grid;
  gap: 6px;
}

.picker-option {
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  text-align: left;
  padding: 0 10px;
  font-size: 13px;
}

.picker-option.selected {
  border-color: var(--kw-line-strong);
}

.status-select {
  width: 100%;
  min-width: 96px;
  height: 32px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 6px;
  background: #fff;
  padding: 0 8px;
}

.status-chip {
  display: inline-block;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
}

.status-재학 {
  border-color: var(--kw-success-line);
  background: var(--kw-success-bg);
  color: var(--kw-success-text);
}

.status-휴학 {
  border-color: #f59e0b;
  background: #fff7ed;
  color: #b45309;
}

.status-부상 {
  border-color: var(--kw-danger-line);
  background: var(--kw-danger-bg);
  color: #991b1b;
}

@media (max-width: 960px) {
  .toolbar {
    flex-direction: column;
  }
}
</style>
