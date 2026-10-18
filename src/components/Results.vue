<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import type { QuizResult, QuizCardResult } from '@/data/types'
import { STROKE_ORDER_URI, SPEECHER_URI } from '@/data/constants'

type CardStatus = 'correct' | 'partial' | 'incorrect'

const props = defineProps<{
  result?: QuizResult | null
  resultId?: string
}>()

const route = useRoute()

// eslint-disable-next-line vue/no-dupe-keys
const result = ref<QuizResult | null>(null)
const isLoading = ref(true)
const error = ref('')

let unsubscribeAuth: (() => void) | null = null
let loadVersion = 0

const activeResultId = computed(() => {
  const id = props.resultId ?? route.params.resultId
  return typeof id === 'string' ? id : null
})

const correctPinyin = computed(
  () => result.value?.results.filter((card) => card.pinyin.correct).length ?? 0,
)

const correctEnglish = computed(
  () => result.value?.results.filter((card) => card.english.correct).length ?? 0,
)

const totalPoints = computed(() => (result.value?.totalCards ?? 0) * 2)

const score = computed(() => correctPinyin.value + correctEnglish.value)

const percentage = computed(() =>
  totalPoints.value ? Math.round((score.value / totalPoints.value) * 100) : 0,
)

const getCardStatus = (card: QuizCardResult): CardStatus => {
  const pinyinCorrect = card.pinyin.correct
  const englishCorrect = card.english.correct

  if (pinyinCorrect && englishCorrect) return 'correct'
  if (pinyinCorrect || englishCorrect) return 'partial'

  return 'incorrect'
}

const statusLabels: Record<CardStatus, string> = {
  correct: 'Correct',
  partial: 'Half-correct',
  incorrect: 'Incorrect',
}

const cardCounts = computed(() => {
  const counts = {
    correct: 0,
    partial: 0,
    incorrect: 0,
  }

  for (const card of result.value?.results ?? []) {
    counts[getCardStatus(card)]++
  }

  return counts
})

const formatExpected = (answers: string[]): string => answers.join(' / ')

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const getStrokeOrderUrl = (hanzi: string): string => `${STROKE_ORDER_URI}${hanzi}`

const getPronunciationUrl = (hanzi: string): string => `${SPEECHER_URI}${encodeURIComponent(hanzi)}`

const loadResult = async (
  resultId: string | null,
  guestResult: QuizResult | null | undefined,
): Promise<void> => {
  unsubscribeAuth?.()
  unsubscribeAuth = null

  const currentVersion = ++loadVersion
  const isCurrent = (): boolean => currentVersion === loadVersion

  isLoading.value = true
  error.value = ''
  result.value = null

  if (!resultId) {
    if (guestResult) {
      result.value = guestResult
    } else {
      error.value = 'No results were provided.'
    }

    isLoading.value = false
    return
  }

  const auth = getAuth(firebase)
  const database = getDatabase(firebase)

  unsubscribeAuth = onAuthStateChanged(
    auth,
    async (user) => {
      if (!isCurrent()) return

      if (!user) {
        result.value = null
        error.value = 'Please sign in to view these results.'
        isLoading.value = false
        return
      }

      isLoading.value = true

      try {
        const resultRef = dbRef(database, `users/${user.uid}/results/${resultId}`)

        const snapshot = await get(resultRef)

        if (!isCurrent() || auth.currentUser?.uid !== user.uid) return

        if (!snapshot.exists()) {
          throw new Error('Results not found.')
        }

        result.value = snapshot.val() as QuizResult
        error.value = ''
      } catch (err) {
        if (!isCurrent() || auth.currentUser?.uid !== user.uid) return

        result.value = null
        error.value = err instanceof Error ? err.message : 'Unable to retrieve results.'
      } finally {
        if (isCurrent() && auth.currentUser?.uid === user.uid) {
          isLoading.value = false
        }
      }
    },
    (err) => {
      if (!isCurrent()) return

      error.value = err.message
      isLoading.value = false
    },
  )
}

watch(
  [activeResultId, () => props.result],
  ([resultId, guestResult], _, onCleanup) => {
    void loadResult(resultId, guestResult)

    onCleanup(() => {
      loadVersion++
      unsubscribeAuth?.()
      unsubscribeAuth = null
    })
  },
  { immediate: true },
)

onUnmounted(() => {
  loadVersion++
  unsubscribeAuth?.()
  unsubscribeAuth = null
})
</script>

