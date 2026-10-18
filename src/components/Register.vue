<script setup lang="ts">
import { ref } from 'vue'
import { getDatabase, ref as dbRef, set } from 'firebase/database'
import { createUserWithEmailAndPassword, sendEmailVerification, getAuth } from 'firebase/auth'
import firebase from '@/utils/firebase'

const email = ref('')
const password = ref('')
const verifyPassword = ref('')
const surname = ref('')
const givenName = ref('')
const surnameZh = ref('')
const givenNameZh = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref(false)

const handleSubmit = async (): Promise<void> => {
  if (isLoading.value || success.value) return

  error.value = ''

  if (password.value !== verifyPassword.value) {
    error.value = 'Passwords do not match. 密码不匹配。'
    return
  }

  isLoading.value = true

  try {
    const auth = getAuth(firebase)
    const { user } = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)

    const profileData = {
      surname: surname.value.trim(),
      givenName: givenName.value.trim(),
      surnameZh: surnameZh.value.trim(),
      givenNameZh: givenNameZh.value.trim(),
      quizResults: [],
      createdAt: new Date().toISOString(),
    }

    try {
      const db = getDatabase(firebase)
      const userRef = dbRef(db, `users/${user.uid}`)
      await set(userRef, profileData)
    } catch {
      error.value =
        'Account created, but your profile could not be saved. ' +
        '账户已创建，但无法保存个人资料。'
      return
    }

    try {
      await sendEmailVerification(user, {
        url: `${import.meta.env.VITE_APP_URI}/login`,
        handleCodeInApp: false,
      })
    } catch {
      error.value =
        'Account created, but the verification email could not be sent. ' +
        '账户已创建，但验证邮件发送失败。'
      return
    }

    success.value = true
  } catch {
    error.value = 'Failed to create user account. 用户账户创建失败。'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main>
    <section class="content-container intro">
      <h3><span lang="zh-Hans">注册</span>·Register</h3>

      <p v-if="success" class="success" role="status">
        Account created successfully! Please check your email to verify your account.
        账户创建成功！请检查您的电子邮件以验证您的账户。
      </p>

      <p v-if="error" class="error" role="alert">
        {{ error }}
      </p>

      <form v-if="!success" @submit.prevent="handleSubmit">
        <div class="form-grid">
          <fieldset class="form-field email">
            <legend>Email Address<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="email"
              type="email"
              name="email"
              placeholder="电子邮件"
              autocomplete="email"
              required
            />
          </fieldset>

          <fieldset class="form-field password">
            <legend>Password<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="password"
              type="password"
              name="password"
              placeholder="密码"
              autocomplete="new-password"
              required
            />
          </fieldset>

          <fieldset class="form-field password">
            <legend>Verify Password<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="verifyPassword"
              type="password"
              name="verifyPassword"
              placeholder="确认密码"
              autocomplete="new-password"
              required
            />
          </fieldset>

          <fieldset class="form-field">
            <legend>Last Name<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="surname"
              type="text"
              name="surname"
              placeholder="姓（外文）"
              autocomplete="family-name"
              required
            />
          </fieldset>

          <fieldset class="form-field">
            <legend>First Name<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="givenName"
              type="text"
              name="givenName"
              placeholder="名（外文）"
              autocomplete="given-name"
              required
            />
          </fieldset>

          <fieldset class="form-field">
            <legend>Last Name (Chinese)</legend>
            <input v-model="surnameZh" type="text" name="surnameZh" placeholder="姓（中文）" />
          </fieldset>

          <fieldset class="form-field">
            <legend>First Name (Chinese)</legend>
            <input v-model="givenNameZh" type="text" name="givenNameZh" placeholder="名（中文）" />
          </fieldset>

          <button type="submit" :disabled="isLoading" :aria-busy="isLoading">
            <span class="original" :class="{ hidden: isLoading }"> Create Account </span>

            <span
              class="translated"
              :class="{ hidden: isLoading }"
              lang="zh-Hans"
              aria-hidden="true"
            >
              创建账户
            </span>

            <span v-if="isLoading" class="spinner" aria-hidden="true" />
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
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
}

.form-field {
  box-sizing: border-box;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem 0.75rem;

  border: 1px solid var(--color-text);
  border-radius: 0.5rem;

  grid-column: span 3;
}

.form-field.email,
.form-field.password {
  grid-column: span 4;
}

.form-field legend {
  max-width: 100%;
  padding: 0 0.4rem;

  font-family: var(--font-brand);
  font-size: 0.85rem;
  font-weight: 500;
  line-height: 1.3;
}

.form-field legend .required {
  color: var(--color-accent);
  font-family: var(--font-ui);
}

.form-field input {
  display: block;
  box-sizing: border-box;

  width: 100%;
  min-width: 0;
  padding: 0.25rem 0;

  border: none;
  outline: none;
  background: transparent;

  color: var(--color-text);
  font-family: var(--font-ui);
  font-size: 1rem;
}

.form-field:focus-within {
  border-color: var(--color-primary);
}

.error,
.success {
  margin: 0 0 1.5rem;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  line-height: 1.6;
}

.error {
  color: #a33b32;
}

.success {
  color: var(--color-text);
}

button {
  grid-column: span 3;
  justify-self: start;

  display: inline-grid;
  place-items: center;

  box-sizing: border-box;
  min-width: 160px;
  min-height: 44px;
  padding: 0.85rem 1.5rem;

  border: none;
  border-radius: 0.75rem;

  background: var(--color-primary);
  color: var(--color-primary-contrast);

  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;

  cursor: pointer;

  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

button:hover:not(:disabled) {
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

@media (max-width: 768px) {
  .form-field,
  .form-field.email,
  .form-field.password {
    grid-column: span 6;
  }

  button {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  .form-field,
  .form-field.email,
  .form-field.password {
    grid-column: 1 / -1;
  }

  .form-field legend {
    font-size: 0.8rem;
  }

  button {
    grid-column: 1 / -1;
    justify-self: stretch;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  button,
  button span {
    transition: none;
  }

  .spinner {
    animation: none;
    border-right-color: currentColor;
    opacity: 0.7;
  }

  button:hover {
    transform: none;
  }
}
</style>
