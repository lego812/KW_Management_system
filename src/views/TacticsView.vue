<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Check,
  CircleDot,
  Eraser,
  GitBranch,
  ListFilter,
  NotebookPen,
  Plus,
  RefreshCw,
  Save,
  Undo2,
  Users,
} from 'lucide-vue-next'
import { fetchPlayers } from '../api/players'
import {
  applyBoardVersion,
  clonePlaybook,
  createPlaybook,
  createTacticBoard,
  deletePlaybook,
  deleteTacticBoard,
  fetchBoardState,
  fetchBoardVersions,
  fetchPlaybooks,
  fetchTacticsByBook,
  saveBoardState,
  saveBoardVersion,
  updateTacticBoardMeta,
} from '../api/tactics'

const category = ref('ALL')
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
const tactics = ref([])
const playbooks = ref([])
const playersPool = ref([])
const versions = ref([])

const selectedBookId = ref('')
const selectedBoardId = ref('')
const selectedNodeId = ref('')
const selectedPlayerId = ref('')

const tool = ref('select')
const lineStyle = ref('SOLID')
const routeDraft = ref(null)
const routePreview = ref(null)
const draggingNodeId = ref('')
const draggingPointerId = ref(null)
const dragMoved = ref(false)
const suppressFieldClick = ref(false)

const fieldRef = ref(null)

const createForm = reactive({
  title: '',
  category: 'OFFENSE',
  summary: '',
  roleDescription: '',
  tags: '',
})

const createBookForm = reactive({
  title: '',
  description: '',
})
const showCreateBookModal = ref(false)
const showCreateTacticModal = ref(false)

const boardMetaForm = reactive({
  title: '',
  category: 'OFFENSE',
  summary: '',
  roleDescription: '',
})

const versionMessage = ref('')

const boardState = ref(createEmptyState())

const DRAW_TOOLS = ['run', 'pass', 'block', 'other']
const PLAYER_ICON_TYPES = ['CIRCLE', 'TRIANGLE', 'SQUARE', 'X']
const TWINS_COWBOY_PRESET = [
  { x: 0.08, y: 0.36 },
  { x: 0.24, y: 0.30 },
  { x: 0.26, y: 0.44 },
  { x: 0.34, y: 0.42 },
  { x: 0.40, y: 0.42 },
  { x: 0.46, y: 0.42 },
  { x: 0.52, y: 0.42 },
  { x: 0.58, y: 0.42 },
  { x: 0.66, y: 0.30 },
  { x: 0.80, y: 0.36 },
  { x: 0.92, y: 0.38 },
]
const toolItems = [
  { id: 'select', label: '선택/이동' },
  { id: 'run', label: 'Run' },
  { id: 'pass', label: 'Pass' },
  { id: 'block', label: 'Block' },
  { id: 'other', label: 'Other' },
  { id: 'text', label: 'Text' },
]