<template>
  <main>
    <section class="content-container results-page">
      <p v-if="isLoading" role="status">Loading results...</p>

      <div v-else-if="error" class="results-error" role="alert">
        <h3>Unable to display results</h3>
        <p>{{ error }}</p>

        <RouterLink to="/decks">Return to Decks</RouterLink>
      </div>

      <template v-else-if="result">
        <header class="results-header">
          <div class="results-heading">
            <h3>成绩 · Results</h3>
            <h4>{{ result.deckTitle }}</h4>

            <p class="results-date">Started {{ formatDate(result.startedAt) }}</p>
          </div>

          <div class="results-score">
            <span class="score-value">
              {{ score }}<span class="score-divider">/</span>{{ totalPoints }}
            </span>

            <span class="score-percentage"> {{ percentage }}% Correct </span>
          </div>
        </header>

        <div
          class="score-progress"
          role="progressbar"
          :aria-valuenow="score"
          aria-valuemin="0"
          :aria-valuemax="totalPoints"
          aria-label="Review score"
        >
          <div class="score-progress-fill" :style="{ width: `${percentage}%` }" />
        </div>

        <div class="results-summary">
          <div class="summary-item">
            <span class="summary-label">Pinyin</span>
            <strong>{{ correctPinyin }}/{{ result.totalCards }}</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">English</span>
            <strong>{{ correctEnglish }}/{{ result.totalCards }}</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Fully Correct</span>
            <strong>{{ cardCounts.correct }}</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Half-correct</span>
            <strong>{{ cardCounts.partial }}</strong>
          </div>

          <div class="summary-item">
            <span class="summary-label">Incorrect</span>
            <strong>{{ cardCounts.incorrect }}</strong>
          </div>
        </div>

        <h4 class="results-section-title">Vocabulary Review</h4>

        <div class="results-grid-container">
          <div class="results-grid">
            <article
              v-for="(card, index) in result.results"
              :key="`${card.cardIndex}-${index}`"
              class="result-card"
              :class="`status-${getCardStatus(card)}`"
            >
              <div class="result-card-header">
                <span class="card-number">
                  {{ index + 1 }}
                </span>

                <span class="card-status">
                  {{ statusLabels[getCardStatus(card)] }}
                </span>
              </div>

              <h5 class="result-hanzi" lang="zh-Hans">
                {{ card.hanzi }}
              </h5>

              <div class="result-answers">
                <template v-if="card.pinyin.correct && card.english.correct">
                  <div class="answer-field">
                    <span class="answer-label">Pinyin</span>

                    <span class="answer-value">
                      {{ formatExpected(card.pinyin.expected) }}
                    </span>
                  </div>

                  <div class="answer-field">
                    <span class="answer-label">English</span>

                    <span class="answer-value">
                      {{ formatExpected(card.english.expected) }}
                    </span>
                  </div>
                </template>

                <template v-else>
                  <div class="answer-field">
                    <span class="answer-label">
                      Pinyin
                      <span :class="card.pinyin.correct ? 'answer-correct' : 'answer-incorrect'">
                        {{ card.pinyin.correct ? '✓' : '✗' }}
                      </span>
                    </span>

                    <template v-if="card.pinyin.correct">
                      <span class="answer-value">
                        {{ formatExpected(card.pinyin.expected) }}
                      </span>
                    </template>

                    <template v-else>
                      <span class="answer-submitted">
                        <span>Your answer:</span>
                        {{ card.pinyin.submitted }}
                      </span>

                      <span class="answer-expected">
                        <span>Correct answer:</span>
                        {{ formatExpected(card.pinyin.expected) }}
                      </span>
                    </template>
                  </div>

                  <div class="answer-field">
                    <span class="answer-label">
                      English
                      <span :class="card.english.correct ? 'answer-correct' : 'answer-incorrect'">
                        {{ card.english.correct ? '✓' : '✗' }}
                      </span>
                    </span>

                    <template v-if="card.english.correct">
                      <span class="answer-value">
                        {{ formatExpected(card.english.expected) }}
                      </span>
                    </template>

                    <template v-else>
                      <span class="answer-submitted">
                        <span>Your answer:</span>
                        {{ card.english.submitted }}
                      </span>

                      <span class="answer-expected">
                        <span>Correct answer:</span>
                        {{ formatExpected(card.english.expected) }}
                      </span>
                    </template>
                  </div>
                </template>
              </div>

              <div class="result-card-actions">
                <a
                  :href="getStrokeOrderUrl(card.hanzi)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="result-action"
                >
                  Stroke Order
                  <span aria-hidden="true">↗</span>
                </a>

                <a
                  :href="getPronunciationUrl(card.hanzi)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="result-action"
                >
                  Pronunciation
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </article>
          </div>
        </div>

        <div class="results-footer">
          <RouterLink to="/decks" class="back-to-decks"> Back to Decks </RouterLink>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.results-page {
  font-family: var(--font-ui);
  min-width: 0;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 2rem;
}

