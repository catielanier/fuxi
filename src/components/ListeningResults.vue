<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import ListeningResultCard from '@/components/SubComponents/ListeningResultCard.vue'
import {
  calculateListeningScore,
  getAudioUrl,
} from '@/utils/listening'
import type { ListeningQuizResult } from '@/data/types'

const props = defineProps<{
  result?: ListeningQuizResult | null
  resultId?: string
}>()

const route = useRoute()
const auth = getAuth(firebase)
const db = getDatabase(firebase)

const result = ref<ListeningQuizResult | null>(null)
const isLoading = ref(true)
const error = ref('')
const playingIndex = ref<number | null>(null)

let audioPlayer: HTMLAudioElement | null = null
let unsubscribeAuth: (() => void) | null = null
let requestVersion = 0

const activeResultId = computed(() => {
  const id = props.resultId ?? route.params.resultId
  return typeof id === 'string' ? id : undefined
})

const correctCount = computed(
  () => result.value?.results.filter((answer) => answer.correct).length ?? 0,
)

const percentage = computed(() =>
  result.value ? calculateListeningScore(result.value) : 0,
)

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const stopAudio = (): void => {
  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer.currentTime = 0
  }

  playingIndex.value = null
}

const playAudio = async (index: number): Promise<void> => {
  const card = result.value?.results[index]

  if (!card || !audioPlayer) return

  const url = getAudioUrl(card.audio)
  if (!url) return

  if (playingIndex.value === index && !audioPlayer.paused) {
    stopAudio()
    return
  }

  stopAudio()

  audioPlayer.src = url

  try {
    await audioPlayer.play()
    playingIndex.value = index
  } catch (err) {
    console.error('Audio playback failed:', err)
    playingIndex.value = null
  }
}

const loadResult = async (): Promise<void> => {
  const version = ++requestVersion

  stopAudio()
  result.value = null
  isLoading.value = true
  error.value = ''

  try {
    let loaded: ListeningQuizResult | null = props.result ?? null

    if (activeResultId.value) {
      const user = auth.currentUser

      if (!user) {
        throw new Error('Please log in to view this result.')
      }

      const snapshot = await get(
        dbRef(
          db,
          `users/${user.uid}/results/${activeResultId.value}`,
        ),
      )

      if (!snapshot.exists()) {
        throw new Error('Listening result not found.')
      }

      loaded = snapshot.val() as ListeningQuizResult
    } else if (!loaded) {
      const savedState = window.history.state?.guestListeningResult

      if (typeof savedState === 'string') {
        loaded = JSON.parse(savedState) as ListeningQuizResult
      }
    }

    if (version !== requestVersion) return

    if (!loaded || loaded.mode !== 'listening') {
      throw new Error('No listening quiz result is available.')
    }

    result.value = loaded
  } catch (err) {
    if (version !== requestVersion) return

    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to load listening results.'
  } finally {
    if (version === requestVersion) {
      isLoading.value = false
    }
  }
}

onMounted(() => {
  audioPlayer = new Audio()
  audioPlayer.autoplay = false
  audioPlayer.preload = 'none'

  audioPlayer.addEventListener('ended', stopAudio)

  unsubscribeAuth = onAuthStateChanged(
    auth,
    () => {
      void loadResult()
    },
    (err) => {
      error.value = err.message
      isLoading.value = false
    },
  )
})

watch(
  [activeResultId, () => props.result],
  () => {
    if (auth.currentUser || !activeResultId.value) {
      void loadResult()
    }
  },
)

onUnmounted(() => {
  ++requestVersion
  unsubscribeAuth?.()

  stopAudio()

  if (audioPlayer) {
    audioPlayer.removeEventListener('ended', stopAudio)
    audioPlayer.removeAttribute('src')
    audioPlayer.load()
    audioPlayer = null
  }
})
</script>

<template>
  <main>
    <section class="content-container listening-results">
      <h3><span>听力结果</span> · Listening Results</h3>

      <p v-if="isLoading" role="status">
        Loading listening results...
      </p>

      <p v-else-if="error" role="alert">
        {{ error }}
      </p>

      <template v-else-if="result">
        <div class="results-heading">
          <div>
            <h4>{{ result.deckTitle }}</h4>
            <p>Completed {{ formatDate(result.completedAt) }}</p>
          </div>

          <RouterLink
            class="action-button"
            :to="{
              name: 'listening-quiz',
              params: { deckId: result.deckId },
            }"
          >
            Listen Again
          </RouterLink>
        </div>

        <div class="score-panel">
          <span>Your Listening Score</span>

          <strong>{{ percentage.toFixed(1) }}%</strong>

          <p>
            {{ correctCount }} / {{ result.totalQuestions }}
            questions correct
          </p>
        </div>

        <h4>Question Review</h4>

        <div class="results-grid">
          <ListeningResultCard
            v-for="(answer, index) in result.results"
            :key="`${answer.questionId}-${index}`"
            :result="answer"
            :number="index + 1"
            :is-playing="playingIndex === index"
            @play="playAudio"
          />
        </div>

        <div class="results-actions">
          <RouterLink to="/listening" class="action-button secondary">
            Back to Listening Decks
          </RouterLink>

          <RouterLink to="/history" class="action-button secondary">
            View History
          </RouterLink>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.listening-results {
  font-family: var(--font-ui);
}

h3 {
  margin: 0 0 1.5rem;
  font-size: 1.5rem;
}

h3 span {
  font-family: var(--font-brand);
}

.results-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.results-heading h4 {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
}

.results-heading p {
  margin: 0;
  color: var(--color-text-muted);
}

.score-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: rgb(from var(--color-surface) r g b / 75%);
}

.score-panel > span {
  color: var(--color-text-muted);
}

.score-panel strong {
  color: var(--color-primary);
  font-size: clamp(2.5rem, 7vw, 4rem);
  font-variant-numeric: tabular-nums;
}

.score-panel p {
  margin: 0;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.results-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
}

.action-button {
  display: inline-flex;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  text-decoration: none;
}

.action-button.secondary {
  background: transparent;
  color: var(--color-text);
}

@media (max-width: 700px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
</style>