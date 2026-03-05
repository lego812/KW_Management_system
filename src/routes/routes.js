import MainView from '../views/MainView.vue'
import LoginView from '../views/LoginView.vue'
import PlayersView from '../views/PlayersView.vue'
import TacticsView from '../views/TacticsView.vue'
import UsersView from '../views/UsersView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: UsersView,
    meta: {
      requiresAuth: true,
      allowedRoles: ['ADMIN', 'COACH'],
      section: 'USER OVERVIEW',
      description: '유저 권한과 승인 상태를 한 화면에서 관리합니다.',
    },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: MainView,
    meta: {
      requiresAuth: true,
      section: 'TEAM STATUS',
      description: '팀 현황 지표를 요약해 확인합니다.',
    },
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      requiresAuth: false,
      section: 'AUTHENTICATION',
      description: '이메일 또는 Google 로그인으로 접근합니다.',
    },
  },
  {
    path: '/players',
    name: 'players',
    component: PlayersView,
    meta: {
      requiresAuth: true,
      section: 'PLAYER MANAGEMENT',
      description: '선수 등록과 상태 관리를 처리합니다.',
    },
  },
  {
    path: '/tactics',
    name: 'tactics',
    component: TacticsView,
    meta: {
      requiresAuth: true,
      section: 'TACTIC REGISTER/EDIT',
      description: '전술 등록과 버전 관리를 처리합니다.',
    },
  },
]

export default routes
