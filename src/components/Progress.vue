<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import DeckDropdown from '@/components/SubComponents/DeckDropdown.vue'
import ProgressChart from '@/components/SubComponents/ProgressChart.vue'
import { getVisibleDecks } from '@/utils/deckVisibility'
import type {
  Deck,
  DeckManifest,
  ListeningQuizResult,
  ProgressPoint,
  QuizMode,
  QuizResult,
  SavedQuizResult,
} from '@/data/types'

interface SavedResult {
  resultId: string
  data: SavedQuizResult
}

const auth = getAuth(firebase)
const db = getDatabase(firebase)

const decks = ref<Deck[]>([])
const results = ref<SavedResult[]>([])

const selectedDeckId = ref<string>()
const selectedMode = ref<QuizMode>('reading')

const shouldShowLGBT = ref(false)
const isLoggedIn = ref(false)
const isLoading = ref(true)
const error = ref('')

let unsubscribeAuth: (() => void) | null = null
let requestVersion = 0

const visibleDecks = computed(() =>
  getVisibleDecks(decks.value, shouldShowLGBT.value),
)

const dropdownOptions = computed(() =>
  visibleDecks.value.map((deck) => ({
    value: deck.id,
    label: deck.title,
    description: deck.description,
    detail: `${deck.cards} cards`,
  })),
)

const selectedDeck = computed(() =>
  visibleDecks.value.find(
    (deck) => deck.id === selectedDeckId.value,
  ),
)

const progressPoints = computed<ProgressPoint[]>(() => {
  if (!selectedDeck.value) return []

  const matching = results.value.filter(({ data }) => {
    const mode = data.mode ?? 'reading'

    return (
      data.deckId === selectedDeck.value?.id &&
      mode === selectedMode.value
    )
  })

  return matching
    .map(({ resultId, data }): ProgressPoint => {
      if (data.mode === 'listening') {
        const listening = data as ListeningQuizResult

        const correct = listening.results.filter(
          (answer) => answer.correct,
        ).length

        const total = listening.totalQuestions

        return {
          resultId,
          startedAt: listening.startedAt,
          completedAt: listening.completedAt,
          score: correct,
          totalPoints: total,
          percentage: total ? (correct / total) * 100 : 0,
        }
      }

      const reading = data as QuizResult

      const correct = reading.results.reduce(
        (total, card) =>
          total +
          Number(card.pinyin.correct) +
          Number(card.english.correct),
        0,
      )

      const total = reading.totalCards * 2

      return {
        resultId,
        startedAt: reading.startedAt,
        completedAt: reading.completedAt,
        score: correct,
        totalPoints: total,
        percentage: total ? (correct / total) * 100 : 0,
      }
    })
    .sort(
      (a, b) =>
        Date.parse(a.startedAt) - Date.parse(b.startedAt) ||
        a.resultId.localeCompare(b.resultId),
    )
})

const latestPoint = computed(
  () => progressPoints.value.at(-1) ?? null,
)

const firstPoint = computed(
  () => progressPoints.value[0] ?? null,
)

const improvement = computed(() => {
  if (!latestPoint.value || !firstPoint.value) return null
  if (progressPoints.value.length < 2) return null

  return (
    latestPoint.value.percentage -
    firstPoint.value.percentage
  )
})

const averageScore = computed(() => {
  if (!progressPoints.value.length) return 0

  const total = progressPoints.value.reduce(
    (sum, point) => sum + point.percentage,
    0,
  )

  return total / progressPoints.value.length
})

const modeLabel = computed(() =>
  selectedMode.value === 'listening'
    ? 'Listening'
    : 'Reading',
)

const quizRoute = computed(() => ({
  name:
    selectedMode.value === 'listening'
      ? 'listening-quiz'
      : 'quiz',
  params: {
    deckId: selectedDeck.value?.id ?? '',
  },
}))

