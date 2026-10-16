<script setup lang="ts">
import { RouterLink } from 'vue-router'
defineProps<{
  easterEggVisible: boolean
}>()
</script>

<template>
  <header class="top-nav">
    <RouterLink to="/" class="branding" aria-label="Fuxi — Home">
      <span class="brand-name" lang="zh-Hans">
        <img
          v-if="easterEggVisible"
          src="@/assets/vue.svg"
          alt="Vue"
          class="vue-logo"
        />
        <template v-else>复</template>习
      </span>
      <span class="brand-subtitle">
        Review · Revise · Study again
      </span>
    </RouterLink>

    <nav aria-label="Main navigation">
      <ul>
        <li>
          <RouterLink id="login" to="/login">
            <span class="original">Login</span>
            <span class="translated" lang="zh-Hans" aria-hidden="true">
              登录
            </span>
          </RouterLink>
        </li>

        <li>
          <RouterLink id="register" to="/register">
            <span class="original">Register</span>
            <span class="translated" lang="zh-Hans" aria-hidden="true">
              注册
            </span>
          </RouterLink>
        </li>
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
  font-size: 0.9rem;
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