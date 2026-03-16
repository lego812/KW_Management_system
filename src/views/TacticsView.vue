<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Copy,
  Eraser,
  FileText,
  GitBranch,
  Monitor,
  NotebookPen,
  RefreshCw,
  Save,
  ShieldPlus,
  Sparkles,
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
  fetchTactics,
  fetchPlaybooks,
  fetchTacticsByBook,
  saveBoardState,
  saveBoardVersion,
  updateTacticBoardMeta,
} from '../api/tactics'
import BaseModal from '../components/common/BaseModal.vue'
import InlineMessage from '../components/common/InlineMessage.vue'
import PageHeaderPanel from '../components/common/PageHeaderPanel.vue'

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const actionMessage = ref('')
let actionMessageTimer = null
const tactics = ref([])
const playbooks = ref([])
const playbookStats = ref({})
const playersPool = ref([])
const versions = ref([])

const selectedBookId = ref('')
const selectedBoardId = ref('')
const selectedNodeId = ref('')
const selectedPlayerId = ref('')
const editingNodeId = ref('')

const tool = ref('select')
const lineStyle = ref('SOLID')
const routeDraft = ref(null)
const routePreview = ref(null)
const draggingNodeId = ref('')
const draggingPointerId = ref(null)
const draggingScrimmage = ref(false)
const draggingScrimmagePointerId = ref(null)
const scrimmageStartPointerY = ref(0)
const scrimmageStartLineY = ref(0.5)
const dragMoved = ref(false)
const suppressFieldClick = ref(false)

const fieldRef = ref(null)

