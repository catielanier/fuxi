<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <main class="main-content">
    <section class="intro">
      <h1>Learn a little. Remember a lot.</h1>

      <p>
        Language learning isn't about memorizing everything at once.
        It's about building familiarity, strengthening recall, and
        returning to what you've learned until it sticks.
      </p>

      <p>
        Fuxi (复习) gives you a place to organize your vocabulary,
        track your progress, and practice at your own pace. Whether
        you're picking up a new language or reconnecting with one
        you've studied before, every review brings you a little further.
      </p>

      <h2>Your language journey, one word at a time.</h2>

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
.main-content {
  width: min(100% - 2rem, 1200px);
  margin: 1.5rem auto 0;
	text-align: left;
}

.intro {
  max-width: 100%;
  padding: 2rem 2.5rem;

  background: rgb(from var(--color-background) r g b / 78%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  border: 1px solid rgb(from var(--color-border) r g b / 60%);
  border-radius: 1rem;
}

h1 {
  font-family: var(--font-brand);
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
  .main-content {
    margin-top: 2rem;
  }

  .intro {
    padding: 1.5rem;
  }

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