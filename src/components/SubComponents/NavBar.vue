<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged, type Unsubscribe } from 'firebase/auth'
import { getDatabase, ref as dbRef, onValue } from 'firebase/database'
import firebase from '@/utils/firebase'

defineProps<{
  easterEggVisible: boolean
}>()

const router = useRouter()

const name = ref('')
const isLoggedIn = ref(false)

let unsubscribeAuth: Unsubscribe | null = null
let unsubscribeUser: Unsubscribe | null = null

const greeting = computed(() => (name.value ? `${name.value}，你好！` : '你好！'))

const handleLogout = async (): Promise<void> => {
  const auth = getAuth()

  await auth.signOut()
  await router.push('/')
}

onMounted(() => {
  const auth = getAuth()

  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    unsubscribeUser?.()
    unsubscribeUser = null

    isLoggedIn.value = user !== null
    name.value = ''

    if (!user) return

    const db = getDatabase(firebase)
    const userRef = dbRef(db, `users/${user.uid}`)

    unsubscribeUser = onValue(userRef, (snapshot) => {
      if (!snapshot.exists()) return

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
        <template v-if="easterEggVisible">
          <img src="@/assets/vue.svg" alt="Vue" class="easter-egg" />
        </template>
        <template v-else>复</template>习
      </span>

      <span class="brand-subtitle"> Review · Revise · Study again </span>
    </RouterLink>

    <nav aria-label="Main navigation">
      <ul>
        <template v-if="isLoggedIn">
          <li class="greeting" lang="zh-Hans">
            {{ greeting }}
          </li>

          <li>
            <RouterLink to="/decks">
              <span class="original">Decks</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 牌组 </span>
            </RouterLink>
          </li>

          <li>
            <RouterLink to="/history">
              <span class="original">History</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 历史 </span>
            </RouterLink>
          </li>

          <li>
            <RouterLink id="progress" to="/progress">
              <span class="original">Progress</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 学习进度 </span>
            </RouterLink>
          </li>

          <li>
            <button type="button" class="nav-action" @click="handleLogout">
              <span class="original">Logout</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 退出 </span>
            </button>
          </li>
        </template>

        <template v-else>
          <li>
            <RouterLink to="/login">
              <span class="original">Login</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 登录 </span>
            </RouterLink>
          </li>

          <li>
            <RouterLink to="/register">
              <span class="original">Register</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 注册 </span>
            </RouterLink>
          </li>
        </template>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
/* Header */

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;

  width: min(100% - 2rem, 1200px);
  margin: 0 auto;
  padding-top: 1.5rem;
  box-sizing: border-box;
}

/* Branding */

.branding {
  display: flex;
  flex-direction: column;
  flex: 0 1 auto;
  min-width: 0;
  margin-left: 2.5rem;

  color: var(--color-text);
  text-decoration: none;

  transition: color 0.2s ease-in-out;
}

.branding:is(:hover, :focus-visible) {
  color: var(--color-primary);
}

.brand-name {
  display: flex;
  align-items: center;

  font-family: var(--font-brand);
  font-size: 3rem;
  line-height: 1.2;
}

.brand-subtitle {
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

.easter-egg {
  width: 1em;
  height: 1em;
  object-fit: contain;
}

/* Navigation */

nav {
  flex: 0 0 auto;
}

nav ul {
  display: flex;
  align-items: center;
  gap: 1rem;

  width: fit-content;
  margin: 0;
  padding: 0.75rem 1.25rem;

  list-style: none;
  background: var(--color-background);
  border-radius: 0.75rem;
}

nav li {
  margin: 0;
  padding: 0;
}

.greeting {
  color: var(--color-text);
  font-family: var(--font-brand);
  font-size: 0.9rem;
  white-space: nowrap;
}

/* Navigation links and buttons */

nav a,
.nav-action {
  display: grid;
  align-items: center;
  justify-items: center;

  padding: 0;
  border: 0;
  background: transparent;

  color: var(--color-primary);
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  text-decoration: none;
  white-space: nowrap;

  cursor: pointer;
  transition: color 0.2s ease-in-out;
}

nav a:is(:hover, :focus-visible),
.nav-action:is(:hover, :focus-visible) {
  color: var(--color-accent);
}

nav a.router-link-active {
  color: var(--color-text);
}

nav a:focus-visible,
.nav-action:focus-visible,
.branding:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 0.25rem;
}

/* English / Chinese animation */

nav a span,
.nav-action span {
  grid-area: 1 / 1;
  white-space: nowrap;
  text-align: center;

  transition: opacity 0.5s ease-in-out;
}

nav .original {
  font-family: var(--font-ui);
  opacity: 1;
}

nav .translated {
  font-family: var(--font-brand);
  font-size: 0.9rem;
  opacity: 0;
}

nav a:is(:hover, :focus-visible) .original,
.nav-action:is(:hover, :focus-visible) .original {
  opacity: 0;
}

nav a:is(:hover, :focus-visible) .translated,
.nav-action:is(:hover, :focus-visible) .translated {
  opacity: 1;
}

/* Tablet */

@media (max-width: 900px) {
  .top-nav {
    gap: 1rem;
  }

  .branding {
    margin-left: 1rem;
  }

  nav ul {
    gap: 0.75rem;
    padding: 0.65rem 1rem;
  }

  .brand-name {
    font-size: 2.5rem;
  }

  .brand-subtitle {
    font-size: 0.75rem;
  }
}

/* Mobile */

@media (max-width: 600px) {
  .top-nav {
    width: calc(100% - 2rem);
    margin: 0 auto;
    padding-top: 1rem;

    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .branding {
    flex: 0 1 auto;
    align-items: flex-start;
    min-width: 0;
    margin-left: 0;

    text-align: left;
  }

  .brand-name {
    font-size: 2rem;
    line-height: 1.1;
  }

  .brand-subtitle {
    display: none;
  }

  nav {
    flex: 0 0 auto;
  }

  nav ul {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;

    margin: 0;
    padding: 0.5rem 0.75rem;

    border-radius: 0.5rem;
  }

  nav a,
  .nav-action {
    font-size: 0.75rem;
  }

  nav .translated {
    font-size: 0.75rem;
  }

  .greeting {
    font-size: 0.7rem;
  }
}

/* Very narrow screens */

@media (max-width: 380px) {
  .top-nav {
    width: calc(100% - 1.5rem);
    gap: 0.35rem;
  }

  .brand-name {
    font-size: 1.75rem;
  }

  .brand-subtitle {
    font-size: 0.48rem;
  }

  nav ul {
    gap: 0.4rem;
    padding: 0.45rem 0.5rem;
  }

  nav a,
  .nav-action {
    font-size: 0.7rem;
  }

  nav .translated {
    font-size: 0.7rem;
  }

  .greeting {
    font-size: 0.65rem;
  }
}

/* Reduced motion */

@media (prefers-reduced-motion: reduce) {
  .branding,
  nav a,
  .nav-action,
  nav a span,
  .nav-action span {
    transition: none;
  }
}
</style>
