<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'

const router = useRouter()

onMounted(async () => {
  const auth = await getAuth()
  if (auth.currentUser) {
    await router.push('/decks')
  }
})
</script>

<template>
  <main>
    <section class="content-container intro">
      <h1>Learn a little. Remember a lot.</h1>

      <p>
        Language learning isn't about memorizing everything at once.
        It's about building familiarity, strengthening recall, and
        returning to what you've learned until it sticks.
      </p>

      <p>
        Fuxi (复习) gives you a place to organize your Mandarin vocabulary,
        track your progress, and practice at your own pace. Whether
        you're picking up Mandarin anew or reconnecting with it after a break,
        every review brings you a little further.
      </p>

      <h2>Your Chinese journey, one word at a time.</h2>

      <div class="intro-actions">
        <RouterLink to="/register" class="get-started">
          <span class="original">Get Started</span>
          <span class="translated" lang="zh-Hans" aria-hidden="true">
            开始
          </span>
        </RouterLink>

        <RouterLink to="/login" class="login-link">
          Already have an account? Log in
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
h1 {
  font-family: var(--font-brand);
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.2;
  font-family: var(--font-ui);
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

.get-started {
  display: inline-grid;
  place-items: center;
  padding: 0.85rem 1.5rem;

  background: var(--color-primary);
  color: var(--color-primary-contrast);

  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;

  border-radius: 0.75rem;

  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.get-started:hover {
  background: var(--color-text);
  transform: translateY(-2px);
}

.get-started:focus-visible,
.login-link:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

.get-started span {
  grid-area: 1 / 1;
  white-space: nowrap;
  transition: opacity 0.5s ease-in-out;
}

.get-started .original {
  font-family: var(--font-ui);
  opacity: 1;
}

.get-started .translated {
  font-family: var(--font-brand);
  opacity: 0;
}

.get-started:is(:hover, :focus-visible) .original {
  opacity: 0;
}

.get-started:is(:hover, :focus-visible) .translated {
  opacity: 1;
}

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

@media (max-width: 600px) {
  .intro-actions {
    align-items: stretch;
  }

  .get-started {
    width: 100%;
  }

  .login-link {
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .get-started,
  .get-started span,
  .login-link {
    transition: none;
  }

  .get-started:hover {
    transform: none;
  }
}
</style>