function createEmptyState() {
  return {
    activeFormationId: '',
    players: [],
    drawings: [],
    annotations: [],
  }
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function clamp01(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function percent(v) {
  return `${clamp01(v) * 100}%`
}

function formatDate(value) {
  if (!value) return '-'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ko-KR')
}

const selectedBoard = computed(() => tactics.value.find((item) => item.id === selectedBoardId.value) ?? null)
const selectedBook = computed(() => playbooks.value.find((item) => item.id === selectedBookId.value) ?? null)
const selectedNode = computed(() => boardState.value.players.find((p) => p.nodeId === selectedNodeId.value) ?? null)
const playbookSearch = ref('')
const playbookSort = ref('desc')

function timeMs(value) {
  if (!value) return 0
  if (typeof value?.toDate === 'function') return value.toDate().getTime()
  const n = new Date(value).getTime()
  return Number.isFinite(n) ? n : 0
}

const filteredPlaybooks = computed(() => {
  const q = playbookSearch.value.trim().toLowerCase()
  const rows = !q
    ? [...playbooks.value]
    : playbooks.value.filter((book) => {
    const title = String(book?.title ?? '').toLowerCase()
    const desc = String(book?.description ?? '').toLowerCase()
    return title.includes(q) || desc.includes(q)
  })

  rows.sort((a, b) => {
    if (playbookSort.value === 'asc') return timeMs(a?.updatedAt) - timeMs(b?.updatedAt)
    return timeMs(b?.updatedAt) - timeMs(a?.updatedAt)
  })

  return rows
})

const routeRows = computed(() =>
  boardState.value.drawings.map((item) => ({
    ...item,
    nodeLabel:
      boardState.value.players.find((p) => p.nodeId === item.fromNodeId)?.label ||
      boardState.value.players.find((p) => p.nodeId === item.fromNodeId)?.nodeId ||
      '-',
  })),
)

const activeDraftPoints = computed(() => {
  if (!routeDraft.value) return []
  const points = [...routeDraft.value.points]
  if (routePreview.value) points.push(routePreview.value)
  return points
})

async function loadTactics() {
  if (!selectedBookId.value) {
    tactics.value = []
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    tactics.value = await fetchTacticsByBook(selectedBookId.value, category.value)
  } catch (error) {
    errorMessage.value = error?.message ?? '전술 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadPlaybooks() {
  loading.value = true
  errorMessage.value = ''
  try {
    playbooks.value = await fetchPlaybooks()
  } catch (error) {
    errorMessage.value = error?.message ?? '전술집 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

async function onCreatePlaybook() {
  if (!createBookForm.title.trim()) {
    errorMessage.value = '전술집명을 입력해주세요.'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    const ref = await createPlaybook({
      title: createBookForm.title.trim(),
      description: createBookForm.description.trim(),
    })
    createBookForm.title = ''
    createBookForm.description = ''
    showCreateBookModal.value = false
    actionMessage.value = '전술집을 생성했습니다.'
    selectedBookId.value = ref.id
    try {
      await loadPlaybooks()
      await loadTactics()
    } catch {
      // Keep success state even if list refresh fails temporarily (e.g. index building).
    }
  } catch (error) {
    errorMessage.value = error?.message ?? '전술집 생성에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

function openCreatePlaybookModal() {
  createBookForm.title = ''
  createBookForm.description = ''
  showCreateBookModal.value = true
}

function closeCreatePlaybookModal() {
  showCreateBookModal.value = false
}

function openCreateTacticModal() {
  if (!selectedBookId.value) {
    errorMessage.value = '전술집을 먼저 선택해주세요.'
    return
  }
  showCreateTacticModal.value = true
}

function closeCreateTacticModal() {
  showCreateTacticModal.value = false
}

async function onClonePlaybook() {
  if (!selectedBookId.value) return
  loading.value = true
  errorMessage.value = ''
  try {
    const ref = await clonePlaybook(selectedBookId.value)
    await loadPlaybooks()
    selectedBookId.value = ref.id
    await loadTactics()
    selectedBoardId.value = ''
    actionMessage.value = '전술집을 복제했습니다.'
  } catch (error) {
    errorMessage.value = error?.message ?? '전술집 복제에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function onDeletePlaybook() {
  if (!selectedBookId.value) return
  const ok = window.confirm('현재 전술집과 내부 작전을 삭제할까요?')
  if (!ok) return
  loading.value = true
  errorMessage.value = ''
  try {
    await deletePlaybook(selectedBookId.value)
    selectedBookId.value = ''
    selectedBoardId.value = ''
    await loadPlaybooks()
    await loadTactics()
    actionMessage.value = '전술집을 삭제했습니다.'
  } catch (error) {
    errorMessage.value = error?.message ?? '전술집 삭제에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function loadPlayers() {
  try {
    playersPool.value = await fetchPlayers()
    if (!selectedPlayerId.value && playersPool.value.length > 0) {
      selectedPlayerId.value = playersPool.value[0].id
    }
  } catch {
    playersPool.value = []
  }
}

async function onCreateBoard() {
  if (!selectedBookId.value) {
    errorMessage.value = '먼저 전술집을 선택해주세요.'
    return
  }

  if (!createForm.title.trim()) {
    errorMessage.value = '전술명을 입력해주세요.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    const tags = createForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)

    const ref = await createTacticBoard({
      title: createForm.title.trim(),
      category: createForm.category,
      summary: createForm.summary.trim(),
      roleDescription: createForm.roleDescription.trim(),
      bookId: selectedBookId.value,
      tags,
      initialState: createEmptyState(),
    })

    actionMessage.value = '작전을 생성했습니다.'
    createForm.title = ''
    createForm.summary = ''
    createForm.roleDescription = ''
    createForm.tags = ''
    showCreateTacticModal.value = false
    await loadTactics()
    await openBoard(ref.id)
  } catch (error) {
    errorMessage.value = error?.message ?? '전술 생성에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function openBoard(boardId) {
  selectedBoardId.value = boardId
  selectedNodeId.value = ''
  tool.value = 'select'
  routeDraft.value = null
  routePreview.value = null
  loading.value = true
  errorMessage.value = ''

  try {
    const [state, versionRows] = await Promise.all([fetchBoardState(boardId), fetchBoardVersions(boardId)])
    boardState.value = {
      activeFormationId: String(state.activeFormationId ?? ''),
      players: Array.isArray(state.players) ? state.players : [],
      drawings: Array.isArray(state.drawings) ? state.drawings : [],
      annotations: Array.isArray(state.annotations) ? state.annotations : [],
    }
    const meta = tactics.value.find((row) => row.id === boardId)
    boardMetaForm.title = String(meta?.title ?? '')
    boardMetaForm.category = String(meta?.category ?? 'OFFENSE')
    boardMetaForm.summary = String(meta?.summary ?? '')
    boardMetaForm.roleDescription = String(meta?.roleDescription ?? '')
    versions.value = versionRows
  } catch (error) {
    errorMessage.value = error?.message ?? '보드를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function normalizePoint(evt) {
  const field = fieldRef.value
  if (!field) return { x: 0.5, y: 0.5 }
  const rect = field.getBoundingClientRect()
  const x = (evt.clientX - rect.left) / rect.width
  const y = (evt.clientY - rect.top) / rect.height
  return { x: clamp01(x), y: clamp01(y) }
}

function onFieldPointerMove(evt) {
  if (draggingNodeId.value) {
    if (draggingPointerId.value !== null && evt.pointerId !== draggingPointerId.value) return
    const point = normalizePoint(evt)
    const target = boardState.value.players.find((p) => p.nodeId === draggingNodeId.value)
    if (!target) return
    dragMoved.value = true
    target.pos = point
    return
  }

  if (routeDraft.value) {
    routePreview.value = normalizePoint(evt)
  }
}

function onFieldPointerUp(evt) {
  if (draggingPointerId.value !== null && evt?.pointerId !== draggingPointerId.value) return
  if (dragMoved.value) {
    suppressFieldClick.value = true
    window.setTimeout(() => {
      suppressFieldClick.value = false
    }, 0)
  }
  draggingNodeId.value = ''
  draggingPointerId.value = null
  dragMoved.value = false
}

function onPlayerPointerDown(evt, nodeId) {
  if (tool.value !== 'select') return
  selectedNodeId.value = nodeId
  draggingNodeId.value = nodeId
  draggingPointerId.value = evt.pointerId
  dragMoved.value = false
  evt.currentTarget?.setPointerCapture?.(evt.pointerId)
  evt.preventDefault()
}

function startDraft(point) {
  const fromNode = selectedNode.value
  const type = toolToDrawingType(tool.value)
  const marker = markerByTool(tool.value)
  if (!type) return

  if (fromNode) {
    routeDraft.value = {
      drawId: makeId('d'),
      type,
      style: lineStyle.value,
      fromNodeId: fromNode.nodeId,
      marker,
      points: [
        { x: clamp01(fromNode.pos.x), y: clamp01(fromNode.pos.y) },
        point,
      ],
    }
  } else {
    routeDraft.value = {
      drawId: makeId('d'),
      type,
      style: lineStyle.value,
      fromNodeId: '',
      marker,
      points: [point],
    }
  }
}

function onFieldClick(evt) {
  if (!selectedBoardId.value) return
  if (suppressFieldClick.value) return
  const point = normalizePoint(evt)

  if (tool.value === 'text') {
    boardState.value.annotations.push({
      annotationId: makeId('a'),
      text: 'Text',
      pos: point,
    })
    return
  }

  if (!DRAW_TOOLS.includes(tool.value)) return

  if (!routeDraft.value) {
    startDraft(point)
    return
  }

  routeDraft.value.points.push(point)
}

function onFieldDoubleClick() {
  if (!routeDraft.value) return
  const points = routeDraft.value.points
  if (points.length < 2) {
    routeDraft.value = null
    routePreview.value = null
    return
  }

  boardState.value.drawings.push({
    ...routeDraft.value,
    points: points.map((p) => ({ x: clamp01(p.x), y: clamp01(p.y) })),
  })
  routeDraft.value = null
  routePreview.value = null
}

function cancelDraft() {
  routeDraft.value = null
  routePreview.value = null
}

function toolToDrawingType(mode) {
  if (mode === 'run') return 'RUN'
  if (mode === 'pass') return 'PASS'
  if (mode === 'block') return 'BLOCK'
  if (mode === 'other') return 'OTHER'
  return ''
}

function markerByTool(mode) {
  if (mode === 'pass' || mode === 'run') return 'ARROW'
  if (mode === 'block') return 'T'
  return 'NONE'
}

function addPlayerNode() {
  if (!selectedBoardId.value || !selectedPlayerId.value) return
  const player = playersPool.value.find((item) => item.id === selectedPlayerId.value)
  if (!player) return

  const node = {
    nodeId: makeId('n'),
    playerId: player.id,
    label: String(player.number ?? player.name ?? '').trim(),
    iconType: 'CIRCLE',
    pos: { x: 0.5, y: 0.5 },
    rotation: 0,
  }

  boardState.value.players.push(node)
  selectedNodeId.value = node.nodeId
}

function applyTwinsCowboyPreset() {
  if (boardState.value.players.length === 0) return

  boardState.value.players.forEach((node, idx) => {
    const point = TWINS_COWBOY_PRESET[idx]
    if (!point) return
    node.pos = { x: point.x, y: point.y }
  })

  actionMessage.value = 'TWINS COWBOY 기본 배치를 적용했습니다.'
}

function setSelectedNodeIcon(iconType) {
  if (!selectedNode.value) return
  if (!PLAYER_ICON_TYPES.includes(iconType)) return
  selectedNode.value.iconType = iconType
}

function nodeText(node) {
  if (String(node?.iconType ?? '') === 'X') return 'X'
  return node?.label || 'N'
}

function removeSelectedNode() {
  if (!selectedNodeId.value) return
  const targetId = selectedNodeId.value
  boardState.value.players = boardState.value.players.filter((node) => node.nodeId !== targetId)
  boardState.value.drawings = boardState.value.drawings.filter((row) => row.fromNodeId !== targetId)
  selectedNodeId.value = ''
}

function removeDrawing(drawId) {
  boardState.value.drawings = boardState.value.drawings.filter((d) => d.drawId !== drawId)
}

function removeAnnotation(annotationId) {
  boardState.value.annotations = boardState.value.annotations.filter((a) => a.annotationId !== annotationId)
}

function drawingPath(points) {
  if (!Array.isArray(points) || points.length < 2) return ''
  return points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${clamp01(p.x) * 100} ${clamp01(p.y) * 100}`)
    .join(' ')
}

function drawingColor(type) {
  if (type === 'RUN') return '#111827'
  if (type === 'PASS') return '#374151'
  if (type === 'OTHER') return '#6b7280'
  if (type === 'BLOCK') return '#111827'
  return '#111827'
}

async function onSaveCurrent() {
  if (!selectedBoardId.value) return
  saving.value = true
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    await updateTacticBoardMeta(selectedBoardId.value, boardMetaForm)
    await saveBoardState(selectedBoardId.value, boardState.value)
    actionMessage.value = '현재 보드 상태를 저장했습니다.'
    await loadTactics()
    selectedBoardId.value = ''
  } catch (error) {
    errorMessage.value = error?.message ?? '현재 상태 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function onSaveVersion() {
  if (!selectedBoardId.value) return
  saving.value = true
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    await updateTacticBoardMeta(selectedBoardId.value, boardMetaForm)
    await saveBoardState(selectedBoardId.value, boardState.value)
    const result = await saveBoardVersion(selectedBoardId.value, versionMessage.value)
    versionMessage.value = ''
    actionMessage.value = `버전 v${result.version} 저장 완료`
    versions.value = await fetchBoardVersions(selectedBoardId.value)
    await loadTactics()
    selectedBoardId.value = ''
  } catch (error) {
    errorMessage.value = error?.message ?? '버전 저장에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function onApplyVersion(versionId) {
  if (!selectedBoardId.value) return
  const ok = window.confirm('선택한 버전으로 복원할까요? 현재 편집 내용은 덮어쓰기 됩니다.')
  if (!ok) return

  saving.value = true
  errorMessage.value = ''
  actionMessage.value = ''

  try {
    await applyBoardVersion(selectedBoardId.value, versionId)
    await openBoard(selectedBoardId.value)
    actionMessage.value = '버전 복원이 완료되었습니다.'
  } catch (error) {
    errorMessage.value = error?.message ?? '버전 복원에 실패했습니다.'
  } finally {
    saving.value = false
  }
}

async function onRefresh() {
  if (selectedBoardId.value) {
    await openBoard(selectedBoardId.value)
    return
  }
  await loadPlaybooks()
  await loadTactics()
}

async function onDeleteBoard(boardId) {
  const ok = window.confirm('이 작전을 삭제할까요?')
  if (!ok) return

  loading.value = true
  errorMessage.value = ''
  try {
    await deleteTacticBoard(boardId)
    if (selectedBoardId.value === boardId) {
      selectedBoardId.value = ''
    }
    await loadTactics()
    actionMessage.value = '작전을 삭제했습니다.'
  } catch (error) {
    errorMessage.value = error?.message ?? '작전 삭제에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

function onSelectPlaybook(bookId) {
  selectedBookId.value = String(bookId ?? '')
  selectedBoardId.value = ''
  loadTactics()
}

onMounted(async () => {
  await Promise.all([loadPlaybooks(), loadPlayers()])
})
</script>

<template>
  <main class="page">
    <header class="panel header-panel">
      <p class="eyebrow">Tactical Board</p>
      <h1><NotebookPen :size="22" :stroke-width="1.9" />전술 보드</h1>
      <p class="sub">보드 생성, 선수 배치, Route/Pass/Fake/Block 작성, 버전 저장과 복원을 처리합니다.</p>
    </header>

    <section class="layout">
      <aside class="panel left-panel">
        <div class="left-head">
          <h2>전술집</h2>
          <div class="left-controls">
            <input v-model="playbookSearch" type="text" placeholder="전술집 검색" />
            <select v-model="playbookSort">
              <option value="desc">최신순</option>
              <option value="asc">오래된순</option>
            </select>
          </div>
        </div>
        <div class="board-list">
          <button
            v-for="book in filteredPlaybooks"
            :key="book.id"
            type="button"
            class="board-item"
            :class="{ active: selectedBookId === book.id }"
            @click="onSelectPlaybook(book.id)"
          >
            <strong>{{ book.title }}</strong>
            <span v-if="book.description" class="book-desc">{{ book.description }}</span>
            <span>생성 {{ formatDate(book.createdAt) }} | 수정 {{ formatDate(book.updatedAt) }}</span>
          </button>
          <p v-if="!loading && playbooks.length === 0" class="empty">등록된 전술집이 없습니다.</p>
          <p v-else-if="!loading && filteredPlaybooks.length === 0" class="empty">검색 결과가 없습니다.</p>
        </div>

        <p v-if="!selectedBookId" class="empty">전술집을 선택하면 우측에 전술 테이블이 표시됩니다.</p>
      </aside>

      <section class="panel editor-panel">
        <div v-if="!selectedBoardId" class="tactic-table-panel">
          <div class="table-toolbar">
            <label class="filter">
              <span>전술집</span>
              <select v-model="selectedBookId" @change="onSelectPlaybook(selectedBookId)">
                <option value="">선택하세요</option>
                <option v-for="book in playbooks" :key="book.id" :value="book.id">{{ book.title }}</option>
              </select>
            </label>
            <label class="filter">
              <ListFilter :size="14" :stroke-width="1.9" />
              <select v-model="category" @change="loadTactics">
                <option value="ALL">전체</option>
                <option value="OFFENSE">OFFENSE</option>
                <option value="DEFENSE">DEFENSE</option>
                <option value="SPECIAL">SPECIAL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <button type="button" class="primary" :disabled="loading || saving" @click="openCreatePlaybookModal">전술집 생성</button>
            <button type="button" :disabled="!selectedBookId || loading || saving" @click="onClonePlaybook">전술집 복제</button>
            <button type="button" class="danger" :disabled="!selectedBookId || loading || saving" @click="onDeletePlaybook">전술집 삭제</button>
            <button type="button" class="primary" :disabled="!selectedBookId || loading || saving" @click="openCreateTacticModal">작전 생성</button>
            <button type="button" :disabled="loading || saving" @click="onRefresh">
              <RefreshCw :size="14" :stroke-width="1.9" />새로고침
            </button>
          </div>

          <div class="tactic-table-wrap">
            <table class="tactic-table">
              <thead>
                <tr>
                  <th>작전명</th>
                  <th>종류</th>
                  <th>개요</th>
                  <th>수정일</th>
                  <th>버전</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in tactics" :key="item.id">
                  <td>{{ item.title }}</td>
                  <td>{{ item.category }}</td>
                  <td>{{ item.summary || '-' }}</td>
                  <td>{{ formatDate(item.updatedAt) }}</td>
                  <td>v{{ item.lastPublishedVersion ?? 0 }}</td>
                  <td class="actions-cell">
                    <button type="button" class="small" @click="openBoard(item.id)">수정</button>
                    <button type="button" class="small danger" @click="onDeleteBoard(item.id)">삭제</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p v-if="!selectedBookId" class="empty">전술집을 선택하면 전술이 표시됩니다.</p>
          <p v-else-if="!loading && tactics.length === 0" class="empty">등록된 전술이 없습니다.</p>
        </div>

        <template v-else>
          <div class="editor-head">
            <div>
              <h2>{{ selectedBoard?.title }}</h2>
              <p class="meta">카테고리: {{ selectedBoard?.category }} / 버전: v{{ selectedBoard?.lastPublishedVersion ?? 0 }}</p>
              <p class="meta">소속 전술집: {{ selectedBook?.title || '-' }}</p>
            </div>
            <div class="save-actions">
              <button type="button" :disabled="saving" @click="onSaveCurrent">
                <Save :size="14" :stroke-width="1.9" />현재 저장</button>
              <button type="button" class="primary" :disabled="saving" @click="onSaveVersion">
                <Check :size="14" :stroke-width="1.9" />버전 저장</button>
            </div>
          </div>

          <div class="meta-form">
            <label>
              <span>작전명</span>
              <input v-model="boardMetaForm.title" type="text" />
            </label>
            <label>
              <span>작전종류</span>
              <select v-model="boardMetaForm.category">
                <option value="OFFENSE">OFFENSE</option>
                <option value="DEFENSE">DEFENSE</option>
                <option value="SPECIAL">SPECIAL</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>
            <label>
              <span>작전개요</span>
              <input v-model="boardMetaForm.summary" type="text" />
            </label>
            <label>
              <span>포지션별 역할설명</span>
              <input v-model="boardMetaForm.roleDescription" type="text" />
            </label>
          </div>

          <div class="control-row">
            <div class="tool-group">
              <button
                v-for="item in toolItems"
                :key="item.id"
                type="button"
                class="tool-btn"
                :class="{ active: tool === item.id }"
                @click="tool = item.id"
              >
                {{ item.label }}
              </button>
              <button v-if="routeDraft" type="button" class="tool-btn danger" @click="cancelDraft">
                <Undo2 :size="13" :stroke-width="1.9" />드래프트 취소
              </button>
            </div>

            <div class="formation-input">
              <span>선 스타일</span>
              <select v-model="lineStyle">
                <option value="SOLID">실선</option>
                <option value="DASHED">점선</option>
              </select>
              <span>포메이션 ID</span>
              <input v-model="boardState.activeFormationId" type="text" placeholder="formation_shotgun">
            </div>
          </div>

          <div class="node-row">
            <label>
              <span>선수 선택</span>
              <select v-model="selectedPlayerId">
                <option v-for="player in playersPool" :key="player.id" :value="player.id">
                  {{ player.number }} {{ player.name }}
                </option>
              </select>
            </label>
            <button type="button" @click="addPlayerNode">
              <Users :size="14" :stroke-width="1.9" />선수 노드 추가
            </button>
            <button type="button" class="secondary" :disabled="boardState.players.length === 0" @click="applyTwinsCowboyPreset">
              TWINS COWBOY 배치
            </button>
            <button type="button" class="danger" :disabled="!selectedNodeId" @click="removeSelectedNode">
              <Eraser :size="14" :stroke-width="1.9" />선택 노드 삭제
            </button>
          </div>

          <div class="shape-row">
            <span>선수 모양</span>
            <button
              v-for="icon in PLAYER_ICON_TYPES"
              :key="icon"
              type="button"
              class="small"
              :disabled="!selectedNodeId"
              @click="setSelectedNodeIcon(icon)"
            >
              {{ icon }}
            </button>
          </div>

          <div class="play-card">
            <div class="play-title">
              <span>{{ selectedBoard?.title || 'PLAYBOARD' }}</span>
            </div>
            <div
              ref="fieldRef"
              class="field"
              @click="onFieldClick"
              @dblclick="onFieldDoubleClick"
              @pointermove="onFieldPointerMove"
              @pointerup="onFieldPointerUp"
              @pointerleave="onFieldPointerUp"
            >
              <svg class="draw-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path
                v-for="draw in boardState.drawings"
                :key="draw.drawId"
                :d="drawingPath(draw.points)"
                :stroke="drawingColor(draw.type)"
                :stroke-dasharray="draw.style === 'DASHED' ? '2 2' : ''"
                stroke-width="0.6"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                v-if="activeDraftPoints.length > 1"
                :d="drawingPath(activeDraftPoints)"
                stroke="#1f2937"
                stroke-width="0.5"
                stroke-dasharray="1 1.2"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              </svg>

              <button
                v-for="node in boardState.players"
                :key="node.nodeId"
                type="button"
                class="node"
                :class="[
                  { active: selectedNodeId === node.nodeId },
                  `icon-${String(node.iconType || 'CIRCLE').toLowerCase()}`,
                ]"
                :style="{ left: percent(node.pos.x), top: percent(node.pos.y) }"
                @pointerdown="onPlayerPointerDown($event, node.nodeId)"
                @click.stop="selectedNodeId = node.nodeId"
              >
                {{ nodeText(node) }}
              </button>

              <div
                v-for="note in boardState.annotations"
                :key="note.annotationId"
                class="annotation"
                :style="{ left: percent(note.pos.x), top: percent(note.pos.y) }"
              >
                {{ note.text }}
              </div>
            </div>
          </div>

          <div class="bottom-grid">
            <div class="call-column">
              <section class="sub-panel">
                <h3><GitBranch :size="14" :stroke-width="1.9" />그려진 라인</h3>
                <ul>
                  <li v-for="row in routeRows" :key="row.drawId">
                    <span>{{ row.type }} / 시작 노드: {{ row.nodeLabel }} / 점 {{ row.points?.length ?? 0 }}개</span>
                    <button type="button" class="danger small" @click="removeDrawing(row.drawId)">삭제</button>
                  </li>
                  <li v-if="routeRows.length === 0" class="empty">라인이 없습니다.</li>
                </ul>
              </section>

              <section class="sub-panel">
                <h3><CircleDot :size="14" :stroke-width="1.9" />텍스트 주석</h3>
                <ul>
                  <li v-for="note in boardState.annotations" :key="note.annotationId">
                    <input v-model="note.text" type="text">
                    <button type="button" class="danger small" @click="removeAnnotation(note.annotationId)">삭제</button>
                  </li>
                  <li v-if="boardState.annotations.length === 0" class="empty">주석이 없습니다.</li>
                </ul>
              </section>
            </div>

            <div class="call-column">
              <section class="sub-panel">
                <h3>버전 히스토리</h3>
                <div class="version-save">
                  <input v-model="versionMessage" type="text" placeholder="버전 메시지">
                  <button type="button" class="primary" :disabled="saving" @click="onSaveVersion">버전 저장</button>
                </div>
                <ul>
                  <li v-for="v in versions" :key="v.id">
                    <span>v{{ v.version }} - {{ v.message || '-' }}</span>
                    <button type="button" class="small" :disabled="saving" @click="onApplyVersion(v.id)">복원</button>
                  </li>
                  <li v-if="versions.length === 0" class="empty">저장된 버전이 없습니다.</li>
                </ul>
              </section>
            </div>
          </div>
        </template>
      </section>
    </section>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    <p v-if="actionMessage" class="success">{{ actionMessage }}</p>

    <div v-if="showCreateTacticModal" class="modal-backdrop" @click.self="closeCreateTacticModal">
      <form class="modal-panel" @submit.prevent="onCreateBoard">
        <h3>작전 생성</h3>
        <label>
          <span>작전명</span>
          <input v-model="createForm.title" type="text" />
        </label>
        <label>
          <span>작전종류</span>
          <select v-model="createForm.category">
            <option value="OFFENSE">OFFENSE</option>
            <option value="DEFENSE">DEFENSE</option>
            <option value="SPECIAL">SPECIAL</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>
        <label>
          <span>작전개요</span>
          <input v-model="createForm.summary" type="text" />
        </label>
        <label>
          <span>포지션별 역할설명</span>
          <input v-model="createForm.roleDescription" type="text" />
        </label>
        <label>
          <span>태그(콤마 구분)</span>
          <input v-model="createForm.tags" type="text" />
        </label>
        <div class="modal-actions">
          <button type="button" @click="closeCreateTacticModal">취소</button>
          <button type="submit" class="primary" :disabled="loading || saving">완료</button>
        </div>
      </form>
    </div>

    <div v-if="showCreateBookModal" class="modal-backdrop" @click.self="closeCreatePlaybookModal">
      <form class="modal-panel" @submit.prevent="onCreatePlaybook">
        <h3>전술집 생성</h3>
        <label>
          <span>전술집 제목</span>
          <input v-model="createBookForm.title" type="text" placeholder="예: 2026 정규시즌 공격 패키지" />
        </label>
        <label>
          <span>전술집 설명</span>
          <textarea v-model="createBookForm.description" rows="4" placeholder="전술집 설명을 입력하세요." />
        </label>
        <div class="modal-actions">
          <button type="button" @click="closeCreatePlaybookModal">취소</button>
          <button type="submit" class="primary" :disabled="loading || saving">완료</button>
        </div>
      </form>
    </div>
  </main>
</template>

<style scoped>
.page {
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 16px 32px;
  display: grid;
  gap: 12px;
}

.panel {
  background: var(--kw-surface);
  border: 1px solid var(--kw-line);
  border-radius: var(--kw-radius-lg);
  padding: 16px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-panel .sub {
  margin: 0;
  color: var(--kw-text-muted);
}

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
}

.left-panel h2 {
  margin: 0;
  font-size: 16px;
}

.left-head {
  margin-bottom: 10px;
  display: grid;
  gap: 8px;
}

.left-controls {
  display: flex;
  gap: 8px;
  min-width: 0;
}

.left-head input {
  flex: 1 1 auto;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
}

.left-head select {
  flex: 0 0 auto;
  max-width: 100%;
  height: 34px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
}

@media (max-width: 520px) {
  .left-controls {
    flex-direction: column;
  }

  .left-head select {
    width: 100%;
  }
}

.create-grid {
  display: grid;
  gap: 8px;
}

.create-grid input,
.create-grid select,
.create-grid button,
.filter select,
.formation-input input,
.formation-input select,
.node-row select,
.node-row button,
.version-save input,
.version-save button,
.save-actions button {
  height: 36px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
}

.primary {
  background: var(--kw-primary) !important;
  border-color: var(--kw-primary) !important;
  color: var(--kw-primary-contrast);
}

.secondary {
  background: #f3f4f6 !important;
  border-color: #9ca3af !important;
  color: #111827;
}

.danger {
  background: #fff1f2 !important;
  border-color: #fecdd3 !important;
  color: #be123c;
}

.list-toolbar {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--kw-text-muted);
  font-size: 13px;
}

.board-list {
  margin-top: 10px;
  max-height: 540px;
  overflow: auto;
  display: grid;
  gap: 8px;
}

.board-item {
  text-align: left;
  display: grid;
  gap: 3px;
  border: 1px solid var(--kw-line);
  border-radius: 10px;
  background: var(--kw-surface-muted);
  padding: 10px;
}

.board-item-row {
  gap: 8px;
}

.board-item-main {
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0;
  display: grid;
  gap: 3px;
}

.board-item-actions {
  display: flex;
  gap: 6px;
}

.board-item strong {
  font-size: 14px;
}

.board-item span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.book-desc {
  white-space: pre-wrap;
}

.board-item.active {
  border-color: var(--kw-primary);
  background: #eff6ff;
}

.editor-panel {
  min-height: 760px;
}

.empty-editor {
  min-height: 680px;
  display: grid;
  place-items: center;
  color: var(--kw-text-soft);
}

.tactic-table-panel {
  display: grid;
  gap: 10px;
}

.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.table-toolbar > button {
  height: 34px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
  background: #fff;
}

.tactic-table-wrap {
  border: 1px solid var(--kw-line);
  border-radius: 10px;
  overflow: auto;
}

.tactic-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.tactic-table th,
.tactic-table td {
  border-bottom: 1px solid var(--kw-line);
  padding: 10px;
  text-align: left;
  font-size: 13px;
  vertical-align: top;
}

.tactic-table thead th {
  background: var(--kw-surface-muted);
  font-size: 12px;
  color: var(--kw-text-soft);
}

.actions-cell {
  display: flex;
  gap: 6px;
}

.editor-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.editor-head h2 {
  margin: 0;
  font-size: 20px;
}

.meta {
  margin: 4px 0 0;
  color: var(--kw-text-soft);
  font-size: 13px;
}

.meta-form {
  margin-bottom: 10px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.meta-form label {
  display: grid;
  gap: 4px;
}

.meta-form span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.meta-form input,
.meta-form select {
  height: 34px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 10px;
}

.save-actions {
  display: flex;
  gap: 8px;
}

.save-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.tool-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tool-btn {
  height: 34px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 999px;
  background: #fff;
  padding: 0 12px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.tool-btn.active {
  border-color: var(--kw-primary);
  background: #eff6ff;
  color: #1d4ed8;
}

.formation-input {
  display: grid;
  gap: 4px;
  min-width: 260px;
}

.formation-input span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.node-row {
  display: flex;
  gap: 8px;
  align-items: end;
  margin-bottom: 10px;
}

.node-row label {
  display: grid;
  gap: 4px;
}

.node-row label span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.shape-row {
  margin-bottom: 10px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.shape-row span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.play-card {
  border: 1px solid #3f3f46;
  background: #f3f4f6;
}

.play-title {
  height: 44px;
  display: grid;
  place-items: center;
  border-bottom: 1px solid #3f3f46;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.field {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0;
  border: 0;
  background: #e5e7eb;
  overflow: hidden;
  user-select: none;
}

.draw-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.node {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1.2px solid #111827;
  background: #f8fafc;
  color: #111827;
  font-weight: 700;
  font-size: 12px;
  touch-action: none;
}

.node.icon-square {
  border-radius: 6px;
}

.node.icon-triangle {
  clip-path: polygon(50% 6%, 4% 94%, 96% 94%);
  border-radius: 0;
}

.node.icon-x {
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
}

.node.active {
  border-color: #111827;
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.18);
}

.annotation {
  position: absolute;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #9ca3af;
  border-radius: 0;
  padding: 2px 8px;
  font-size: 12px;
  max-width: 180px;
  text-align: center;
}

.bottom-grid {
  margin-top: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  border: 1px solid #3f3f46;
  border-top: 0;
}

.call-column {
  display: grid;
}

.call-column + .call-column {
  border-left: 1px solid #3f3f46;
}

.sub-panel {
  border: 0;
  border-top: 1px solid #3f3f46;
  border-radius: 0;
  padding: 10px;
  background: #f3f4f6;
}

.sub-panel h3 {
  margin: 0 0 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.sub-panel ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.sub-panel li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 13px;
}

.sub-panel li input {
  flex: 1;
  height: 30px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 8px;
}

.version-save {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.version-save input {
  flex: 1;
}

.small {
  height: 28px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 7px;
  padding: 0 8px;
  background: #fff;
  font-size: 12px;
}

.empty {
  color: var(--kw-text-soft);
  font-size: 13px;
}

.error {
  margin: 0;
  color: var(--kw-danger-text);
  font-size: 13px;
}

.success {
  margin: 0;
  color: var(--kw-success-text);
  font-size: 13px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 50;
}

.modal-panel {
  width: min(560px, calc(100vw - 32px));
  background: #fff;
  border: 1px solid var(--kw-line);
  border-radius: 12px;
  padding: 16px;
  display: grid;
  gap: 10px;
}

.modal-panel h3 {
  margin: 0;
  font-size: 18px;
}

.modal-panel label {
  display: grid;
  gap: 4px;
}

.modal-panel label span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.modal-panel input,
.modal-panel select,
.modal-panel textarea {
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 10px;
  font: inherit;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .control-row,
  .node-row,
  .editor-head {
    flex-direction: column;
    align-items: stretch;
  }

  .bottom-grid {
    grid-template-columns: 1fr;
  }

  .call-column + .call-column {
    border-left: 0;
  }
}
</style>


