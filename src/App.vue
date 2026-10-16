<script setup lang="ts">
	import { ref, onMounted, onUnmounted } from 'vue'
	import { RouterView } from 'vue-router'
	import NavBar from './components/SubComponents/NavBar.vue';

	const easterEggVisible = ref(false)

	const secrets = ['evanyou', 'youyuxi']
	const maxLength = Math.max(...secrets.map((secret) => secret.length))

	let buffer = ''

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			easterEggVisible.value = false
			buffer = ''
			return
		}

		if (
			event.ctrlKey ||
			event.metaKey ||
			event.altKey ||
			(event.target instanceof HTMLElement &&
				(event.target.isContentEditable ||
					['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)))
		) {
			return
		}

		if (event.key.length !== 1 || easterEggVisible.value) return

		if (event.key === ' ') return

		buffer = (buffer + event.key.toLowerCase()).slice(-maxLength)

		if (secrets.some((secret) => buffer.endsWith(secret))) {
			easterEggVisible.value = true
			buffer = ''
		}
	}
	onMounted(() => {
		window.addEventListener('keydown', handleKeydown)
	})

	onUnmounted(() => {
		window.removeEventListener('keydown', handleKeydown)
	})
</script>

<template>
	<NavBar :easter-egg-visible="easterEggVisible" />
	<RouterView />
</template>
