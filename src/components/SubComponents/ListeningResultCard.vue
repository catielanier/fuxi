<script setup lang="ts">
import { computed } from 'vue'
import type { ListeningCardResult } from '@/data/types'
import { getAudioUrl } from '@/utils/listening'

const props = defineProps<{
  result: ListeningCardResult
  number: number
  isPlaying: boolean
}>()

const emit = defineEmits<{
  play: [index: number]
}>()

const audioUrl = computed(() => getAudioUrl(props.result.audio))
</script>

<template>
  <article
    class="listening-result-card"
    :class="result.correct ? 'correct-card' : 'incorrect-card'"
  >
    <header class="card-header">
      <span>Question {{ number }}</span>

      <strong :class="result.correct ? 'correct' : 'incorrect'">
        {{ result.correct ? 'Correct' : 'Incorrect' }}
      </strong>
    </header>

    <div class="card-body">
      <div class="playback">
        <button
          v-if="audioUrl"
          type="button"
          class="play-button"
          :aria-label="isPlaying ? 'Stop audio' : 'Play pronunciation'"
          @click="emit('play', number - 1)"
        >
          <svg
            v-if="isPlaying"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="6" y="5" width="4" height="14" />
            <rect x="14" y="5" width="4" height="14" />
          </svg>

          <svg
            v-else
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>

        <span>Pronunciation</span>
      </div>

      <div class="answer-section">
        <h4>Your Answer</h4>

        <p
          class="submitted"
          :class="result.correct ? 'correct' : 'incorrect'"
          lang="zh-Hans"
        >
          {{ result.submitted || 'No answer' }}
        </p>
      </div>

      <div class="answer-section">
        <h4>Accepted Answers</h4>

        <ul>
          <li
            v-for="answer in result.acceptedAnswers"
            :key="answer.hanzi"
          >
            <strong lang="zh-Hans">
              {{ answer.hanzi }}
            </strong>

            <span>
              {{ answer.english.join(', ') }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </article>
</template>

<style scoped>
.listening-result-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-surface) r g b / 85%);
}

.correct-card {
  border-left: 4px solid #54877b;
}

.incorrect-card {
  border-left: 4px solid #b85c5c;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
}

.correct {
  color: #167a39;
}

.incorrect {
  color: #b42318;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
}

.playback {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.playback span {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.play-button {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid var(--color-text);
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
}

.play-button:hover {
  background: var(--color-text);
  color: var(--color-background);
}

.answer-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.submitted {
  margin: 0;
  font-family: var(--font-hanzi);
  font-size: 1.6rem;
}

.answer-section ul {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.answer-section li {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.answer-section li strong {
  font-family: var(--font-hanzi);
  font-size: 1.5rem;
}

.answer-section li span {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
</style>