const createForm = reactive({
  title: '',
  category: 'OFFENSE',
  summary: '',
  roleDescription: '',
  tags: '',
  formationId: 'EMPTY',
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
const PLAYBOOK_FORMATION_OPTIONS = [
  { id: 'EMPTY', label: 'Empty Formation' },
]
const EMPTY_FORMATION_PREVIEW = [
  { id: 'x', label: 'X', x: 0.14, y: 0.36 },
  { id: 'two-left', label: '2', x: 0.28, y: 0.40 },
  { id: 'lt', label: 'LT', x: 0.43, y: 0.36 },
  { id: 'lg', label: 'LG', x: 0.46, y: 0.36 },
  { id: 'c', label: 'C', x: 0.49, y: 0.36 },
  { id: 'rg', label: 'RG', x: 0.52, y: 0.36 },
  { id: 'rt', label: 'RT', x: 0.55, y: 0.36 },
  { id: 'one', label: '1', x: 0.49, y: 0.49 },
  { id: 'three', label: '3', x: 0.67, y: 0.40 },
  { id: 'z', label: 'Z', x: 0.77, y: 0.40 },
  { id: 'y', label: 'Y', x: 0.88, y: 0.355 },
]

function setActionMessage(message, timeoutMs = 3000) {
  actionMessage.value = message
  if (actionMessageTimer) clearTimeout(actionMessageTimer)
  actionMessageTimer = setTimeout(() => {
    actionMessage.value = ''
    actionMessageTimer = null
  }, timeoutMs)
}

function emptyBookStats() {
  return {
    total: 0,
    offense: 0,
    defense: 0,
    special: 0,
  }
}

function buildPlaybookStats(rows) {
  const stats = {}
  for (const row of rows) {
    const bookId = String(row?.bookId ?? '')
    if (!bookId) continue
    if (!stats[bookId]) stats[bookId] = emptyBookStats()
    stats[bookId].total += 1

    const category = String(row?.category ?? '').toUpperCase()
    if (category === 'OFFENSE') stats[bookId].offense += 1
    if (category === 'DEFENSE') stats[bookId].defense += 1
    if (category === 'SPECIAL') stats[bookId].special += 1
  }
  return stats
}

function getBookStats(bookId) {
  return playbookStats.value[String(bookId)] ?? emptyBookStats()
}

function ensureBookStats(bookId) {
  const key = String(bookId ?? '')
  if (!key) return null
  if (!playbookStats.value[key]) {
    playbookStats.value[key] = emptyBookStats()
  }
  return playbookStats.value[key]
}

function incrementBookStats(bookId, category) {
  const stats = ensureBookStats(bookId)
  if (!stats) return
  stats.total += 1
  const key = String(category ?? '').toUpperCase()
  if (key === 'OFFENSE') stats.offense += 1
  if (key === 'DEFENSE') stats.defense += 1
  if (key === 'SPECIAL') stats.special += 1
}

function decrementBookStats(bookId, category) {
  const stats = ensureBookStats(bookId)
  if (!stats) return
  stats.total = Math.max(0, stats.total - 1)
  const key = String(category ?? '').toUpperCase()
  if (key === 'OFFENSE') stats.offense = Math.max(0, stats.offense - 1)
  if (key === 'DEFENSE') stats.defense = Math.max(0, stats.defense - 1)
  if (key === 'SPECIAL') stats.special = Math.max(0, stats.special - 1)
}

function createEmptyState() {
  return {
    activeFormationId: '',
    scrimmageLineY: 0.5,
    players: [],
    drawings: [],
    annotations: [],
  }
}

function buildFormationPlayers(formationId) {
  const key = String(formationId ?? '').toUpperCase()
  const preset = key === 'EMPTY' ? EMPTY_FORMATION_PREVIEW : []

  return preset.map((item) => ({
    nodeId: makeId('n'),
    playerId: '',
    label: String(item.label ?? '').trim(),
    iconType: item.label === 'X' ? 'X' : 'CIRCLE',
    pos: { x: clamp01(item.x), y: clamp01(item.y) },
    rotation: 0,
  }))
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
const playbookPreviewPlayers = computed(() => {
  if (createForm.formationId === 'EMPTY') return EMPTY_FORMATION_PREVIEW
  return EMPTY_FORMATION_PREVIEW
})
const tacticBuckets = computed(() => [
  {
    key: 'OFFENSE',
    title: '오펜스',
    items: tactics.value.filter((item) => String(item?.category ?? '').toUpperCase() === 'OFFENSE'),
  },
  {
    key: 'DEFENSE',
    title: '디펜스',
    items: tactics.value.filter((item) => String(item?.category ?? '').toUpperCase() === 'DEFENSE'),
  },
  {
    key: 'SPECIAL',
    title: '스페셜',
    items: tactics.value.filter((item) => String(item?.category ?? '').toUpperCase() === 'SPECIAL'),
  },
  {
    key: 'OTHER',
    title: '기타',
    items: tactics.value.filter((item) => String(item?.category ?? '').toUpperCase() === 'OTHER'),
  },
])
const currentBoardIndex = computed(() => tactics.value.findIndex((item) => item.id === selectedBoardId.value))
const hasPrevBoard = computed(() => currentBoardIndex.value > 0)
const hasNextBoard = computed(() => currentBoardIndex.value >= 0 && currentBoardIndex.value < tactics.value.length - 1)

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
    tactics.value = await fetchTacticsByBook(selectedBookId.value, 'ALL')
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
    const [bookRows, tacticRows] = await Promise.all([fetchPlaybooks(), fetchTactics('ALL')])
    playbooks.value = bookRows
    playbookStats.value = buildPlaybookStats(tacticRows)
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
    setActionMessage('전술집을 생성했습니다.', 3000)
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
  createForm.title = ''
  createForm.category = 'OFFENSE'
  createForm.summary = ''
  createForm.roleDescription = ''
  createForm.tags = ''
  createForm.formationId = 'EMPTY'
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
      initialState: {
        ...createEmptyState(),
        activeFormationId: createForm.formationId,
        players: buildFormationPlayers(createForm.formationId),
      },
    })
    incrementBookStats(selectedBookId.value, createForm.category)

    createForm.title = ''
    createForm.summary = ''
    createForm.roleDescription = ''
    createForm.tags = ''
    createForm.formationId = 'EMPTY'
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
      scrimmageLineY: clamp01(state.scrimmageLineY ?? 0.5),
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

function shiftBoardByLineDelta(deltaY) {
  if (!Number.isFinite(deltaY) || deltaY === 0) return
  boardState.value.players.forEach((node) => {
    node.pos = {
      x: clamp01(node.pos?.x ?? 0.5),
      y: clamp01((node.pos?.y ?? 0.5) + deltaY),
    }
  })
  boardState.value.drawings.forEach((drawing) => {
    drawing.points = (drawing.points || []).map((p) => ({ x: clamp01(p.x), y: clamp01((p.y ?? 0.5) + deltaY) }))
  })
  boardState.value.annotations.forEach((note) => {
    note.pos = {
      x: clamp01(note.pos?.x ?? 0.5),
      y: clamp01((note.pos?.y ?? 0.5) + deltaY),
    }
  })
}

function onScrimmagePointerDown(evt) {
  if (!selectedBoardId.value || routeDraft.value) return
  draggingScrimmage.value = true
  draggingScrimmagePointerId.value = evt.pointerId
  scrimmageStartPointerY.value = normalizePoint(evt).y
  scrimmageStartLineY.value = clamp01(boardState.value.scrimmageLineY ?? 0.5)
  evt.currentTarget?.setPointerCapture?.(evt.pointerId)
}

function onFieldPointerMove(evt) {
  if (draggingScrimmage.value) {
    if (draggingScrimmagePointerId.value !== null && evt.pointerId !== draggingScrimmagePointerId.value) return
    const point = normalizePoint(evt)
    const nextLineY = clamp01(scrimmageStartLineY.value + (point.y - scrimmageStartPointerY.value))
    const prevLineY = clamp01(boardState.value.scrimmageLineY ?? 0.5)
    const deltaY = nextLineY - prevLineY
    if (deltaY !== 0) {
      shiftBoardByLineDelta(deltaY)
      boardState.value.scrimmageLineY = nextLineY
    }
    return
  }

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
  if (draggingScrimmage.value) {
    if (draggingScrimmagePointerId.value !== null && evt?.pointerId !== draggingScrimmagePointerId.value) return
    draggingScrimmage.value = false
    draggingScrimmagePointerId.value = null
    return
  }

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
  if (editingNodeId.value === nodeId) return
  selectedNodeId.value = nodeId
  draggingNodeId.value = nodeId
  draggingPointerId.value = evt.pointerId
  dragMoved.value = false
  evt.currentTarget?.setPointerCapture?.(evt.pointerId)
  evt.preventDefault()
}

function commitNodeLabel(nodeId) {
  const target = boardState.value.players.find((p) => p.nodeId === nodeId)
  if (!target) return
  target.label = String(target.label ?? '').trim() || 'N'
}

function stopNodeLabelEdit(nodeId) {
  commitNodeLabel(nodeId)
  if (editingNodeId.value === nodeId) editingNodeId.value = ''
}

function startNodeLabelEdit(nodeId) {
  editingNodeId.value = nodeId
  nextTick(() => {
    const input = fieldRef.value?.querySelector?.(`[data-node-editor="${nodeId}"]`)
    input?.focus?.()
    input?.select?.()
  })
}

function onNodeClick(nodeId) {
  if (dragMoved.value) return
  if (editingNodeId.value === nodeId) return
  if (tool.value !== 'select') {
    selectedNodeId.value = nodeId
    return
  }
  if (selectedNodeId.value === nodeId) {
    startNodeLabelEdit(nodeId)
    return
  }
  editingNodeId.value = ''
  selectedNodeId.value = nodeId
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
  if (editingNodeId.value) stopNodeLabelEdit(editingNodeId.value)
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

function nodeText(node) {
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
  if (selectedBookId.value) {
    await loadTactics()
    return
  }
  await loadPlaybooks()
}

async function onDeleteBoard(boardId) {
  const ok = window.confirm('이 작전을 삭제할까요?')
  if (!ok) return

  loading.value = true
  errorMessage.value = ''
  try {
    const target = tactics.value.find((row) => row.id === boardId)
    await deleteTacticBoard(boardId)
    if (target) {
      decrementBookStats(target.bookId || selectedBookId.value, target.category)
    }
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

async function onBackToPlaybooks() {
  selectedBookId.value = ''
  selectedBoardId.value = ''
  tactics.value = []
  versions.value = []
  await loadPlaybooks()
}

async function openAdjacentBoard(offset) {
  const nextIndex = currentBoardIndex.value + Number(offset || 0)
  const target = tactics.value[nextIndex]
  if (!target?.id) return
  await openBoard(target.id)
}

onMounted(async () => {
  await Promise.all([loadPlaybooks(), loadPlayers()])
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
    <PageHeaderPanel
      eyebrow="Tactical Board"
      title="전술 보드"
      subtitle="보드 생성, 선수 배치, Route/Pass/Fake/Block 작성, 버전 저장과 복원을 처리합니다."
      :icon="NotebookPen"
    />

    <section
      v-if="!selectedBookId"
      class="panel playbook-panel"
    >
      <div class="left-head">
        <h2>전술집</h2>
        <div class="left-controls">
          <input
            v-model="playbookSearch"
            type="text"
            placeholder="전술집 검색"
          >
          <select v-model="playbookSort">
            <option value="desc">
              최신순
            </option>
            <option value="asc">
              오래된순
            </option>
          </select>
          <button
            type="button"
            class="primary"
            :disabled="loading || saving"
            @click="openCreatePlaybookModal"
          >
            전술집 생성
          </button>
          <button
            type="button"
            :disabled="loading || saving"
            @click="onRefresh"
          >
            <RefreshCw
              :size="14"
              :stroke-width="1.9"
            />새로고침
          </button>
        </div>
      </div>

      <div class="board-list">
        <button
          v-for="book in filteredPlaybooks"
          :key="book.id"
          type="button"
          class="board-item"
          @click="onSelectPlaybook(book.id)"
        >
          <div class="board-item-head">
            <strong>{{ book.title }}</strong>
          </div>
          <span
            v-if="book.description"
            class="book-desc"
          >{{ book.description }}</span>
          <span
            v-else
            class="book-desc muted"
          >설명이 없습니다.</span>
          <div class="book-meta">
            <span>생성 {{ formatDate(book.createdAt) }}</span>
            <span>수정 {{ formatDate(book.updatedAt) }}</span>
          </div>
          <div class="book-stats">
            <span>총 작전수 {{ getBookStats(book.id).total }}</span>
            <span>오펜스 {{ getBookStats(book.id).offense }}</span>
            <span>디펜스 {{ getBookStats(book.id).defense }}</span>
            <span>스페셜 {{ getBookStats(book.id).special }}</span>
          </div>
        </button>
        <p
          v-if="!loading && playbooks.length === 0"
          class="empty"
        >
          등록된 전술집이 없습니다.
        </p>
        <p
          v-else-if="!loading && filteredPlaybooks.length === 0"
          class="empty"
        >
          검색 결과가 없습니다.
        </p>
      </div>
    </section>

    <section
      v-else
      class="panel editor-panel"
    >
      <div class="tactic-entry-head">
        <div class="tactic-entry-title">
          <div class="tactic-title-row">
            <button
              type="button"
              class="back-btn"
              @click="onBackToPlaybooks"
            >
              <ArrowLeft
                :size="16"
                :stroke-width="2"
              />
            </button>
            <h2>{{ selectedBook?.title || '전술집' }}</h2>
          </div>
          <p class="meta">
            선택된 전술집의 작전 목록입니다.
          </p>
        </div>
        <div class="table-toolbar">
          <button
            type="button"
            class="primary"
            :disabled="loading || saving"
            @click="openCreateTacticModal"
          >
            작전 생성
          </button>
          <button
            type="button"
            :disabled="loading || saving"
            @click="onClonePlaybook"
          >
            전술집 복제
          </button>
          <button
            type="button"
            class="danger"
            :disabled="loading || saving"
            @click="onDeletePlaybook"
          >
            전술집 삭제
          </button>
          <button
            type="button"
            :disabled="loading || saving"
            @click="onRefresh"
          >
            <RefreshCw
              :size="14"
              :stroke-width="1.9"
            />새로고침
          </button>
        </div>
      </div>

      <div
        class="book-layout"
        :class="{ editing: !!selectedBoardId, browsing: !selectedBoardId }"
      >
        <aside class="tactic-side">
          <div class="tactic-bucket-grid">
            <section
              v-for="bucket in tacticBuckets"
              :key="bucket.key"
              class="tactic-bucket"
            >
              <div class="tactic-side-head">
                <h3>{{ bucket.title }}</h3>
                <span>{{ bucket.items.length }}개</span>
              </div>

              <div class="tactic-list">
                <button
                  v-for="item in bucket.items"
                  :key="item.id"
                  type="button"
                  class="tactic-item"
                  :class="{ active: selectedBoardId === item.id }"
                  @click="openBoard(item.id)"
                >
                  <strong>{{ item.title }}</strong>
                  <span class="tactic-summary">{{ item.summary || '개요 없음' }}</span>
                  <span>{{ item.category }} / v{{ item.lastPublishedVersion ?? 0 }}</span>
                  <span>{{ formatDate(item.updatedAt) }}</span>
                </button>
                <p
                  v-if="!loading && bucket.items.length === 0"
                  class="empty"
                >
                  등록된 작전이 없습니다.
                </p>
              </div>
            </section>
          </div>
        </aside>

        <section
          v-if="selectedBoardId"
          class="tactic-main"
        >
          <div class="editor-shell">
            <aside class="editor-rail">
              <button
                type="button"
                class="rail-btn"
                @click="tool = 'select'"
              >
                <NotebookPen
                  :size="26"
                  :stroke-width="1.9"
                />
              </button>
              <button
                type="button"
                class="rail-btn"
                :disabled="saving"
                @click="onSaveCurrent"
              >
                <Save
                  :size="24"
                  :stroke-width="1.9"
                />
              </button>
              <button
                type="button"
                class="rail-btn active"
                @click="tool = 'run'"
              >
                <GitBranch
                  :size="24"
                  :stroke-width="1.9"
                />
              </button>
              <button
                type="button"
                class="rail-btn"
                @click="tool = 'text'"
              >
                <Sparkles
                  :size="24"
                  :stroke-width="1.9"
                />
              </button>
              <button
                type="button"
                class="rail-btn"
                @click="tool = 'other'"
              >
                <FileText
                  :size="24"
                  :stroke-width="1.9"
                />
              </button>
              <button
                type="button"
                class="rail-btn"
                @click="tool = 'block'"
              >
                <Monitor
                  :size="24"
                  :stroke-width="1.9"
                />
              </button>
              <button
                type="button"
                class="rail-btn"
                @click="tool = 'pass'"
              >
                <Users
                  :size="24"
                  :stroke-width="1.9"
                />
              </button>
            </aside>

            <section class="editor-stage">
              <div class="editor-topbar">
                <div class="topbar-left">
                  <button
                    type="button"
                    class="nav-btn dark"
                    @click="onBackToPlaybooks"
                  >
                    Back
                  </button>
                  <input
                    v-model="boardMetaForm.title"
                    class="play-name-input"
                    type="text"
                    placeholder="demo1"
                  >
                  <button
                    type="button"
                    class="nav-btn"
                    :disabled="saving"
                    @click="onSaveCurrent"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    class="nav-btn"
                    disabled
                  >
                    <Copy
                      :size="16"
                      :stroke-width="1.9"
                    />Copy
                  </button>
                  <button
                    type="button"
                    class="nav-btn"
                    @click="boardMetaForm.category = boardMetaForm.category === 'OFFENSE' ? 'DEFENSE' : 'OFFENSE'"
                  >
                    Switch
                  </button>
                  <button
                    type="button"
                    class="nav-btn"
                    :disabled="boardState.players.length === 0"
                    @click="applyTwinsCowboyPreset"
                  >
                    Arrange
                    <ChevronDown
                      :size="16"
                      :stroke-width="1.9"
                    />
                  </button>
                  <button
                    type="button"
                    class="nav-btn success"
                    @click="addPlayerNode"
                  >
                    Add
                    <ChevronDown
                      :size="16"
                      :stroke-width="1.9"
                    />
                  </button>
                  <button
                    type="button"
                    class="nav-btn success alt"
                    @click="boardMetaForm.category = 'DEFENSE'"
                  >
                    <ShieldPlus
                      :size="16"
                      :stroke-width="1.9"
                    />Add Defense
                  </button>
                  <button
                    type="button"
                    class="icon-nav-btn"
                    :disabled="!hasPrevBoard"
                    @click="openAdjacentBoard(-1)"
                  >
                    <ChevronLeft
                      :size="20"
                      :stroke-width="2"
                    />
                  </button>
                  <button
                    type="button"
                    class="icon-nav-btn"
                    :disabled="!hasNextBoard"
                    @click="openAdjacentBoard(1)"
                  >
                    <ChevronRight
                      :size="20"
                      :stroke-width="2"
                    />
                  </button>
                </div>

                <div class="topbar-right">
                  <button
                    type="button"
                    class="profile-dot"
                  >
                    O
                  </button>
                  <button
                    type="button"
                    class="profile-dot"
                  >
                    U
                  </button>
                </div>
              </div>

              <div class="editor-statusbar">
                <span>{{ selectedBook?.title || '-' }}</span>
                <span>{{ boardMetaForm.category }}</span>
                <span>v{{ selectedBoard?.lastPublishedVersion ?? 0 }}</span>
                <select
                  v-model="lineStyle"
                  class="mini-select"
                >
                  <option value="SOLID">
                    실선
                  </option>
                  <option value="DASHED">
                    점선
                  </option>
                </select>
                <select
                  v-model="selectedPlayerId"
                  class="mini-select"
                >
                  <option
                    v-for="player in playersPool"
                    :key="player.id"
                    :value="player.id"
                  >
                    {{ player.number }} {{ player.name }}
                  </option>
                </select>
                <input
                  v-model="boardState.activeFormationId"
                  class="mini-input"
                  type="text"
                  placeholder="Empty Formation"
                >
                <button
                  v-if="routeDraft"
                  type="button"
                  class="mini-chip danger"
                  @click="cancelDraft"
                >
                  <Undo2
                    :size="13"
                    :stroke-width="1.9"
                  />드래프트 취소
                </button>
                <button
                  type="button"
                  class="mini-chip"
                  :disabled="!selectedNodeId"
                  @click="removeSelectedNode"
                >
                  <Eraser
                    :size="13"
                    :stroke-width="1.9"
                  />노드 삭제
                </button>
                <button
                  type="button"
                  class="mini-chip"
                  :disabled="saving"
                  @click="onSaveVersion"
                >
                  <Check
                    :size="13"
                    :stroke-width="1.9"
                  />버전 저장
                </button>
                <button
                  type="button"
                  class="mini-chip"
                  :disabled="loading || saving"
                  @click="onDeleteBoard(selectedBoardId)"
                >
                  삭제
                </button>
              </div>

              <div class="editor-field-wrap">
                <div class="play-card play-card-editor">
                  <div
                    ref="fieldRef"
                    class="field"
                    @click="onFieldClick"
                    @dblclick="onFieldDoubleClick"
                    @pointermove="onFieldPointerMove"
                    @pointerup="onFieldPointerUp"
                    @pointerleave="onFieldPointerUp"
                  >
                    <div
                      class="scrimmage-line"
                      :style="{ top: percent(boardState.scrimmageLineY ?? 0.5) }"
                      @pointerdown.stop.prevent="onScrimmagePointerDown"
                    >
                      <span class="scrimmage-label">LOS</span>
                    </div>
                    <svg
                      class="draw-layer"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
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
                      @click.stop="onNodeClick(node.nodeId)"
                    >
                      <input
                        v-if="editingNodeId === node.nodeId"
                        v-model="node.label"
                        :data-node-editor="node.nodeId"
                        class="node-label-input"
                        type="text"
                        maxlength="6"
                        @blur="stopNodeLabelEdit(node.nodeId)"
                        @click.stop
                        @keydown.enter.prevent="stopNodeLabelEdit(node.nodeId)"
                        @keydown.esc.prevent="stopNodeLabelEdit(node.nodeId)"
                        @pointerdown.stop
                      >
                      <span v-else>{{ nodeText(node) }}</span>
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
              </div>

              <div class="editor-bottom-panels">
                <section class="floating-panel">
                  <h3>
                    <GitBranch
                      :size="14"
                      :stroke-width="1.9"
                    />그려진 라인
                  </h3>
                  <ul>
                    <li
                      v-for="row in routeRows"
                      :key="row.drawId"
                    >
                      <span>{{ row.type }} / {{ row.nodeLabel }} / {{ row.points?.length ?? 0 }}점</span>
                      <button
                        type="button"
                        class="danger small"
                        @click="removeDrawing(row.drawId)"
                      >
                        삭제
                      </button>
                    </li>
                    <li
                      v-if="routeRows.length === 0"
                      class="empty"
                    >
                      라인이 없습니다.
                    </li>
                  </ul>
                </section>

                <section class="floating-panel">
                  <h3>
                    <CircleDot
                      :size="14"
                      :stroke-width="1.9"
                    />텍스트 주석
                  </h3>
                  <ul>
                    <li
                      v-for="note in boardState.annotations"
                      :key="note.annotationId"
                    >
                      <input
                        v-model="note.text"
                        type="text"
                      >
                      <button
                        type="button"
                        class="danger small"
                        @click="removeAnnotation(note.annotationId)"
                      >
                        삭제
                      </button>
                    </li>
                    <li
                      v-if="boardState.annotations.length === 0"
                      class="empty"
                    >
                      주석이 없습니다.
                    </li>
                  </ul>
                </section>

                <section class="floating-panel">
                  <h3>버전 히스토리</h3>
                  <div class="version-save">
                    <input
                      v-model="versionMessage"
                      type="text"
                      placeholder="버전 메시지"
                    >
                    <button
                      type="button"
                      class="primary"
                      :disabled="saving"
                      @click="onSaveVersion"
                    >
                      버전 저장
                    </button>
                  </div>
                  <ul>
                    <li
                      v-for="v in versions"
                      :key="v.id"
                    >
                      <span>v{{ v.version }} - {{ v.message || '-' }}</span>
                      <button
                        type="button"
                        class="small"
                        :disabled="saving"
                        @click="onApplyVersion(v.id)"
                      >
                        복원
                      </button>
                    </li>
                    <li
                      v-if="versions.length === 0"
                      class="empty"
                    >
                      저장된 버전이 없습니다.
                    </li>
                  </ul>
                </section>
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>

    <InlineMessage
      :message="errorMessage"
      type="error"
    />
    <InlineMessage
      :message="actionMessage"
      type="success"
    />

    <BaseModal
      :show="showCreateTacticModal"
      max-width="1320px"
      @close="closeCreateTacticModal"
    >
      <form
        class="playbook-create-modal"
        @submit.prevent="onCreateBoard"
      >
        <section class="playbook-create-copy">
          <h3>Add Play</h3>
          <label>
            <span>Play Name</span>
            <input
              v-model="createForm.title"
              type="text"
              placeholder="demo1"
            >
          </label>
          <label>
            <span>Offensive Formation</span>
            <select v-model="createForm.formationId">
              <option
                v-for="formation in PLAYBOOK_FORMATION_OPTIONS"
                :key="formation.id"
                :value="formation.id"
              >
                {{ formation.label }}
              </option>
            </select>
          </label>
          <div class="playbook-create-actions">
            <button
              type="button"
              @click="closeCreateTacticModal"
            >
              취소
            </button>
            <button
              type="submit"
              class="primary playbook-submit"
              :disabled="loading || saving"
            >
              Add Play
            </button>
          </div>
        </section>

        <section class="playbook-preview-panel">
          <div class="playbook-preview-field">
            <div class="playbook-preview-yard stripe stripe-left" />
            <div class="playbook-preview-yard stripe stripe-mid" />
            <div class="playbook-preview-yard stripe stripe-right" />
            <div class="playbook-preview-hash hash-left" />
            <div class="playbook-preview-hash hash-right" />
            <div class="playbook-preview-lines" />
            <div
              v-for="node in playbookPreviewPlayers"
              :key="node.id"
              class="playbook-preview-node"
              :style="{ left: percent(node.x), top: percent(node.y) }"
            >
              {{ node.label }}
            </div>
          </div>
        </section>
      </form>
    </BaseModal>

    <BaseModal
      :show="showCreateBookModal"
      @close="closeCreatePlaybookModal"
    >
      <form
        class="modal-form"
        @submit.prevent="onCreatePlaybook"
      >
        <h3>전술집 생성</h3>
        <label>
          <span>전술집 제목</span>
          <input
            v-model="createBookForm.title"
            type="text"
            placeholder="예: 2026 정규시즌 공격 패키지"
          >
        </label>
        <label>
          <span>전술집 설명</span>
          <textarea
            v-model="createBookForm.description"
            rows="4"
            placeholder="전술집 설명을 입력하세요."
          />
        </label>
        <div class="modal-actions">
          <button
            type="button"
            @click="closeCreatePlaybookModal"
          >
            취소
          </button>
          <button
            type="submit"
            class="primary"
            :disabled="loading || saving"
          >
            완료
          </button>
        </div>
      </form>
    </BaseModal>
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

.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
}

.playbook-panel {
  display: grid;
  gap: 10px;
}

.left-panel h2 {
  margin: 0;
  font-size: 16px;
}

.left-head {
  margin-bottom: 10px;
  display: grid;
  gap: 4px;
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
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.board-item {
  text-align: left;
  display: grid;
  gap: 8px;
  border: 1px solid var(--kw-line);
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  padding: 12px;
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
  transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
}

.board-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.1);
}

.board-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.active-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 999px;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
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
  font-size: 15px;
  line-height: 1.3;
}

.board-item span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.book-desc {
  white-space: pre-wrap;
  line-height: 1.35;
}

.book-desc.muted {
  color: #94a3b8;
}

.book-meta {
  display: grid;
  gap: 2px;
}

.book-stats {
  margin-top: 2px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 8px;
}

.book-stats span {
  font-size: 12px;
  color: #334155;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 8px;
  padding: 3px 6px;
}

.board-item.active {
  border-color: #93c5fd;
  background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.18);
}

.editor-panel {
  min-height: 760px;
}

.book-layout {
  display: grid;
  grid-template-columns: minmax(520px, 40%) 1fr;
  gap: 12px;
  min-height: 760px;
}

.book-layout.editing {
  grid-template-columns: 1fr;
}

.book-layout.browsing {
  grid-template-columns: 1fr;
}

.book-layout.editing .tactic-side {
  display: none;
}

.book-layout.browsing .tactic-side {
  min-height: 720px;
}

.tactic-side {
  border: 1px solid var(--kw-line);
  border-radius: 10px;
  background: var(--kw-surface-muted);
  padding: 12px;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.tactic-bucket-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  min-height: 0;
  width: 100%;
  height: 100%;
  align-items: stretch;
}

.tactic-bucket {
  border: 1px solid var(--kw-line);
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
  min-width: 0;
}

.tactic-side-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tactic-side-head h3 {
  margin: 0;
  font-size: 14px;
}

.tactic-side-head span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.tactic-list {
  min-height: 0;
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

.tactic-item {
  flex: 0 0 auto;
  text-align: left;
  border: 1px solid var(--kw-line);
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  display: grid;
  gap: 4px;
}

.tactic-item strong {
  font-size: 14px;
}

.tactic-item span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.tactic-summary {
  color: #64748b;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tactic-item.active {
  border-color: #93c5fd;
  background: #eff6ff;
}

.tactic-main {
  border: 1px solid var(--kw-line);
  border-radius: 10px;
  padding: 12px;
  min-width: 0;
}

.book-layout.editing .tactic-main {
  border: 0;
  border-radius: 0;
  padding: 0;
  background: transparent;
}

.tactic-entry-head {
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 10px;
}

.tactic-entry-title h2 {
  margin: 0;
  font-size: 20px;
}

.tactic-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
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

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  padding: 0;
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
  background: #eef2f7;
}

.play-card-editor {
  border: 0;
  background: transparent;
}

.editor-shell {
  min-height: 760px;
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  background: #edf1f5;
  border: 1px solid #d7dee8;
  border-radius: 12px;
  overflow: hidden;
}

.editor-rail {
  background: linear-gradient(180deg, #34485f 0%, #34485f 100%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.rail-btn {
  height: 84px;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: rgba(255, 255, 255, 0.76);
  display: grid;
  place-items: center;
}

.rail-btn.active {
  background: #06080b;
  color: #fff;
}

.rail-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.editor-stage {
  min-width: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
}

.editor-topbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 16px 12px;
  background: #fff;
  border-bottom: 1px solid #dce3ec;
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.play-name-input {
  width: 240px;
  height: 40px;
  border: 1px solid #cfd8e3;
  border-radius: 4px;
  padding: 0 14px;
  font-size: 15px;
  background: #fff;
}

.nav-btn,
.icon-nav-btn {
  height: 40px;
  border: 0;
  border-radius: 4px;
  background: #4c9dde;
  color: #fff;
  padding: 0 18px;
  font-weight: 700;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.nav-btn.dark {
  background: #16344b;
}

.nav-btn.success {
  background: #27ae60;
}

.nav-btn.success.alt {
  background: #2bb06a;
}

.icon-nav-btn {
  width: 40px;
  justify-content: center;
  padding: 0;
}

.profile-dot {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 2px solid #6b7280;
  background: #fff;
  color: #4b5563;
  font-weight: 700;
}

.editor-statusbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #dde5ef;
}

.editor-statusbar span {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #d4dde8;
  color: #475569;
  font-size: 12px;
}

.mini-select,
.mini-input {
  height: 30px;
  border: 1px solid #d4dde8;
  border-radius: 999px;
  padding: 0 12px;
  background: #fff;
  font-size: 12px;
}

.mini-chip {
  height: 30px;
  border: 1px solid #d4dde8;
  border-radius: 999px;
  padding: 0 12px;
  background: #fff;
  color: #0f172a;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.mini-chip.danger {
  background: #fff1f2;
  border-color: #fecdd3;
  color: #be123c;
}

.editor-field-wrap {
  padding: 18px 16px 10px;
}

.editor-bottom-panels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 0 16px 16px;
}

.floating-panel {
  border: 1px solid #dce3ec;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  padding: 12px;
}

.floating-panel h3 {
  margin: 0 0 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.floating-panel ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.floating-panel li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
}

.floating-panel li input {
  flex: 1;
  height: 30px;
  border: 1px solid var(--kw-line-strong);
  border-radius: 8px;
  padding: 0 8px;
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
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
    linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(16.66% - 2px),
      rgba(255, 255, 255, 0.98) calc(16.66% - 2px),
      rgba(255, 255, 255, 0.98) calc(16.66% + 2px),
      transparent calc(16.66% + 2px),
      transparent calc(33.33% - 2px),
      rgba(255, 255, 255, 0.98) calc(33.33% - 2px),
      rgba(255, 255, 255, 0.98) calc(33.33% + 2px),
      transparent calc(33.33% + 2px),
      transparent calc(50% - 2px),
      rgba(255, 255, 255, 0.98) calc(50% - 2px),
      rgba(255, 255, 255, 0.98) calc(50% + 2px),
      transparent calc(50% + 2px),
      transparent calc(66.66% - 2px),
      rgba(255, 255, 255, 0.98) calc(66.66% - 2px),
      rgba(255, 255, 255, 0.98) calc(66.66% + 2px),
      transparent calc(66.66% + 2px),
      transparent calc(83.33% - 2px),
      rgba(255, 255, 255, 0.98) calc(83.33% - 2px),
      rgba(255, 255, 255, 0.98) calc(83.33% + 2px),
      transparent calc(83.33% + 2px)
    ),
    #3f9c4b;
  overflow: hidden;
  user-select: none;
}

.field::before,
.field::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.field::before {
  left: 0;
  width: 40px;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.98) 0 4px,
    transparent 4px 9px,
    rgba(255, 255, 255, 0.98) 9px 13px,
    transparent 13px 18px
  );
}

