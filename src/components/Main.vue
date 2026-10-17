<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const router = useRouter()

onMounted(() => {
  const auth = getAuth()

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      void router.replace('/decks')
    }

    unsubscribe()
  })
})
</script>

<template>
  <main>
    <section class="content-container intro">
      <h1>Learn a little. Remember a lot.</h1>

      <p>
        Language learning isn't about memorizing everything at once. It's about building
        familiarity, strengthening recall, and returning to what you've learned until it sticks.
      </p>

      <p>
        Fuxi (复习) gives you a place to organize your Mandarin vocabulary, track your progress, and
        practice at your own pace. Whether you're picking up Mandarin anew or reconnecting with it
        after a break, every review brings you a little further.
      </p>

      <h2>Your Chinese journey, one word at a time.</h2>

      <div class="intro-actions">
        <div class="intro-buttons">
          <RouterLink to="/register" class="get-started">
            <span class="original">Get Started</span>
            <span class="translated" lang="zh-Hans" aria-hidden="true">开始</span>
          </RouterLink>

          <RouterLink to="/decks" class="guest-link">
            <span class="original">Continue as Guest</span>
            <span class="translated" lang="zh-Hans" aria-hidden="true">访客体验</span>
          </RouterLink>
        </div>

        <RouterLink to="/login" class="login-link"> Already have an account? Log in </RouterLink>

        <p class="guest-note">
          No account required to practice. Sign up to save your results and track your progress.
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped>
h1 {
  font-family: var(--font-ui);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.2;
  color: var(--color-text);
  margin: 0 0 1.25rem;
}

p {
  font-family: var(--font-ui);
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-text-muted);
  margin: 0 0 1.25rem;
  max-width: 50ch;
}

h2 {
  font-family: var(--font-ui);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--color-text);
  margin: 1.5rem 0;
}

.intro-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  margin-top: 2rem;
}

.intro-buttons {
  display: flex;
  align-items: stretch;
  gap: 1rem;
}

.get-started,
.guest-link {
  display: inline-grid;
  place-items: center;
  padding: 0.85rem 1.5rem;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0.75rem;

  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

/* Primary action */

.get-started {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  border: 1px solid var(--color-primary);
}

.get-started:hover {
  background: var(--color-text);
  border-color: var(--color-text);
  transform: translateY(-2px);
}

/* Guest action */

.guest-link {
  background: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.guest-link:hover {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  transform: translateY(-2px);
}

/* Shared bilingual hover animation */

.get-started span,
.guest-link span {
  grid-area: 1 / 1;
  white-space: nowrap;
  transition: opacity 0.5s ease-in-out;
}

.get-started .original,
.guest-link .original {
  font-family: var(--font-ui);
  opacity: 1;
}

.get-started .translated,
.guest-link .translated {
  font-family: var(--font-brand);
  opacity: 0;
}

.get-started:is(:hover, :focus-visible) .original,
.guest-link:is(:hover, :focus-visible) .original {
  opacity: 0;
}

.get-started:is(:hover, :focus-visible) .translated,
.guest-link:is(:hover, :focus-visible) .translated {
  opacity: 1;
}

/* Login link */

.login-link {
  color: var(--color-primary);
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;

  transition: color 0.2s ease;
}

.login-link:hover {
  color: var(--color-accent);
  text-decoration: underline;
  text-underline-offset: 4px;
}

/* Guest explanation */

.guest-note {
  margin: 0;
  max-width: 45ch;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}

/* Focus states */

.get-started:focus-visible,
.guest-link:focus-visible,
.login-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

/* Responsive */

@media (max-width: 600px) {
  .intro-actions {
    align-items: stretch;
  }

  .intro-buttons {
    flex-direction: column;
  }

  .get-started,
  .guest-link {
    width: 100%;
  }

  .login-link,
  .guest-note {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .get-started,
  .guest-link,
  .get-started span,
  .guest-link span,
  .login-link {
    transition: none;
  }

  .get-started:hover,
  .guest-link:hover {
    transform: none;
  }
}
</style>
