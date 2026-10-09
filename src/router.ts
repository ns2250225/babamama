import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SongSelectView from './views/SongSelectView.vue'
import GameView from './views/GameView.vue'
import SettingsView from './views/SettingsView.vue'
import HelpView from './views/HelpView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/select', name: 'select', component: SongSelectView },
    { path: '/game', name: 'game', component: GameView },
    { path: '/settings', name: 'settings', component: SettingsView },
    { path: '/help', name: 'help', component: HelpView },
  ],
})
