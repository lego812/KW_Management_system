import MainView from '../views/MainView.vue'
import LoginView from '../views/LoginView.vue'
import PlayersView from '../views/PlayersView.vue'
import TacticsView from '../views/TacticsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: MainView,
    meta: {
      section: 'MAIN DASHBOARD',
      description: '사이드바를 축소하면 더 효율적으로 콘텐츠를 확인할 수 있습니다.',
    },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      section: 'AUTHENTICATION',
      description: '이메일 또는 Google 로그인을 통해 시스템에 접근합니다.',
    },
  },
  {
    path: '/players',
    name: 'players',
    component: PlayersView,
    meta: {
      section: 'PLAYER MANAGEMENT',
      description: '선수 등록, 목록 조회, 상태 관리를 한 화면에서 처리합니다.',
    },
  },
  {
    path: '/tactics',
    name: 'tactics',
    component: TacticsView,
    meta: {
      section: 'TACTIC REGISTER/EDIT',
      description: '전술 등록을 단계별로 분리해 저장 흐름을 단순화했습니다.',
    },
  },
]

export default routes
