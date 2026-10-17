<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, onValue, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import type { QuizResult } from '@/data/types'

interface HistoryEntry extends QuizResult {
  resultId: string
}

interface HistorySummary extends HistoryEntry {
  score: number
  totalPoints: number
  percentage: number
  correctCards: number
  partialCards: number
  incorrectCards: number
}

const history = ref<HistoryEntry[]>([])
const isLoading = ref(true)
const error = ref('')
const isLoggedIn = ref(false)

let unsubscribeAuth: (() => void) | null = null
let unsubscribeResults: (() => void) | null = null

const summaries = computed<HistorySummary[]>(() => {
  return history.value
    .map((entry) => {
      const cards = entry.results ?? []

      const correctPinyin = cards.filter((card) => card.pinyin.correct).length

      const correctEnglish = cards.filter((card) => card.english.correct).length

      const correctCards = cards.filter(
        (card) => card.pinyin.correct && card.english.correct,
      ).length

      const partialCards = cards.filter(
        (card) => card.pinyin.correct !== card.english.correct,
      ).length

      const incorrectCards = cards.filter(
        (card) => !card.pinyin.correct && !card.english.correct,
      ).length

      const score = correctPinyin + correctEnglish
      const totalPoints = entry.totalCards * 2

      return {
        ...entry,
        score,
        totalPoints,
        percentage: totalPoints ? Math.round((score / totalPoints) * 100) : 0,
        correctCards,
        partialCards,
        incorrectCards,
      }
    })
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
})

const formatDate = (date: string): string => {
  return new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

onMounted(() => {
  const auth = getAuth(firebase)
  const database = getDatabase(firebase)

  unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      // Remove any previous user's database listener.
      unsubscribeResults?.()
      unsubscribeResults = null

      history.value = []
      error.value = ''

      isLoggedIn.value = user !== null

      if (!user) {
        isLoading.value = false
        return
      }

      isLoading.value = true

      const resultsRef = dbRef(database, `users/${user.uid}/results`)

      unsubscribeResults = onValue(
        resultsRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            history.value = []
          } else {
            const entries: HistoryEntry[] = []

            snapshot.forEach((child) => {
              const result = child.val() as QuizResult

              entries.push({
                ...result,
                resultId: child.key!,
              })
            })

            history.value = entries
          }

          error.value = ''
          isLoading.value = false
        },
        (err) => {
          error.value = err.message
          history.value = []
          isLoading.value = false
        },
      )
    },
    (err) => {
      error.value = err.message
      isLoading.value = false
    },
  )
})

onUnmounted(() => {
  unsubscribeResults?.()
  unsubscribeAuth?.()
})
</script>

<template>
  <main>
    <section class="content-container history-page">
      <header class="history-header">
        <h3>复习历史 · Review History</h3>

        <p>Your completed vocabulary reviews, scores, and learning progress.</p>
      </header>

      <p v-if="isLoading" role="status">Loading review history...</p>

      <div v-else-if="error" class="history-message" role="alert">
        <p>{{ error }}</p>
      </div>

      <div v-else-if="!isLoggedIn" class="history-message">
        <h4>Sign in to view your history</h4>

        <p>Completed reviews are saved to your account when you're signed in.</p>

        <RouterLink to="/login" class="history-button"> Login </RouterLink>
      </div>

      <div v-else-if="!summaries.length" class="history-message">
        <h4>No completed reviews yet</h4>

        <p>Finish your first vocabulary deck and your results will appear here.</p>

        <RouterLink to="/decks" class="history-button"> Choose a Deck </RouterLink>
      </div>

      <template v-else>
        <div class="history-count">
          {{ summaries.length }}
          {{ summaries.length === 1 ? 'review' : 'reviews' }}
          completed
        </div>

        <div class="history-list">
          <RouterLink
            v-for="entry in summaries"
            :key="entry.resultId"
            :to="{
              name: 'result',
              params: { resultId: entry.resultId },
            }"
            class="history-entry"
          >
            <div class="entry-info">
              <h4>{{ entry.deckTitle }}</h4>

              <time :datetime="entry.completedAt">
                {{ formatDate(entry.completedAt) }}
              </time>

              <div class="entry-breakdown">
                <span class="breakdown-correct"> {{ entry.correctCards }} correct </span>

                <span class="breakdown-partial"> {{ entry.partialCards }} half-correct </span>

                <span class="breakdown-incorrect"> {{ entry.incorrectCards }} incorrect </span>
              </div>
            </div>

            <div class="entry-score">
              <strong> {{ entry.score }}/{{ entry.totalPoints }} </strong>

              <span class="entry-percentage"> {{ entry.percentage }}% </span>

              <span class="entry-cards">
                {{ entry.correctCards }}/{{ entry.totalCards }}
                cards correct
              </span>
            </div>

            <span class="entry-arrow" aria-hidden="true"> → </span>
          </RouterLink>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.history-page {
  font-family: var(--font-ui);
}

.history-header {
  margin-bottom: 2rem;
}

.history-header h3 {
  margin: 0 0 0.75rem;
}

.history-header p {
  margin: 0;
  opacity: 0.75;
}

/* Empty, error, and login states */

.history-message {
  padding: 2rem;
  border: 1px solid var(--color-text);
  border-radius: 0.75rem;
}

.history-message h4 {
  margin: 0 0 0.75rem;
}

.history-message p {
  margin: 0 0 1.5rem;
}

.history-button {
  display: inline-flex;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  font: inherit;
  text-decoration: none;
}

/* Review list */

.history-count {
  margin-bottom: 1rem;
  font-size: 0.85rem;
  opacity: 0.7;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-entry {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.75rem;
  background: var(--color-background);
  color: var(--color-text);
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.history-entry:hover {
  background: var(--color-background-soft);
  transform: translateY(-2px);
}

.history-entry:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 3px;
}

/* Deck information */

.entry-info {
  flex: 1;
  min-width: 0;
}

.entry-info h4 {
  margin: 0 0 0.5rem;
  font-size: 1.15rem;
}

.entry-info time {
  display: block;
  font-size: 0.85rem;
  opacity: 0.7;
}

.entry-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 1rem;
  font-size: 0.8rem;
}

.breakdown-correct {
  color: #28834b;
}

.breakdown-partial {
  color: #ad802b;
}

.breakdown-incorrect {
  color: #bc4444;
}

/* Score */

.entry-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 0.25rem;
  font-variant-numeric: tabular-nums;
}

.entry-score strong {
  font-size: 1.6rem;
}

.entry-percentage {
  font-size: 1rem;
  font-weight: 600;
}

.entry-cards {
  font-size: 0.8rem;
  opacity: 0.7;
}

.entry-arrow {
  font-size: 1.5rem;
  opacity: 0.6;
}

/* Responsive */

@media (max-width: 640px) {
  .history-entry {
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem;
  }

  .entry-info {
    flex-basis: 100%;
  }

  .entry-score {
    align-items: flex-start;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .entry-arrow {
    margin-left: auto;
  }
}
</style>
