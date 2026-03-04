import MainView from '../views/MainView.vue'
import LoginView from '../views/LoginView.vue'
import PlayersView from '../views/PlayersView.vue'
import TacticsView from '../views/TacticsView.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: MainView,
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/players',
    name: 'players',
    component: PlayersView,
  },
  {
    path: '/tactics',
    name: 'tactics',
    component: TacticsView,
  },
]

export default routes
