<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
} from 'reka-ui'
import firebase from '@/utils/firebase'
import ProgressChart from '@/components/SubComponents/ProgressChart.vue'
import type { Deck, DeckManifest, QuizResult, ProgressPoint } from '@/data/types'

interface SavedResult extends QuizResult {
  resultId: string
}

const auth = getAuth(firebase)
const db = getDatabase(firebase)

const decks = ref<Deck[]>([])
const results = ref<SavedResult[]>([])

const selectedDeckId = ref<string>()

const shouldShowLGBT = ref(false)
const isLoggedIn = ref(false)
const isLoading = ref(true)
const error = ref('')

let unsubscribeAuth: (() => void) | null = null
let requestVersion = 0

const restrictedDeckIds = new Set([
  'lgbtq_I',
  'lgbtq_II',
  'lgbtq_III',
  'clothes_III',
  'sexual_vocabulary_I',
  'sexual_vocabulary_II',
])

const visibleDecks = computed(() =>
  decks.value
    .filter((deck: Deck) => shouldShowLGBT.value || !restrictedDeckIds.has(deck.id))
    .sort((a, b) =>
      a.title.localeCompare(b.title, 'en', {
        numeric: true,
        sensitivity: 'base',
      }),
    ),
)

const selectedDeck = computed(() =>
  visibleDecks.value.find((deck) => deck.id === selectedDeckId.value),
)

const progressPoints = computed<ProgressPoint[]>(() => {
  if (!selectedDeck.value) return []

  return results.value
    .filter((result) => result.deckId === selectedDeck.value?.id)
    .map((result) => {
      const cards = result.results ?? []

      const correctAnswers = cards.reduce((total, card) => {
        return total + Number(card.pinyin.correct) + Number(card.english.correct)
      }, 0)

      const totalPoints = result.totalCards * 2

      return {
        resultId: result.resultId,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
        score: correctAnswers,
        totalPoints,
        percentage: totalPoints ? (correctAnswers / totalPoints) * 100 : 0,
      }
    })
    .sort(
      (a, b) =>
        Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.resultId.localeCompare(b.resultId),
    )
})

const latestPoint = computed(() => progressPoints.value.at(-1) ?? null)

const firstPoint = computed(() => progressPoints.value[0] ?? null)

const improvement = computed(() => {
  if (!latestPoint.value || !firstPoint.value) return null
  if (progressPoints.value.length < 2) return null

  return latestPoint.value.percentage - firstPoint.value.percentage
})

const averageScore = computed(() => {
  if (!progressPoints.value.length) return 0

  const total = progressPoints.value.reduce((sum, point) => sum + point.percentage, 0)

  return total / progressPoints.value.length
})

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const loadProgress = async (uid: string): Promise<void> => {
  const currentRequest = ++requestVersion

  isLoading.value = true
  error.value = ''

  try {
    const [manifestResponse, preferenceSnapshot, resultsSnapshot] = await Promise.all([
      fetch(`${import.meta.env.BASE_URL}deck-manifest.json`),
      get(dbRef(db, `users/${uid}/shouldShowLGBT`)),
      get(dbRef(db, `users/${uid}/results`)),
    ])

    if (!manifestResponse.ok) {
      throw new Error('Unable to load deck manifest.')
    }

    const manifest: DeckManifest = await manifestResponse.json()

    if (currentRequest !== requestVersion) return

    shouldShowLGBT.value = preferenceSnapshot.val() === true
    decks.value = manifest.decks

    const savedResults: SavedResult[] = []

    if (resultsSnapshot.exists()) {
      resultsSnapshot.forEach((child) => {
        if (!child.key) return

        const data = child.val() as QuizResult

        savedResults.push({
          ...data,
          resultId: child.key,
        })
      })
    }

    results.value = savedResults

    selectedDeckId.value = visibleDecks.value[0]?.id
  } catch (err) {
    if (currentRequest !== requestVersion) return

    error.value = err instanceof Error ? err.message : 'Unable to load progress.'
  } finally {
    if (currentRequest === requestVersion) {
      isLoading.value = false
    }
  }
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      ++requestVersion

      decks.value = []
      results.value = []
      selectedDeckId.value = undefined
      shouldShowLGBT.value = false
      error.value = ''

      isLoggedIn.value = user !== null

      if (!user) {
        isLoading.value = false
        return
      }

      void loadProgress(user.uid)
    },
    (err) => {
      ++requestVersion
      isLoggedIn.value = false
      error.value = err.message
      isLoading.value = false
    },
  )
})

onUnmounted(() => {
  ++requestVersion
  unsubscribeAuth?.()
})
</script>

