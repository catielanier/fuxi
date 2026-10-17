<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, ref as dbRef, onValue } from 'firebase/database'
import firebase from '@/utils/firebase'
defineProps<{
  easterEggVisible: boolean
}>()

const router = useRouter()
const auth = getAuth()
const db = getDatabase(firebase)

const name = ref('')
const isLoggedIn = ref(false)

let unsubscribeAuth: (() => void) | null = null
let unsubscribeUser: (() => void) | null = null

const handleLogout = async (): Promise<void> => {
  await auth.signOut()
  isLoggedIn.value = false
  name.value = ''
  await router.push('/')
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    unsubscribeUser?.()
    unsubscribeUser = null

    isLoggedIn.value = user !== null
    name.value = ''

    if (!user) return

    const userRef = dbRef(db, `users/${user.uid}`)

    unsubscribeUser = onValue(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        name.value = ''
        return
      }

      const userData = snapshot.val()

      name.value = userData.givenNameZh || userData.givenName || ''
    })
  })
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeUser?.()
})
</script>

<template>
  <header class="top-nav">
    <RouterLink to="/" class="branding" aria-label="Fuxi — Home">
      <span class="brand-name" lang="zh-Hans">
        <img v-if="easterEggVisible" src="@/assets/vue.svg" alt="Vue" class="vue-logo" />
        <template v-else>复</template>习
      </span>
      <span class="brand-subtitle"> Review · Revise · Study again </span>
    </RouterLink>

    <nav aria-label="Main navigation">
      <ul>
        <li v-if="isLoggedIn" class="user-greeting">{{ name }}，你好！</li>
        <template v-if="!isLoggedIn">
          <li>
            <RouterLink id="login" to="/login">
              <span class="original">Login</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 登录 </span>
            </RouterLink>
          </li>

          <li>
            <RouterLink id="register" to="/register">
              <span class="original">Register</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 注册 </span>
            </RouterLink>
          </li>
        </template>
        <template v-else>
          <li>
            <RouterLink id="decks" to="/decks">
              <span class="original">Decks</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 牌组 </span>
            </RouterLink>
          </li>
          <li>
            <RouterLink id="history" to="/history">
              <span class="original">History</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true">复习记录</span>
            </RouterLink>
          </li>
          <li>
            <a id="logout" href="#" @click.prevent="handleLogout">
              <span class="original">Logout</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 登出 </span>
            </a>
          </li>
        </template>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;

  width: min(100% - 2rem, 1200px);
  margin: 0 auto;
  padding-top: 1.5rem;
}

.branding {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  margin-left: 2.5rem;
  text-align: left;
  text-decoration: none;
  color: var(--color-text);
}

.branding:is(:hover, :focus-visible) {
  color: var(--color-primary);
}

.brand-name {
  font-family: var(--font-brand);
  font-size: 3rem;
  line-height: 1.2;
}

.brand-subtitle {
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 600;
}

nav {
  flex-shrink: 0;
}

nav ul {
  display: flex;
  align-items: center;
  gap: 1rem;

  width: fit-content;
  margin: 0;
  padding: 0.75rem 1.25rem;

  list-style: none;
  background-color: var(--color-background);
  border-radius: 0.75rem;
}

nav li {
  margin: 0;
  padding: 0;
}

nav li.user-greeting {
  font-family: var(--font-brand);
  font-size: 1rem;
  font-weight: bold;
  color: var(--color-text-muted);
}

nav a {
  display: grid;

  color: var(--color-primary);
  font-family: var(--font-ui);
  font-weight: 600;
  text-decoration: none;

  transition: color 0.2s ease-in-out;
}

nav a:is(:hover, :focus-visible) {
  color: var(--color-accent);
}

nav a.router-link-active {
  color: var(--color-text);
}

/* English / Chinese hover animation */

nav a span {
  grid-area: 1 / 1;
  white-space: nowrap;

  transition: opacity 0.5s ease-in-out;
}

nav a .original {
  font-family: var(--font-ui);
  opacity: 1;
}

nav a .translated {
  font-family: var(--font-brand);
  opacity: 0;
}

nav a:is(:hover, :focus-visible) .original {
  opacity: 0;
}

nav a:is(:hover, :focus-visible) .translated {
  opacity: 1;
}

/* Responsive layout */

@media (max-width: 600px) {
  .top-nav {
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .branding {
    align-items: center;
    text-align: center;
  }
}

/* Accessibility */

@media (prefers-reduced-motion: reduce) {
  .branding,
  nav a,
  nav a span {
    transition: none;
  }
}
</style>
