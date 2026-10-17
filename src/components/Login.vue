<script setup lang="ts">
  import { ref } from 'vue'
  import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
  import { useRouter } from 'vue-router'
  const isLoading = ref(false)
  const error = ref('')
  const email = ref('')
  const password = ref('')

  const router = useRouter()

  const handleSubmit = async (): Promise<void> => {
    error.value = ''
    isLoading.value = true
    try {
      const auth = getAuth()
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    } catch (err) {
      error.value = 'Failed to log in. 登录失败。'
    } finally {
      isLoading.value = false
      await router.push('/decks')
    }
  }
</script>

<template>
  <main>
    <section class="content-container login">
      <h3><span>登录</span>·Login</h3>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <fieldset class="form-field email">
            <legend>Email Address</legend>
            <input v-model="email" type="email" name="email" placeholder="电子邮件" required />
          </fieldset>
          <fieldset class="form-field password">
            <legend>Password</legend>
            <input v-model="password" type="password" name="password" placeholder="密码" required />
          </fieldset>
          <button type="submit">
            <span class="original" :class="{ hidden: isLoading }">Log In</span>
            <span class="translated" :class="{ hidden: isLoading }" lang="zh-Hans" aria-hidden="true">登录</span>
            <span
              v-if="isLoading"
              class="spinner"
              aria-hidden="true"
            />
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
h3 {
  font-family: var(--font-ui);
  font-size: 1.5rem;
  line-height: 1.2;
  color: var(--color-text);
  margin-top: 0;
}
h3 span {
  font-family: var(--font-brand);
  line-height: 1.2;
  color: var(--color-text);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
}

.form-field {
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem 0.75rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  grid-column: span 6;
}

.form-field legend {
  padding: 0 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--font-brand);
}

.form-field input {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0.25rem 0;
  border: none;
  outline: none;
  background: transparent;
  color: inherit;
  font-family: var(--font-ui);
}

.form-field:focus-within {
  border-color: var(--color-primary);
}

button {
  grid-column: span 2;
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

button:hover {
  background: var(--color-text);
  transform: translateY(-2px);
}

button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

button span {
  grid-area: 1 / 1;
  white-space: nowrap;
  transition: opacity 0.5s ease-in-out;
}

button .original {
  font-family: var(--font-ui);
  opacity: 1;
}

button .translated {
  font-family: var(--font-brand);
  opacity: 0;
}

button:is(:hover, :focus-visible) .original {
  opacity: 0;
}

button:is(:hover, :focus-visible) .translated {
  opacity: 1;
}

button span.hidden {
  visibility: hidden;
}

.spinner {
  grid-area: 1 / 1;
  justify-self: center;
  align-self: center;

  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;

  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
  transform: none;
}
</style>