.results-heading {
  min-width: 0;
}

.results-heading h3 {
  margin: 0 0 0.5rem;
}

.results-heading h4 {
  margin: 0;
  font-size: 1.25rem;
  overflow-wrap: anywhere;
}

.results-date {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  opacity: 0.65;
}

.results-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-value {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 700;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.score-divider {
  opacity: 0.4;
}

.score-percentage {
  margin-top: 0.5rem;
  font-size: 1rem;
}

.score-progress {
  height: 0.5rem;
  margin: 2rem 0;
  overflow: hidden;
  border-radius: 999px;
  background: var(--color-border);
}

.score-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.results-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  padding: 1.5rem 0;
  border-block: 1px solid var(--color-border);
}

.summary-item {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.5rem;
  text-align: center;
}

.summary-label {
  font-size: 0.8rem;
  opacity: 0.7;
}

.summary-item strong {
  font-size: 1.4rem;
  font-variant-numeric: tabular-nums;
}

.results-section-title {
  margin: 2rem 0 1.25rem;
}

/* Responsive Vocabulary Card Grid */

.results-grid-container {
  container-type: inline-size;
  min-width: 0;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

@container (max-width: 820px) {
  .results-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* Vocabulary Cards */

.result-card {
  --status-color: var(--color-text);

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 0;
  padding: 1.25rem;

  border: 1px solid var(--status-color);
  border-radius: 0.75rem;
  background: var(--color-background);

  overflow-wrap: anywhere;
}

.result-card.status-correct {
  --status-color: #28834b;
  background: rgb(40 131 75 / 0.045);
}

.result-card.status-partial {
  --status-color: #bb8a37;
  background: rgb(187 138 55 / 0.065);
}

.result-card.status-incorrect {
  --status-color: #bc4444;
  background: rgb(188 68 68 / 0.045);
}

.result-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.card-number {
  font-size: 0.8rem;
  opacity: 0.6;
}

.card-status {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--status-color);
}

.result-hanzi {
  margin: 1.5rem 0;
  font-family: var(--font-hanzi);
  font-size: clamp(3rem, 6vw, 4.5rem);
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}

.result-answers {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
  font-family: var(--font-ui);
}

.answer-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.answer-label {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.75;
}

.answer-value {
  font-size: 1rem;
}

.answer-submitted,
.answer-expected {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.95rem;
}

.answer-submitted span,
.answer-expected span {
  font-size: 0.75rem;
  opacity: 0.65;
}

.answer-submitted {
  color: #bc4444;
}

.answer-expected {
  color: var(--color-text);
  font-weight: 600;
}

.answer-correct {
  color: #28834b;
  opacity: 1;
}

.answer-incorrect {
  color: #bc4444;
  opacity: 1;
}

/* Card Actions */

.result-card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.result-action {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;

  min-width: 0;
  padding: 0.7rem 0.5rem;

  border: 1px solid var(--color-text);
  border-radius: 0.5rem;

  color: var(--color-text);
  background: transparent;

  font-family: var(--font-ui);
  font-size: 0.8rem;
  text-align: center;
  text-decoration: none;

  overflow-wrap: anywhere;

  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.result-action:hover {
  background: var(--color-text);
  color: var(--color-background);
}

.result-action:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

/* Footer */

.results-footer {
  display: flex;
  justify-content: center;
  margin-top: 2.5rem;
}

.back-to-decks {
  display: inline-flex;
  padding: 0.85rem 1.5rem;

  border: 1px solid var(--color-text);
  border-radius: 0.5rem;

  background: var(--color-text);
  color: var(--color-background);
  text-decoration: none;
}

.results-error {
  padding: 2rem 0;
}

/* Tablet */

@media (max-width: 900px) {
  .results-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/* Mobile */

@media (max-width: 640px) {
  .results-header {
    align-items: flex-start;
    gap: 1.5rem;
  }

  .results-score {
    align-items: flex-start;
  }

  .results-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-card {
    padding: 1rem;
  }

  .result-card-actions {
    grid-template-columns: minmax(0, 1fr);
  }

  .results-section-title {
    margin-top: 1.5rem;
  }
}

/* Reduced Motion */

@media (prefers-reduced-motion: reduce) {
  .result-action {
    transition: none;
  }
}
</style>
