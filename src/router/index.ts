import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/components/Main.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/components/Login.vue'),
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/components/Register.vue'),
  },
  {
    path: '/decks',
    name: 'decks',
    component: () => import('@/components/DeckSelection.vue'),
  },
  {
    path: '/decks/:deckId',
    name: 'quiz',
    component: () => import('@/components/DeckQuiz.vue'),
  },
  {
    path: '/results',
    name: 'results',
    component: () => import('@/components/Results.vue'),
    props: () => ({
      result: JSON.parse(window.history.state?.guestResult ?? 'null'),
    }),
  },
  {
    path: '/results/:resultId',
    name: 'result',
    component: () => import('@/components/Results.vue'),
    props: true,
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/components/History.vue'),
  },
  {
    path: '/progress',
    name: 'progress',
    component: () => import('@/components/Progress.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