const latestResultRoute = computed(() => ({
  name:
    selectedMode.value === 'listening'
      ? 'listening-result'
      : 'result',
  params: {
    resultId: latestPoint.value?.resultId ?? '',
  },
}))

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const loadProgress = async (uid: string): Promise<void> => {
  const version = ++requestVersion

  isLoading.value = true
  error.value = ''

  try {
    const [manifestResponse, preferenceSnapshot, resultsSnapshot] =
      await Promise.all([
        fetch(`${import.meta.env.BASE_URL}deck-manifest.json`),
        get(dbRef(db, `users/${uid}/shouldShowLGBT`)),
        get(dbRef(db, `users/${uid}/results`)),
      ])

    if (!manifestResponse.ok) {
      throw new Error('Unable to load deck manifest.')
    }

    const manifest: DeckManifest =
      await manifestResponse.json()

    if (version !== requestVersion) return

    shouldShowLGBT.value = preferenceSnapshot.val() === true
    decks.value = manifest.decks

    const savedResults: SavedResult[] = []

    resultsSnapshot.forEach((child) => {
      if (!child.key) return

      savedResults.push({
        resultId: child.key,
        data: child.val() as SavedQuizResult,
      })
    })

    results.value = savedResults

    const mostRecent = [...savedResults].sort(
      (a, b) =>
        Date.parse(b.data.completedAt) -
        Date.parse(a.data.completedAt),
    )[0]

    selectedDeckId.value =
      visibleDecks.value.find(
        (deck) => deck.id === mostRecent?.data.deckId,
      )?.id ?? visibleDecks.value[0]?.id

    selectedMode.value =
      mostRecent?.data.mode === 'listening'
        ? 'listening'
        : 'reading'
  } catch (err) {
    if (version !== requestVersion) return

    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to load progress.'
  } finally {
    if (version === requestVersion) {
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
      selectedMode.value = 'reading'
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

      <p v-if="isLoading" role="status">
        Loading your progress...
      </p>

      <p v-else-if="error" role="alert" class="progress-error">
        {{ error }}
      </p>

      <div v-else-if="!isLoggedIn" class="progress-message">
        <h4>Sign in to track your progress</h4>

        <p>
          Log in to see how your vocabulary recognition improves
          over time.
        </p>

        <RouterLink to="/login">
          Log In
        </RouterLink>
      </div>

      <div
        v-else-if="!visibleDecks.length"
        class="progress-message"
      >
        <p>No vocabulary decks are available.</p>
      </div>

      <template v-else>
        <div
          class="mode-toggle"
          role="group"
          aria-label="Quiz mode"
        >
          <button
            type="button"
            :class="{ active: selectedMode === 'reading' }"
            :aria-pressed="selectedMode === 'reading'"
            @click="selectedMode = 'reading'"
          >
            Reading
          </button>

          <button
            type="button"
            :class="{ active: selectedMode === 'listening' }"
            :aria-pressed="selectedMode === 'listening'"
            @click="selectedMode = 'listening'"
          >
            Listening
          </button>
        </div>

        <div class="progress-selection">
          <DeckDropdown
            v-model="selectedDeckId"
            :options="dropdownOptions"
            label="Choose a vocabulary deck"
            placeholder="Search vocabulary decks..."
          />
        </div>

        <template v-if="selectedDeck">
          <div class="progress-heading">
            <h4>{{ selectedDeck.title }}</h4>
            <p>{{ selectedDeck.description }}</p>
          </div>

          <div
            v-if="!progressPoints.length"
            class="progress-message"
          >
            <h4>No {{ modeLabel.toLowerCase() }} reviews yet</h4>

            <p>
              Complete a {{ modeLabel.toLowerCase() }} review
              to begin tracking your progress.
            </p>

            <RouterLink :to="quizRoute" class="progress-button">
              Start {{ modeLabel }}
            </RouterLink>
          </div>

          <template v-else>
            <div class="progress-stats">
              <div class="stat">
                <span class="stat-label">Reviews Completed</span>
                <strong>{{ progressPoints.length }}</strong>
              </div>

              <div class="stat">
                <span class="stat-label">Latest Score</span>
                <strong>
                  {{ latestPoint?.percentage.toFixed(1) }}%
                </strong>
              </div>

              <div class="stat">
                <span class="stat-label">Average Score</span>
                <strong>
                  {{ averageScore.toFixed(1) }}%
                </strong>
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
              <h4>{{ modeLabel }} Performance Over Time</h4>

              <ProgressChart :points="progressPoints" />
            </div>

            <div class="progress-footer">
              <p v-if="latestPoint">
                Last review:
                {{ formatDate(latestPoint.completedAt) }}
              </p>

              <RouterLink
                v-if="latestPoint"
                :to="latestResultRoute"
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
  font-size: 1.5rem;
}

h3 span {
  font-family: var(--font-brand);
}

.mode-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  max-width: 36rem;
  padding: 0.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-surface) r g b / 60%);
}

.mode-toggle button {
  padding: 0.75rem;
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.mode-toggle button.active {
  background: var(--color-text);
  color: var(--color-background);
}

.progress-selection {
  width: 100%;
  max-width: 36rem;
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
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  text-decoration: none;
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
  color: #b42318;
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