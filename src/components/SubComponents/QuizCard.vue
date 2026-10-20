<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { formatPinyin } from '@/utils/pinyin'
import type { QuizAnswer, VocabularyCard } from '@/data/types'

type QuizStage = 'pinyin' | 'english'

const props = defineProps<{
  card: VocabularyCard
  stage: QuizStage
  answered: boolean
  currentResult: QuizAnswer | null
  cardNumber: number
  totalCards: number
  isSaving: boolean
  error: string
  pinyinInput: string
  englishInput: string
}>()

const emit = defineEmits<{
  'update:pinyinInput': [value: string]
  'update:englishInput': [value: string]
  submit: []
  continue: []
}>()

const pinyinInputElement = ref<HTMLInputElement | null>(null)
const englishInputElement = ref<HTMLInputElement | null>(null)

const pinyinValue = computed({
  get: () => props.pinyinInput,
  set: (value: string) => emit('update:pinyinInput', value),
})

const englishValue = computed({
  get: () => props.englishInput,
  set: (value: string) => emit('update:englishInput', value),
})

const formattedPinyin = computed(() => {
  try {
    return formatPinyin(props.pinyinInput)
  } catch {
    return ''
  }
})

const canSubmit = computed(() => {
  if (props.isSaving) return false
  if (props.answered) return true

  return props.stage === 'pinyin'
    ? Boolean(props.pinyinInput.trim())
    : Boolean(props.englishInput.trim())
})

const submitLabel = computed(() => {
  if (props.isSaving) return 'Saving results...'
  if (!props.answered) return 'Submit Answer'
  if (props.stage === 'pinyin') return 'Continue to English'
  if (props.cardNumber === props.totalCards) return 'Finish Review'

  return 'Next Card'
})

const insertTone = (tone: number): void => {
  if (props.answered || props.isSaving) return

  const input = pinyinInputElement.value

  if (!input) {
    pinyinValue.value += String(tone)
    return
  }

  const start = input.selectionStart ?? props.pinyinInput.length
  const end = input.selectionEnd ?? start

  pinyinValue.value =
    props.pinyinInput.slice(0, start) +
    String(tone) +
    props.pinyinInput.slice(end)

  void nextTick(() => {
    input.focus()
    input.setSelectionRange(start + 1, start + 1)
  })
}

const focusInput = async (): Promise<void> => {
  await nextTick()

  if (props.stage === 'pinyin') {
    pinyinInputElement.value?.focus()
  } else {
    englishInputElement.value?.focus()
  }
}

const handleSubmit = (): void => {
  if (!canSubmit.value) return

  if (props.answered) {
    emit('continue')
  } else {
    emit('submit')
  }
}

defineExpose({
  focusInput,
})
</script>

<template>
  <div class="quiz-card">
    <h1 class="hanzi" lang="zh-Hans">
      {{ card.hanzi }}
    </h1>
  </div>

  <form class="quiz-form" @submit.prevent="handleSubmit">
    <template v-if="stage === 'pinyin'">
      <label for="pinyin-answer">
        Enter the Pinyin
      </label>

      <input
        id="pinyin-answer"
        ref="pinyinInputElement"
        v-model="pinyinValue"
        type="text"
        inputmode="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="e.g. ni3hao3"
        :disabled="answered || isSaving"
      />

      <div class="tone-buttons">
        <button
          v-for="tone in 4"
          :key="tone"
          type="button"
          :disabled="answered || isSaving"
          @pointerdown.prevent
          @click="insertTone(tone)"
        >
          {{ tone }}
        </button>
      </div>

      <p class="pinyin-preview" aria-live="polite">
        {{ formattedPinyin || ' ' }}
      </p>
    </template>

    <template v-else>
      <label for="english-answer">
        Enter the English meaning
      </label>

      <input
        id="english-answer"
        ref="englishInputElement"
        v-model="englishValue"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="English definition"
        :disabled="answered || isSaving"
      />
    </template>

    <p
      v-if="answered && currentResult"
      class="answer-feedback"
      :class="{
        correct: currentResult.correct,
        incorrect: !currentResult.correct,
      }"
      role="status"
    >
      {{ currentResult.correct ? 'Correct!' : 'Incorrect.' }}
    </p>

    <p v-if="error" class="quiz-error" role="alert">
      {{ error }}
    </p>

    <button
      type="submit"
      class="quiz-submit"
      :disabled="!canSubmit"
    >
      {{ submitLabel }}
    </button>
  </form>
</template>

<style scoped>
.quiz-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 15rem;
  padding: 2rem;
}

.hanzi {
  margin: 0;
  font-family: var(--font-hanzi);
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}

.quiz-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 36rem;
  margin-inline: auto;
  font-family: var(--font-ui);
}

.quiz-form label {
  font-weight: 600;
}

.quiz-form input {
  width: 100%;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
}

.quiz-form input:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.tone-buttons {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.tone-buttons button {
  padding: 0.75rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
}

.tone-buttons button:hover:not(:disabled) {
  background: var(--color-text);
  color: var(--color-background);
}

.tone-buttons button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pinyin-preview {
  min-height: 2rem;
  margin: 0;
  text-align: center;
  font-family: var(--font-ui);
  font-size: 1.4rem;
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