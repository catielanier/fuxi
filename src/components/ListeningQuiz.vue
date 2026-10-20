<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import { getDatabase, get, push, ref as dbRef, set } from 'firebase/database'
import firebase from '@/utils/firebase'
import ListeningCard from '@/components/SubComponents/ListeningCard.vue'
import {
  generateListeningQuestions,
  getAudioUrl,
  isCorrectListeningAnswer,
  loadListeningManifest,
  loadListeningVocabulary,
  shuffleListeningQuestions,
} from '@/utils/listening'
import { canAccessDeck } from '@/utils/deckVisibility'
import type {
  Deck,
  ListeningCardResult,
  ListeningQuestion,
  ListeningQuizResult,
} from '@/data/types'

const route = useRoute()
const router = useRouter()

const auth = getAuth(firebase)
const db = getDatabase(firebase)

const deck = ref<Deck | null>(null)
const questions = ref<ListeningQuestion[]>([])
const answers = ref<ListeningCardResult[]>([])

const currentIndex = ref(0)
const submittedAnswer = ref('')
const answered = ref(false)
const correct = ref<boolean | null>(null)

const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')
const startedAt = ref('')

const isPlaying = ref(false)
const listeningCardElement = ref<InstanceType<typeof ListeningCard> | null>(null)

let audioPlayer: HTMLAudioElement | null = null
let controller: AbortController | null = null
let requestVersion = 0
let audioRequestVersion = 0
let completed = false

const currentQuestion = computed(
  () => questions.value[currentIndex.value] ?? null,
)

const totalQuestions = computed(() => questions.value.length)

const progress = computed(() =>
  totalQuestions.value
    ? Math.round((currentIndex.value / totalQuestions.value) * 100)
    : 0,
)

const stopAudio = (): void => {
  ++audioRequestVersion

  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer.currentTime = 0
  }

  isPlaying.value = false
}

const playAudio = async (): Promise<void> => {
  if (!audioPlayer || !currentQuestion.value || isSaving.value) {
    return
  }

  if (isPlaying.value) {
    stopAudio()
    return
  }

  const url = getAudioUrl(currentQuestion.value.audio)

  if (!url) {
    error.value = 'Audio is not available for this question.'
    return
  }

  stopAudio()
  error.value = ''

  const player = audioPlayer
  const playbackVersion = audioRequestVersion

  player.src = url

  try {
    await player.play()

    if (playbackVersion !== audioRequestVersion) {
      return
    }

    isPlaying.value = !player.paused
  } catch (err) {
    if (playbackVersion !== audioRequestVersion) {
      return
    }

    console.error('Audio playback failed:', err)
    error.value = 'Unable to play pronunciation.'
    isPlaying.value = false
  }
}

const submitAnswer = (): void => {
  if (
    !currentQuestion.value ||
    answered.value ||
    isSaving.value ||
    completed ||
    !submittedAnswer.value.trim()
  ) {
    return
  }

  stopAudio()
  error.value = ''

  correct.value = isCorrectListeningAnswer(
    submittedAnswer.value,
    currentQuestion.value,
  )

  answered.value = true
}

const completeQuiz = async (): Promise<void> => {
  if (!deck.value || isSaving.value || completed) {
    return
  }

  isSaving.value = true
  error.value = ''

  const result: ListeningQuizResult = {
    mode: 'listening',
    deckId: deck.value.id,
    deckTitle: deck.value.title,
    startedAt: startedAt.value,
    completedAt: new Date().toISOString(),
    totalQuestions: totalQuestions.value,
    results: answers.value.map((answer) => ({
      ...answer,
      acceptedAnswers: answer.acceptedAnswers.map((candidate) => ({
        hanzi: candidate.hanzi,
        english: [...candidate.english],
      })),
    })),
  }

  try {
    const user = auth.currentUser

    if (user) {
      const resultsRef = dbRef(db, `users/${user.uid}/results`)
      const newResultRef = push(resultsRef)

      if (!newResultRef.key) {
        throw new Error('Unable to generate result ID.')
      }

      await set(newResultRef, result)

      completed = true

      await router.push({
        name: 'listening-result',
        params: {
          resultId: newResultRef.key,
        },
      })
    } else {
      completed = true

      await router.push({
        name: 'listening-results',
        state: {
          guestListeningResult: JSON.stringify(result),
        },
      })
    }
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to save listening results.'
  } finally {
    isSaving.value = false
  }
}

const nextQuestion = async (): Promise<void> => {
  if (
    !answered.value ||
    correct.value === null ||
    !currentQuestion.value ||
    isSaving.value ||
    completed
  ) {
    return
  }

  stopAudio()

  if (answers.value.length <= currentIndex.value) {
    answers.value.push({
      questionId: currentQuestion.value.id,
      audio: currentQuestion.value.audio,
      submitted: submittedAnswer.value.trim(),
      correct: correct.value,
      acceptedAnswers: currentQuestion.value.answers.map((answer) => ({
        hanzi: answer.hanzi,
        english: [...answer.english],
      })),
    })
  }

  if (currentIndex.value + 1 >= totalQuestions.value) {
    await completeQuiz()
    return
  }

  currentIndex.value++
  submittedAnswer.value = ''
  answered.value = false
  correct.value = null
  error.value = ''

  await nextTick()
  await listeningCardElement.value?.focusInput()
}

