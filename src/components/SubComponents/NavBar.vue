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
        <li v-if="isLoggedIn && name" class="user-greeting">{{ name }}，你好！</li>

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
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 复习记录 </span>
            </RouterLink>
          </li>

          <li>
            <button id="logout" type="button" @click="handleLogout">
              <span class="original">Logout</span>
              <span class="translated" lang="zh-Hans" aria-hidden="true"> 登出 </span>
            </button>
          </li>
        </template>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
/* Header layout */

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2rem;

  width: min(100% - 2rem, 1200px);
  margin: 0 auto;
  padding-top: 1.5rem;
}

/* Branding */

.branding {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  margin-left: 2.5rem;

  text-align: left;
  text-decoration: none;
  color: var(--color-text);

  transition: color 0.2s ease-in-out;
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

.vue-logo {
  width: 0.9em;
  height: 0.9em;
  object-fit: contain;
  vertical-align: baseline;
}

/* Navigation container */

nav {
  flex-shrink: 0;
  min-width: 0;
}

nav ul {
  display: flex;
  align-items: center;
  gap: 1rem;

  width: fit-content;
  max-width: 100%;

  margin: 0;
  padding: 0.75rem 1.25rem;

  list-style: none;

  background: rgb(from var(--color-background) r g b / 78%);

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border: 1px solid rgb(from var(--color-border) r g b / 60%);
  border-radius: 0.75rem;
}

nav li {
  margin: 0;
  padding: 0;
}

/* Personalized greeting */

nav li.user-greeting {
  font-family: var(--font-brand);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Navigation links and logout button */

nav a,
nav button {
  display: grid;

  padding: 0;
  border: 0;
  background: transparent;

  color: var(--color-primary);
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 600;
  line-height: inherit;
  text-decoration: none;

  cursor: pointer;

  transition: color 0.2s ease-in-out;
}

nav a:is(:hover, :focus-visible),
nav button:is(:hover, :focus-visible) {
  color: var(--color-accent);
}

nav a.router-link-active {
  color: var(--color-text);
}

/* English / Chinese hover animation */

nav a span,
nav button span {
  grid-area: 1 / 1;
  white-space: nowrap;

  transition: opacity 0.5s ease-in-out;
}

nav .original {
  font-family: var(--font-ui);
  opacity: 1;
}

nav .translated {
  font-family: var(--font-brand);
  opacity: 0;
}

nav a:is(:hover, :focus-visible) .original,
nav button:is(:hover, :focus-visible) .original {
  opacity: 0;
}

nav a:is(:hover, :focus-visible) .translated,
nav button:is(:hover, :focus-visible) .translated {
  opacity: 1;
}

/* Keyboard accessibility */

nav a:focus-visible,
nav button:focus-visible,
.branding:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
  border-radius: 0.25rem;
}

/* Tablet */

@media (max-width: 900px) {
  .top-nav {
    gap: 1rem;
  }

  .branding {
    margin-left: 1rem;
  }

  nav {
    flex-shrink: 1;
  }

  nav ul {
    flex-wrap: wrap;
    justify-content: center;
  }
}

/* Mobile */

@media (max-width: 600px) {
  .top-nav {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;

    padding-top: 1.5rem;
  }

  .branding {
    margin-left: 0;
    align-items: center;
    text-align: center;
  }

  .brand-name {
    font-size: 3rem;
  }

  .brand-subtitle {
    text-align: center;
  }

  nav {
    width: fit-content;
    max-width: 100%;
    flex-shrink: 1;
  }

  nav ul {
    width: fit-content;
    max-width: 100%;

    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem 1rem;

    padding: 0.75rem 1rem;
  }

  nav li.user-greeting {
    flex-basis: 100%;
    text-align: center;
  }

  nav a,
  nav button {
    font-size: 0.95rem;
  }
}

/* Reduced motion */

@media (prefers-reduced-motion: reduce) {
  .branding,
  nav a,
  nav button,
  nav a span,
  nav button span {
    transition: none;
  }
}
</style>
