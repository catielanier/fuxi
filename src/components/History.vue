<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, onValue, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import type {
  ListeningQuizResult,
  QuizResult,
  SavedQuizResult,
} from '@/data/types'

interface HistoryEntry {
  id: string
  result: SavedQuizResult
  mode: 'reading' | 'listening'
  score: number
  correct: number
  total: number
  fullyCorrectCards?: number
  partiallyCorrectCards?: number
}

const auth = getAuth(firebase)
const db = getDatabase(firebase)

const entries = ref<HistoryEntry[]>([])
const isLoggedIn = ref(false)
const isLoading = ref(true)
const error = ref('')

let unsubscribeAuth: (() => void) | null = null
let unsubscribeResults: (() => void) | null = null

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const createHistoryEntry = (
  id: string,
  result: SavedQuizResult,
): HistoryEntry => {
  if (result.mode === 'listening') {
    const listening = result as ListeningQuizResult
    const correct = listening.results.filter(
      (answer) => answer.correct,
    ).length

    return {
      id,
      result,
      mode: 'listening',
      correct,
      total: listening.totalQuestions,
      score: listening.totalQuestions
        ? (correct / listening.totalQuestions) * 100
        : 0,
    }
  }

  const reading = result as QuizResult

  const correctPinyin = reading.results.filter(
    (card) => card.pinyin.correct,
  ).length

  const correctEnglish = reading.results.filter(
    (card) => card.english.correct,
  ).length

  const correct = correctPinyin + correctEnglish
  const total = reading.totalCards * 2

  return {
    id,
    result,
    mode: 'reading',
    correct,
    total,
    score: total ? (correct / total) * 100 : 0,
    fullyCorrectCards: reading.results.filter(
      (card) => card.pinyin.correct && card.english.correct,
    ).length,
    partiallyCorrectCards: reading.results.filter(
      (card) => card.pinyin.correct !== card.english.correct,
    ).length,
  }
}

const sortedEntries = computed(() =>
  [...entries.value].sort(
    (a, b) =>
      Date.parse(b.result.completedAt) -
      Date.parse(a.result.completedAt),
  ),
)

const getResultRoute = (entry: HistoryEntry) => ({
  name: entry.mode === 'listening'
    ? 'listening-result'
    : 'result',
  params: { resultId: entry.id },
})

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      unsubscribeResults?.()
      unsubscribeResults = null

      entries.value = []
      error.value = ''
      isLoggedIn.value = user !== null

      if (!user) {
        isLoading.value = false
        return
      }

      isLoading.value = true

      unsubscribeResults = onValue(
        dbRef(db, `users/${user.uid}/results`),
        (snapshot) => {
          const loaded: HistoryEntry[] = []

          snapshot.forEach((child) => {
            if (!child.key) return

            const result = child.val() as SavedQuizResult

            loaded.push(
              createHistoryEntry(child.key, result),
            )
          })

          entries.value = loaded
          isLoading.value = false
        },
        (err) => {
          error.value = err.message
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
  unsubscribeAuth?.()
  unsubscribeResults?.()
})
</script>

<template>
  <main>
    <section class="content-container history-page">
      <h3><span>复习记录</span> · History</h3>

      <p v-if="isLoading" role="status">
        Loading your review history...
      </p>

      <p v-else-if="error" role="alert">
        {{ error }}
      </p>

      <div v-else-if="!isLoggedIn" class="history-message">
        <p>Log in to view your saved review history.</p>

        <RouterLink to="/login">Log In</RouterLink>
      </div>

      <div v-else-if="!sortedEntries.length" class="history-message">
        <p>You haven't completed any reviews yet.</p>

        <RouterLink to="/decks">
          Start Studying
        </RouterLink>
      </div>

      <div v-else class="history-list">
        <RouterLink
          v-for="entry in sortedEntries"
          :key="entry.id"
          :to="getResultRoute(entry)"
          class="history-entry"
        >
          <div class="entry-heading">
            <div>
              <span class="mode-label">
                {{ entry.mode === 'listening' ? 'Listening' : 'Reading' }}
              </span>

              <h4>{{ entry.result.deckTitle }}</h4>

              <span class="entry-date">
                {{ formatDate(entry.result.completedAt) }}
              </span>
            </div>

            <strong class="entry-percentage">
              {{ entry.score.toFixed(1) }}%
            </strong>
          </div>

          <div class="entry-details">
            <span>
              {{ entry.correct }} / {{ entry.total }}
              correct
            </span>

            <template v-if="entry.mode === 'reading'">
              <span>
                {{ entry.fullyCorrectCards }} fully correct cards
              </span>

              <span>
                {{ entry.partiallyCorrectCards }} partially correct
              </span>
            </template>

            <span v-else>
              {{ entry.result.results.length }}
              listening questions
            </span>
          </div>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.history-page {
  font-family: var(--font-ui);
}

h3 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
}

h3 span {
  font-family: var(--font-brand);
}

.history-message {
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-entry {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-surface) r g b / 75%);
  color: var(--color-text);
  text-decoration: none;
  transition: border-color 0.2s ease;
}

.history-entry:hover {
  border-color: var(--color-primary);
}

.entry-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.mode-label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-primary);
}

.entry-heading h4 {
  margin: 0.35rem 0;
  font-size: 1.1rem;
}

.entry-date {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.entry-percentage {
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
}

.entry-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

@media (max-width: 600px) {
  .entry-percentage {
    font-size: 1.4rem;
  }
}
</style>