<script setup lang="ts">
import { computed } from 'vue'
import type { QuizCardResult } from '@/data/types'
import { STROKE_ORDER_URI } from '@/data/constants'

const props = defineProps<{
  card: QuizCardResult
  number: number
  audioUrl?: string | null
  isPlaying?: boolean
}>()

const emit = defineEmits<{
  playAudio: [cardIndex: number]
}>()

type CardStatus = 'correct' | 'partial' | 'incorrect'

const status = computed<CardStatus>(() => {
  if (props.card.pinyin.correct && props.card.english.correct) {
    return 'correct'
  }

  if (props.card.pinyin.correct || props.card.english.correct) {
    return 'partial'
  }

  return 'incorrect'
})

const statusLabel = computed(() => {
  switch (status.value) {
    case 'correct':
      return 'Correct'
    case 'partial':
      return 'Partially Correct'
    default:
      return 'Incorrect'
  }
})

const strokeOrderUrl = computed(
  () => `${STROKE_ORDER_URI}${encodeURIComponent(props.card.hanzi)}`,
)

const formatAnswers = (answers: string[]): string =>
  answers.join(', ')

const handleAudioClick = (): void => {
  if (!props.audioUrl) return
  emit('playAudio', props.card.cardIndex)
}
</script>

<template>
  <article class="result-card" :class="`status-${status}`">
    <div class="card-header">
      <span class="card-number">Card {{ number }}</span>

      <span class="card-status">
        {{ statusLabel }}
      </span>
    </div>

    <div class="card-content">
      <div class="hanzi-row">
        <h4 class="hanzi" lang="zh-Hans">
          {{ card.hanzi }}
        </h4>

        <div class="card-tools">
          <button
            v-if="audioUrl"
            type="button"
            class="tool-button audio-button"
            :class="{ playing: isPlaying }"
            :aria-label="
              isPlaying
                ? `Stop pronunciation of ${card.hanzi}`
                : `Play pronunciation of ${card.hanzi}`
            "
            :title="
              isPlaying
                ? 'Stop pronunciation'
                : 'Play pronunciation'
            "
            @click="handleAudioClick"
          >
            <svg
              v-if="isPlaying"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" />
              <rect x="14" y="5" width="4" height="14" />
            </svg>

            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          <a
            :href="strokeOrderUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="tool-button"
            :aria-label="`View stroke order for ${card.hanzi}`"
            title="View stroke order"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 20h16" />
              <path d="M7 16 17 6l2 2-10 10-4 1z" />
              <path d="m15 8 2 2" />
            </svg>
          </a>
        </div>
      </div>

      <div class="answer-section">
        <div class="answer-heading">
          <h5>Pinyin</h5>

          <span
            class="answer-status"
            :class="card.pinyin.correct ? 'answer-correct' : 'answer-incorrect'"
          >
            {{ card.pinyin.correct ? 'Correct' : 'Incorrect' }}
          </span>
        </div>

        <div v-if="card.pinyin.correct" class="answer-value">
          {{ formatAnswers(card.pinyin.expected) }}
        </div>

        <div v-else class="answer-comparison">
          <div class="answer-row">
            <span class="answer-label">Your Answer</span>
            <span class="submitted-answer">
              {{ card.pinyin.submitted || 'No answer' }}
            </span>
          </div>

          <div class="answer-row">
            <span class="answer-label">Correct Answer</span>
            <span class="expected-answer">
              {{ formatAnswers(card.pinyin.expected) }}
            </span>
          </div>
        </div>
      </div>

      <div class="answer-section">
        <div class="answer-heading">
          <h5>English</h5>

          <span
            class="answer-status"
            :class="card.english.correct ? 'answer-correct' : 'answer-incorrect'"
          >
            {{ card.english.correct ? 'Correct' : 'Incorrect' }}
          </span>
        </div>

        <div v-if="card.english.correct" class="answer-value">
          {{ formatAnswers(card.english.expected) }}
        </div>

        <div v-else class="answer-comparison">
          <div class="answer-row">
            <span class="answer-label">Your Answer</span>
            <span class="submitted-answer">
              {{ card.english.submitted || 'No answer' }}
            </span>
          </div>

          <div class="answer-row">
            <span class="answer-label">Correct Answer</span>
            <span class="expected-answer">
              {{ formatAnswers(card.english.expected) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.result-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-surface) r g b / 85%);
}

.status-correct {
  border-left: 4px solid #54877b;
}

.status-partial {
  border-left: 4px solid #c18a59;
}

.status-incorrect {
  border-left: 4px solid #b85c5c;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.card-number {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.card-status {
  font-size: 0.75rem;
  font-weight: 600;
}

.status-correct .card-status {
  color: #54877b;
}

.status-partial .card-status {
  color: var(--color-accent);
}

.status-incorrect .card-status {
  color: #b85c5c;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.25rem;
}

.hanzi-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.hanzi {
  margin: 0;
  font-family: var(--font-hanzi);
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 500;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.card-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.tool-button {
  display: inline-grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-primary);
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.tool-button:hover,
.tool-button.playing {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
}

.tool-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.answer-section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.answer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.answer-heading h5 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 700;
}

.answer-status {
  font-size: 0.75rem;
  font-weight: 600;
}

.answer-correct {
  color: #54877b;
}

.answer-incorrect {
  color: #b85c5c;
}

.answer-value {
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.answer-comparison {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.answer-row {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.answer-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.submitted-answer,
.expected-answer {
  font-size: 0.95rem;
  overflow-wrap: anywhere;
}

.submitted-answer {
  color: #b85c5c;
}

.expected-answer {
  color: var(--color-text);
  font-weight: 600;
}
</style>