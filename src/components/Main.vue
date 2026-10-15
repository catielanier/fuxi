<script>
 import { RouterLink } from 'vue-router'
</script>

<template>
  <main>
		<h1>复习</h1>
		<h2>Review · Revise · Study again</h2>
		<RouterLink id="login" to="/login">
			<span>Login</span>
		</RouterLink>
		|
		<RouterLink id="register" to="/register">
			<span>Register</span>
		</RouterLink>
	</main>
</template>

<style>
 h1 {
	 font-family: var(--font-brand);
 }

 h2 {
	 font-family: var(--font-ui);
	 font-size: 0.9rem;
 }

 a:hover span {
	 display: none;
 }

 a#login:hover::after {
	 content: "登录";
 }

 a#register:hover::after {
	 content: "注册";
 }
</style>
