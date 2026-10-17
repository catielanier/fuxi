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
  error.value = ''
  const isPasswordValid: boolean = password.value === verifyPassword.value
  if (!isPasswordValid) {
    error.value = 'Passwords do not match. 密码不匹配。'
    return
  }
  isLoading.value = true
  try {
    let isRegistered: boolean = false
    let isProfileCreated: boolean = false
    const auth = getAuth(firebase)
    const { user } = await createUserWithEmailAndPassword(auth, email.value.trim(), password.value)
    await sendEmailVerification(user, {
      url: `${import.meta.env.VITE_APP_URI}/login`,
      handleCodeInApp: false,
    })
    isRegistered = true
    const { uid } = user
    const profileData = {
      surname: surname.value.trim(),
      givenName: givenName.value.trim(),
      surnameZh: surnameZh.value.trim(),
      givenNameZh: givenNameZh.value.trim(),
      quizResults: [],
      createdAt: new Date().toISOString(),
    }
    const db = getDatabase(firebase)
    const userRef = dbRef(db, `users/${uid}`)
    await set(userRef, profileData)
    isProfileCreated = true
    if (isRegistered && isProfileCreated) {
      success.value = true
    }
  } catch (err) {
    error.value = 'Failed to create user account. 用户账户创建失败。'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main>
    <section class="content-container intro">
      <h3><span>祖册</span>·Register</h3>
      <p v-if="success">
        Account created successfully! Please check your email to verify your account.
        账户创建成功！请检查您的电子邮件以验证您的账户。
      </p>
      <p v-if="error" class="error">错误：{{ error }}</p>
      <form @submit.prevent="handleSubmit">
        <div class="form-grid">
          <fieldset class="form-field email">
            <legend>Email Address<span class="required" aria-hidden="true">*</span></legend>
            <input v-model="email" type="email" name="email" placeholder="电子邮件" required />
          </fieldset>
          <fieldset class="form-field password">
            <legend>Password<span class="required" aria-hidden="true">*</span></legend>
            <input v-model="password" type="password" name="password" placeholder="密码" required />
          </fieldset>
          <fieldset class="form-field password">
            <legend>Verify Password<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="verifyPassword"
              type="password"
              name="verifyPassword"
              placeholder="确认密码"
              required
            />
          </fieldset>
          <fieldset class="form-field">
            <legend>Last Name<span class="required" aria-hidden="true">*</span></legend>
            <input v-model="surname" type="text" name="surname" placeholder="姓（外文）" required />
          </fieldset>
          <fieldset class="form-field">
            <legend>First Name<span class="required" aria-hidden="true">*</span></legend>
            <input
              v-model="givenName"
              type="text"
              name="givenName"
              placeholder="名（外文）"
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
          <button type="submit" :disabled="isLoading || success" :aria-busy="isLoading">
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
  grid-column: span 3;
}

.form-field.email,
.form-field.password {
  grid-column: span 4;
}

.form-field legend {
  padding: 0 0.4rem;
  font-size: 0.85rem;
  font-weight: 500;
  font-family: var(--font-brand);
}

.form-field legend .required {
  color: var(--color-accent);
  font-family: var(--font-ui);
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
