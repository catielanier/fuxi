<script setup lang="ts">
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, onValue, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'

defineProps<{
  easterEggVisible?: boolean
}>()

const router = useRouter()
const route = useRoute()

const auth = getAuth(firebase)
const db = getDatabase(firebase)

const name = ref('')
const isLoggedIn = ref(false)
const menuOpen = ref(false)
const menuElement = ref<HTMLElement | null>(null)

let unsubscribeAuth: (() => void) | null = null
let unsubscribeUser: (() => void) | null = null

const navigationLinks = computed(() =>
  isLoggedIn.value
    ? [
        { to: '/decks', english: 'Decks', chinese: '牌组' },
        { to: '/listening', english: 'Listening', chinese: '听力练习' },
        { to: '/progress', english: 'Progress', chinese: '学习进度' },
        { to: '/history', english: 'History', chinese: '复习记录' },
      ]
    : [
        { to: '/login', english: 'Login', chinese: '登录' },
        { to: '/register', english: 'Register', chinese: '注册' },
      ],
)

const closeMenu = (): void => {
  menuOpen.value = false
}

const toggleMenu = (): void => {
  menuOpen.value = !menuOpen.value
}

const handleOutsideClick = (event: PointerEvent): void => {
  if (!menuOpen.value) return

  if (
    event.target instanceof Node &&
    !menuElement.value?.contains(event.target)
  ) {
    closeMenu()
  }
}

const handleKeydown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') closeMenu()
}

const handleLogout = async (): Promise<void> => {
  closeMenu()
  await auth.signOut()
  await router.push('/')
}

watch(
  () => route.fullPath,
  closeMenu,
)

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    unsubscribeUser?.()
    unsubscribeUser = null

    isLoggedIn.value = user !== null
    name.value = ''

    if (!user) return

    const userRef = dbRef(db, `users/${user.uid}`)

    unsubscribeUser = onValue(
      userRef,
      (snapshot) => {
        const userData = snapshot.val() as {
          givenName?: string
          given?: string
          givenNameZh?: string
        } | null

        name.value =
          userData?.givenNameZh ||
          userData?.givenName ||
          userData?.given ||
          user.displayName ||
          ''
      },
      (err) => {
        console.error('Unable to load navigation user:', err)
        name.value = user.displayName || ''
      },
    )
  })

  document.addEventListener('pointerdown', handleOutsideClick)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeUser?.()

  document.removeEventListener('pointerdown', handleOutsideClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <header class="top-nav">
    <RouterLink
      to="/"
      class="branding"
      aria-label="Fuxi — Home"
    >
      <span class="brand-name" lang="zh-Hans">
        <template v-if="easterEggVisible">
          <img src="@/assets/vue.svg" alt="Vue" />
        </template>
        <template v-else>复</template>习
      </span>

      <span class="brand-subtitle">
        Review · Revise · Study again
      </span>
    </RouterLink>

    <nav class="desktop-nav" aria-label="Main navigation">
      <ul>
        <li v-for="link in navigationLinks" :key="link.to">
          <RouterLink :to="link.to" class="nav-link">
            <span class="original">{{ link.english }}</span>
            <span
              class="translated"
              lang="zh-Hans"
              aria-hidden="true"
            >
              {{ link.chinese }}
            </span>
          </RouterLink>
        </li>

        <li v-if="isLoggedIn">
          <button type="button" class="nav-link" @click="handleLogout">
            <span class="original">Logout</span>
            <span class="translated" lang="zh-Hans" aria-hidden="true">
              登出
            </span>
          </button>
        </li>
      </ul>
    </nav>

    <div class="nav-right">
      <span v-if="isLoggedIn" class="greeting">
        你好<span v-if="name">，{{ name }}</span>
      </span>

      <div ref="menuElement" class="mobile-menu">
        <button
          type="button"
          class="hamburger"
          aria-label="Toggle navigation menu"
          aria-controls="mobile-navigation"
          :aria-expanded="menuOpen"
          @click="toggleMenu"
        >
          <svg
            v-if="!menuOpen"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>

          <svg
            v-else
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <nav
          v-if="menuOpen"
          id="mobile-navigation"
          class="mobile-dropdown"
          aria-label="Mobile navigation"
        >
          <RouterLink
            v-for="link in navigationLinks"
            :key="link.to"
            :to="link.to"
            @click="closeMenu"
          >
            <span>{{ link.english }}</span>

            <span lang="zh-Hans">
              {{ link.chinese }}
            </span>
          </RouterLink>

          <button
            v-if="isLoggedIn"
            type="button"
            class="mobile-logout"
            @click="handleLogout"
          >
            <span>Logout</span>
            <span lang="zh-Hans">登出</span>
          </button>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-nav {
  position: relative;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  padding: 1rem;
  color: var(--color-text);
  font-family: var(--font-ui);
}

.branding {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex-shrink: 0;
  color: var(--color-text);
  text-decoration: none;
}

.brand-name {
  display: flex;
  align-items: center;
  font-family: var(--font-brand);
  font-size: 2rem;
  line-height: 1.2;
}

.brand-name img {
  width: 2rem;
  height: 2rem;
}

.brand-subtitle {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.desktop-nav ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-background) r g b / 78%);
  backdrop-filter: blur(12px);
  list-style: none;
}

.nav-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 5rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.nav-link .original,
.nav-link .translated {
  transition: opacity 0.2s ease;
}

.nav-link .translated {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  opacity: 0;
}

.nav-link:hover .original,
.nav-link:focus-visible .original {
  opacity: 0;
}

.nav-link:hover .translated,
.nav-link:focus-visible .translated {
  opacity: 1;
}

.nav-link.router-link-active {
  background: rgb(from var(--color-primary) r g b / 12%);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.greeting {
  font-size: 0.9rem;
  white-space: nowrap;
}

.mobile-menu {
  position: relative;
  display: none;
}

.hamburger {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background: rgb(from var(--color-background) r g b / 85%);
  color: var(--color-text);
  cursor: pointer;
}

.mobile-dropdown {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  width: min(18rem, calc(100vw - 2rem));
  max-height: 70vh;
  overflow-y: auto;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-background) r g b / 96%);
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 36px rgb(0 0 0 / 0.2);
}

.mobile-dropdown a,
.mobile-logout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.mobile-dropdown a:hover,
.mobile-logout:hover,
.mobile-dropdown a.router-link-active {
  background: rgb(from var(--color-primary) r g b / 15%);
}

.mobile-dropdown [lang='zh-Hans'] {
  font-family: var(--font-hanzi);
  color: var(--color-text-muted);
}

@media (max-width: 850px) {
  .top-nav {
    flex-wrap: nowrap;
  }

  .desktop-nav {
    display: none;
  }

  .mobile-menu {
    display: block;
  }

  .brand-subtitle {
    display: none;
  }
}
</style>