const loadQuiz = async (
  deckId: string,
  signal: AbortSignal,
  version: number,
): Promise<void> => {
  stopAudio()

  deck.value = null
  questions.value = []
  answers.value = []

  currentIndex.value = 0
  submittedAnswer.value = ''
  answered.value = false
  correct.value = null

  completed = false
  startedAt.value = ''

  isLoading.value = true
  isSaving.value = false
  error.value = ''

  try {
    await auth.authStateReady()

    if (signal.aborted || version !== requestVersion) {
      return
    }

    const manifest = await loadListeningManifest(signal)

    const selectedDeck = manifest.decks.find(
      (item) => item.id === deckId,
    )

    if (!selectedDeck) {
      throw new Error(`Listening deck "${deckId}" not found.`)
    }

    const user = auth.currentUser

    const preferenceSnapshot = user
      ? await get(dbRef(db, `users/${user.uid}/shouldShowLGBT`))
      : null

    if (signal.aborted || version !== requestVersion) {
      return
    }

    if (!canAccessDeck(deckId, preferenceSnapshot?.val() === true)) {
      throw new Error('This listening deck is unavailable.')
    }

    const vocabulary = await loadListeningVocabulary(
      selectedDeck.filename,
      signal,
    )

    if (signal.aborted || version !== requestVersion) {
      return
    }

    if (vocabulary.id !== selectedDeck.id) {
      throw new Error('Deck ID does not match its manifest.')
    }

    const generatedQuestions = generateListeningQuestions(
      vocabulary.cards,
    )

    if (!generatedQuestions.length) {
      throw new Error(
        'This deck has no playable listening questions.',
      )
    }

    deck.value = selectedDeck
    questions.value = shuffleListeningQuestions(
      generatedQuestions,
    )

    startedAt.value = new Date().toISOString()
  } catch (err) {
    if (signal.aborted || version !== requestVersion) {
      return
    }

    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to load listening quiz.'
  } finally {
    if (!signal.aborted && version === requestVersion) {
      isLoading.value = false

      await nextTick()
      await listeningCardElement.value?.focusInput()
    }
  }
}

const handleAudioEnded = (): void => {
  isPlaying.value = false
}

const handleAudioError = (): void => {
  isPlaying.value = false
  error.value = 'Unable to play pronunciation.'
}

watch(
  () => route.params.deckId,
  (deckId, _, onCleanup) => {
    const version = ++requestVersion

    controller?.abort()
    controller = new AbortController()

    const signal = controller.signal

    onCleanup(() => {
      controller?.abort()
    })

    if (typeof deckId === 'string') {
      void loadQuiz(deckId, signal, version)
    } else {
      stopAudio()
      isLoading.value = false
      error.value = 'No listening deck was selected.'
    }
  },
  { immediate: true },
)

onMounted(() => {
  audioPlayer = new Audio()
  audioPlayer.autoplay = false
  audioPlayer.preload = 'none'

  audioPlayer.addEventListener('ended', handleAudioEnded)
  audioPlayer.addEventListener('error', handleAudioError)
})

onUnmounted(() => {
  ++requestVersion

  controller?.abort()
  stopAudio()

  if (audioPlayer) {
    audioPlayer.removeEventListener('ended', handleAudioEnded)
    audioPlayer.removeEventListener('error', handleAudioError)
    audioPlayer.removeAttribute('src')
    audioPlayer.load()
    audioPlayer = null
  }
})
</script>

<template>
  <main>
    <section class="content-container listening-quiz">
      <p v-if="isLoading" role="status">
        Loading listening vocabulary...
      </p>

      <template v-else-if="deck && currentQuestion">
        <header class="quiz-header">
          <h3>{{ deck.title }}</h3>

          <span>
            Question {{ currentIndex + 1 }} of {{ totalQuestions }}
          </span>
        </header>

        <div
          class="quiz-progress"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${progress}% of listening quiz completed`"
        >
          <div
            class="quiz-progress-fill"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <ListeningCard
          ref="listeningCardElement"
          :key="currentIndex"
          v-model:answer="submittedAnswer"
          :question="currentQuestion"
          :question-number="currentIndex + 1"
          :total-questions="totalQuestions"
          :answered="answered"
          :correct="correct"
          :is-playing="isPlaying"
          :is-saving="isSaving"
          :error="error"
          @play="playAudio"
          @submit="submitAnswer"
          @continue="nextQuestion"
        />
      </template>

      <div v-else-if="error" class="quiz-error" role="alert">
        <p>{{ error }}</p>

        <RouterLink to="/listening">
          Back to Listening Decks
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.listening-quiz {
  font-family: var(--font-ui);
}

.quiz-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.quiz-header h3 {
  margin: 0;
}

.quiz-header span {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.quiz-progress {
  height: 0.4rem;
  margin: 1.5rem 0;
  overflow: hidden;
  background: var(--color-border);
  border-radius: 999px;
}

.quiz-progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: inherit;
  transition: width 0.25s ease;
}

.quiz-error {
  color: #b42318;
}
</style>