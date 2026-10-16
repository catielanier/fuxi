<script setup lang="ts">
  import {RouterLink} from 'vue-router'
</script>

<template>
  <div class="top-nav">
    <nav>
      <ul>
        <li>
          <RouterLink id="login" to="/login">
            <span>Login</span>
            <span class="translated" aria-hidden="true">登录</span>
          </RouterLink>
        </li>
        <li>
          <RouterLink id="register" to="/register">
            <span>Register</span>
            <span class="translated" aria-hidden="true">注册</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<style scoped>
  ul {
    list-style: none;
    display: flex;
    width: fit-content;
    padding: 15px 25px;
    gap: 1rem;
    border-radius: 0.5rem;
    background-color: color-mix(
      in srgb,
      var(--color-background) 70%,
      transparent
    );
  }

  a {
    display: grid;
    text-decoration: none;
    font-weight: bold;
    color: var(--color-primary)
  }

  a:is(:hover, :focus-visible) {
    color: var(--color-accent);
  }

  a:active {
    color: var(--color-text);
  }

  a span {
    grid-area: 1 / 1;
    transition: opacity 0.5s ease-in-out, color 0.5s ease-in-out;
  }

  a span:first-child {
    font-family: var(--font-ui);
    opacity: 1;
  }

  a .translated {
    font-family: var(--font-brand);
    font-size: 0.9rem;
    opacity: 0;
  }

  a:is(:hover, :focus-visible) span:first-child {
    opacity: 0;
  }

  a:is(:hover, :focus-visible) .translated {
    opacity: 1;
  }
</style>