.field::after {
  inset: 0;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0 38px,
      rgba(255, 255, 255, 0.98) 38px 42px,
      transparent 42px 85px
    ) left / 70px 100% no-repeat,
    repeating-linear-gradient(
      to bottom,
      transparent 0 38px,
      rgba(255, 255, 255, 0.98) 38px 42px,
      transparent 42px 85px
    ) right / 70px 100% no-repeat,
    repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.98) 0 4px,
      transparent 4px 9px,
      rgba(255, 255, 255, 0.98) 9px 13px,
      transparent 13px 18px
    ) 31.5% 0 / 40px 100% no-repeat,
    repeating-linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.98) 0 4px,
      transparent 4px 9px,
      rgba(255, 255, 255, 0.98) 9px 13px,
      transparent 13px 18px
    ) 63% 0 / 40px 100% no-repeat;
}

.scrimmage-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 4px solid #ef4444;
  transform: translateY(-50%);
  z-index: 4;
  cursor: ns-resize;
  touch-action: none;
}

.scrimmage-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: -8px;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-left: 14px solid #ef4444;
}

.scrimmage-label {
  position: absolute;
  right: 8px;
  top: -16px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  padding: 2px 6px;
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

.node-label-input {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: center;
  padding: 0 4px;
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

.modal-form {
  display: grid;
  gap: 10px;
}

.modal-form h3 {
  margin: 0;
  font-size: 18px;
}

.modal-form label {
  display: grid;
  gap: 4px;
}

.modal-form label span {
  font-size: 12px;
  color: var(--kw-text-soft);
}

.modal-form input,
.modal-form select,
.modal-form textarea {
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

.playbook-create-modal {
  display: grid;
  grid-template-columns: minmax(280px, 420px) minmax(0, 1fr);
  gap: 36px;
  align-items: start;
  min-height: 620px;
  padding: 18px 10px;
}

.playbook-create-copy {
  display: grid;
  gap: 22px;
  align-content: start;
  padding: 8px 10px 8px 6px;
}

.playbook-create-copy h3 {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.playbook-create-copy label {
  display: grid;
  gap: 10px;
}

.playbook-create-copy label span {
  font-size: 15px;
  color: #0f172a;
  font-weight: 600;
}

.playbook-create-copy input,
.playbook-create-copy select {
  height: 54px;
  border: 1px solid #b9c3d1;
  border-radius: 4px;
  padding: 0 18px;
  font-size: 17px;
  background: #fff;
}

.playbook-create-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.playbook-submit {
  min-width: 134px;
  height: 46px;
  border-radius: 6px;
  background: #4b9fe1 !important;
  border-color: #4b9fe1 !important;
}

.playbook-preview-panel {
  display: grid;
  align-items: center;
  min-height: 100%;
}

.playbook-preview-field {
  position: relative;
  width: 100%;
  aspect-ratio: 1.6 / 1;
  overflow: hidden;
  background: #3f9c4b;
}

.playbook-preview-lines,
.playbook-preview-yard,
.playbook-preview-hash {
  position: absolute;
  pointer-events: none;
}

.playbook-preview-lines {
  inset: 0;
  background-image: linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(16.66% - 2px),
    rgba(255, 255, 255, 0.98) calc(16.66% - 2px),
    rgba(255, 255, 255, 0.98) calc(16.66% + 2px),
    transparent calc(16.66% + 2px),
    transparent calc(33.33% - 2px),
    rgba(255, 255, 255, 0.98) calc(33.33% - 2px),
    rgba(255, 255, 255, 0.98) calc(33.33% + 2px),
    transparent calc(33.33% + 2px),
    transparent calc(50% - 2px),
    rgba(255, 255, 255, 0.98) calc(50% - 2px),
    rgba(255, 255, 255, 0.98) calc(50% + 2px),
    transparent calc(50% + 2px),
    transparent calc(66.66% - 2px),
    rgba(255, 255, 255, 0.98) calc(66.66% - 2px),
    rgba(255, 255, 255, 0.98) calc(66.66% + 2px),
    transparent calc(66.66% + 2px),
    transparent calc(83.33% - 2px),
    rgba(255, 255, 255, 0.98) calc(83.33% - 2px),
    rgba(255, 255, 255, 0.98) calc(83.33% + 2px),
    transparent calc(83.33% + 2px)
  );
}

.playbook-preview-yard {
  top: 0;
  bottom: 0;
  width: 40px;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.98) 0 4px,
    transparent 4px 9px,
    rgba(255, 255, 255, 0.98) 9px 13px,
    transparent 13px 18px
  );
}

.stripe-left {
  left: 0;
}

.stripe-mid {
  left: 31.5%;
}

.stripe-right {
  left: 63%;
}

.playbook-preview-hash {
  width: 70px;
  top: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0 38px,
    rgba(255, 255, 255, 0.98) 38px 42px,
    transparent 42px 85px
  );
}

.hash-left {
  left: 0;
}

.hash-right {
  right: 0;
}

.playbook-preview-node {
  position: absolute;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid #1f2937;
  background: rgba(255, 255, 255, 0.96);
  color: #111827;
  font-size: 12px;
  font-weight: 500;
  z-index: 1;
}

@media (max-width: 1100px) {
  .book-layout {
    grid-template-columns: 1fr;
  }

  .tactic-list {
    max-height: 320px;
  }

  .tactic-bucket-grid {
    grid-template-columns: 1fr 1fr;
  }

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

  .playbook-create-modal {
    grid-template-columns: 1fr;
    min-height: auto;
    gap: 20px;
  }

  .editor-shell {
    grid-template-columns: 1fr;
  }

  .editor-rail {
    flex-direction: row;
    overflow-x: auto;
  }

  .rail-btn {
    width: 72px;
    height: 72px;
    flex: 0 0 auto;
    border-right: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 0;
  }

  .editor-bottom-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .tactic-bucket-grid {
    grid-template-columns: 1fr;
  }

  .editor-topbar {
    align-items: stretch;
  }

  .topbar-left,
  .topbar-right {
    width: 100%;
  }

  .play-name-input {
    width: 100%;
  }
}
</style>


