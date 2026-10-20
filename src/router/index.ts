import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),

  routes: [
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
    },
    {
      path: '/results/:resultId',
      name: 'result',
      component: () => import('@/components/Results.vue'),
    },
    {
      path: '/listening',
      name: 'listening',
      component: () => import('@/components/ListeningDeckSelection.vue'),
    },
    {
      path: '/listening/:deckId',
      name: 'listening-quiz',
      component: () => import('@/components/ListeningQuiz.vue'),
    },
    {
      path: '/listening-results',
      name: 'listening-results',
      component: () => import('@/components/ListeningResults.vue'),
    },
    {
      path: '/listening-results/:resultId',
      name: 'listening-result',
      component: () => import('@/components/ListeningResults.vue'),
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
  ],
})

export default router