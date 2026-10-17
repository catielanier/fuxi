<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const router = useRouter()

let unsubscribe: (() => void) | undefined

onMounted(() => {
  const auth = getAuth()

  unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      void router.replace('/decks')
    }
  })
})

onUnmounted(() => {
  unsubscribe?.()
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
/* Typography */

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

/* Actions */

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
  max-width: 100%;
}

/* Shared button styling */

.get-started,
.guest-link {
  display: inline-grid;
  place-items: center;

  min-height: 44px;
  padding: 0.85rem 1.5rem;

  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  text-align: center;

  border-radius: 0.75rem;

  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
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

/* Tablet */

@media (max-width: 768px) {
  h1 {
    font-size: clamp(1.875rem, 5vw, 2.5rem);
  }

  .intro-actions {
    margin-top: 1.5rem;
  }
}

/* Mobile */

@media (max-width: 600px) {
  h1 {
    font-size: clamp(1.75rem, 7vw, 2.25rem);
    line-height: 1.2;
    margin-bottom: 1rem;
  }

  p {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  h2 {
    font-size: 0.95rem;
    margin: 1.25rem 0;
  }

  .intro-actions {
    align-items: stretch;
    gap: 0.875rem;
    margin-top: 1.5rem;
  }

  .intro-buttons {
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
  }

  .get-started,
  .guest-link {
    width: 100%;
    max-width: 100%;
    min-height: 48px;
    padding: 0.85rem 1rem;
  }

  .login-link {
    text-align: center;
    padding: 0.25rem 0;
  }

  .guest-note {
    max-width: 100%;
    margin: 0 auto;
    font-size: 0.8rem;
    line-height: 1.5;
    text-align: center;
  }
}

/* Reduced motion */

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
