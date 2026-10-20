<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ListeningQuestion } from '@/data/types'

const props = defineProps<{
  question: ListeningQuestion
  questionNumber: number
  totalQuestions: number
  answer: string
  answered: boolean
  correct: boolean | null
  isPlaying: boolean
  isSaving: boolean
  error: string
}>()

const emit = defineEmits<{
  'update:answer': [value: string]
  play: []
  submit: []
  continue: []
}>()

const inputElement = ref<HTMLInputElement | null>(null)

const answerValue = computed({
  get: () => props.answer,
  set: (value: string) => emit('update:answer', value),
})

const buttonLabel = computed(() => {
  if (props.isSaving) return 'Saving results...'
  if (!props.answered) return 'Submit Answer'

  return props.questionNumber === props.totalQuestions
    ? 'Finish Review'
    : 'Next Question'
})

const handleSubmit = (): void => {
  if (props.isSaving) return

  if (props.answered) {
    emit('continue')
  } else if (props.answer.trim()) {
    emit('submit')
  }
}

const focusInput = async (): Promise<void> => {
  await nextTick()
  inputElement.value?.focus()
}

defineExpose({ focusInput })
</script>

<template>
  <div class="listening-card">
    <div class="audio-section">
      <button
        type="button"
        class="play-button"
        :disabled="isSaving"
        :aria-label="
          isPlaying ? 'Stop pronunciation' : 'Play pronunciation'
        "
        @click="emit('play')"
      >
        <svg
          v-if="isPlaying"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="6" y="5" width="4" height="14" />
          <rect x="14" y="5" width="4" height="14" />
        </svg>

        <svg
          v-else
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      <p>
        {{ isPlaying ? 'Playing pronunciation...' : 'Play pronunciation' }}
      </p>
    </div>

    <form class="listening-form" @submit.prevent="handleSubmit">
      <label for="listening-answer">
        Enter the Chinese characters you hear
      </label>

      <input
        id="listening-answer"
        ref="inputElement"
        v-model="answerValue"
        type="text"
        lang="zh-Hans"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="输入汉字"
        :disabled="answered || isSaving"
      />

      <p
        v-if="answered"
        class="answer-feedback"
        :class="correct ? 'correct' : 'incorrect'"
        role="status"
      >
        {{ correct ? 'Correct!' : 'Incorrect.' }}
      </p>

      <div
        v-if="answered && correct && question.answers.length > 1"
        class="homophones"
      >
        <h4>Also acceptable</h4>

        <ul>
          <li
            v-for="candidate in question.answers"
            :key="candidate.hanzi"
          >
            <strong lang="zh-Hans">
              {{ candidate.hanzi }}
            </strong>

            <span>
              {{ candidate.english.join(', ') }}
            </span>
          </li>
        </ul>
      </div>

      <p v-if="error" class="quiz-error" role="alert">
        {{ error }}
      </p>

      <button
        type="submit"
        class="quiz-submit"
        :disabled="isSaving || (!answered && !answer.trim())"
      >
        {{ buttonLabel }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.listening-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  width: 100%;
}

.audio-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
}

.play-button {
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  border: 1px solid var(--color-text);
  border-radius: 50%;
  background: var(--color-text);
  color: var(--color-background);
  cursor: pointer;
}

.play-button:hover:not(:disabled) {
  opacity: 0.85;
}

.play-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.play-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.audio-section p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.listening-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 36rem;
}

.listening-form label {
  font-weight: 600;
}

.listening-form input {
  width: 100%;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  font-family: var(--font-hanzi);
  font-size: 1.25rem;
}

.listening-form input:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.answer-feedback {
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-align: center;
}

.answer-feedback.correct {
  color: #167a39;
  background: rgb(22 122 57 / 0.1);
}

.answer-feedback.incorrect {
  color: #b42318;
  background: rgb(180 35 24 / 0.1);
}

.homophones {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

.homophones h4 {
  margin: 0 0 0.75rem;
}

.homophones ul {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.homophones li {
  display: flex;
  align-items: baseline;
  gap: 1rem;
}

.homophones strong {
  min-width: 2.5rem;
  font-family: var(--font-hanzi);
  font-size: 1.4rem;
}

.homophones span {
  color: var(--color-text-muted);
}

.quiz-error {
  color: #b42318;
}

.quiz-submit {
  padding: 0.85rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  font: inherit;
  cursor: pointer;
}

.quiz-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>