<template>
  <main>
    <section class="content-container progress-page">
      <h3><span>学习进度</span> · Progress</h3>

      <p v-if="isLoading" role="status">Loading your progress...</p>

      <p v-else-if="error" role="alert" class="progress-error">
        {{ error }}
      </p>

      <div v-else-if="!isLoggedIn" class="progress-message">
        <h4>Sign in to track your progress</h4>

        <p>Create an account or log in to track your vocabulary scores over time.</p>

        <RouterLink to="/login"> Log In </RouterLink>
      </div>

      <div v-else-if="!visibleDecks.length" class="progress-message">
        <p>No vocabulary decks are available.</p>
      </div>

      <template v-else>
        <div class="progress-selection">
          <label id="progress-deck-label"> Choose a vocabulary deck </label>

          <SelectRoot v-model="selectedDeckId">
            <SelectTrigger class="progress-select" aria-labelledby="progress-deck-label">
              <SelectValue placeholder="Select a deck..." />

              <SelectIcon>
                <span aria-hidden="true">⌄</span>
              </SelectIcon>
            </SelectTrigger>

            <SelectPortal>
              <SelectContent position="popper" :side-offset="6" class="progress-dropdown">
                <SelectViewport class="progress-options">
                  <SelectItem
                    v-for="deck in visibleDecks"
                    :key="deck.id"
                    :value="deck.id"
                    class="progress-option"
                  >
                    <SelectItemText>
                      {{ deck.title }}
                    </SelectItemText>
                  </SelectItem>
                </SelectViewport>
              </SelectContent>
            </SelectPortal>
          </SelectRoot>
        </div>

        <template v-if="selectedDeck">
          <div class="progress-heading">
            <h4>{{ selectedDeck.title }}</h4>
            <p>{{ selectedDeck.description }}</p>
          </div>

          <div v-if="!progressPoints.length" class="progress-message">
            <h4>No completed reviews yet</h4>

            <p>
              You haven't completed this deck yet. Complete a review to begin tracking your
              progress.
            </p>

            <RouterLink
              :to="{
                name: 'quiz',
                params: { deckId: selectedDeck.id },
              }"
              class="progress-button"
            >
              Start Studying
            </RouterLink>
          </div>

          <template v-else>
            <div class="progress-stats">
              <div class="stat">
                <span class="stat-label"> Reviews Completed </span>
                <strong>{{ progressPoints.length }}</strong>
              </div>

              <div class="stat">
                <span class="stat-label">Latest Score</span>
                <strong> {{ latestPoint?.percentage.toFixed(1) }}% </strong>
              </div>

              <div class="stat">
                <span class="stat-label">Average Score</span>
                <strong> {{ averageScore.toFixed(1) }}% </strong>
              </div>

              <div class="stat">
                <span class="stat-label">Change</span>
                <strong v-if="improvement !== null">
                  {{ improvement > 0 ? '+' : '' }}{{ improvement.toFixed(1) }}
                  pp
                </strong>
                <strong v-else>—</strong>
              </div>
            </div>

            <div class="chart-container">
              <h4>Performance Over Time</h4>

              <ProgressChart :points="progressPoints" />
            </div>

            <div class="progress-footer">
              <p v-if="latestPoint">
                Last review:
                {{ formatDate(latestPoint.completedAt) }}
              </p>

              <RouterLink
                v-if="latestPoint"
                :to="{
                  name: 'result',
                  params: { resultId: latestPoint.resultId },
                }"
                class="progress-button"
              >
                View Latest Results
              </RouterLink>
            </div>
          </template>
        </template>
      </template>
    </section>
  </main>
</template>

<style scoped>
.progress-page {
  font-family: var(--font-ui);
}

h3 {
  margin: 0 0 1.5rem;
  font-family: var(--font-ui);
  font-size: 1.5rem;
  color: var(--color-text);
}

h3 span {
  font-family: var(--font-brand);
}

.progress-selection {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 36rem;
}

.progress-selection label {
  font-weight: 600;
}

.progress-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.progress-select:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.progress-heading {
  margin: 2rem 0;
}

.progress-heading h4 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.progress-heading p {
  margin: 0;
  color: var(--color-text-muted);
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-surface) r g b / 65%);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.stat strong {
  font-size: clamp(1.2rem, 3vw, 1.75rem);
  font-variant-numeric: tabular-nums;
}

.chart-container {
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: rgb(from var(--color-surface) r g b / 75%);
}

.chart-container h4 {
  margin: 0 0 1.5rem;
}

.progress-message {
  padding: 2rem;
  margin-top: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
}

.progress-message h4 {
  margin: 0 0 0.75rem;
}

.progress-message p {
  margin: 0 0 1rem;
}

.progress-button {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  font: inherit;
  text-decoration: none;
}

.progress-button:hover {
  opacity: 0.85;
}

.progress-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1.5rem;
}

.progress-footer p {
  color: var(--color-text-muted);
}

.progress-error {
  color: #bc4444;
}

@media (max-width: 700px) {
  .progress-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-container {
    padding: 0.75rem;
  }
}
</style>

<style>
.progress-dropdown {
  z-index: 1000;
  width: var(--reka-select-trigger-width);
  max-height: min(22rem, var(--reka-select-content-available-height));
  overflow: hidden;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.12);
}

.progress-options {
  max-height: inherit;
  overflow-y: auto;
  padding: 0.35rem;
}

.progress-option {
  padding: 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
  outline: none;
  font-family: var(--font-ui);
}

.progress-option[data-highlighted] {
  background: var(--color-text);
  color: var(--color-background);
}

.progress-option[data-state='checked'] {
  font-weight: 700;
}
</style>
