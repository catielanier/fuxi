<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import ResultCard from '@/components/SubComponents/ResultCard.vue'
import type {
  DeckManifest,
  QuizResult,
  QuizCardResult,
  VocabularyCard,
  VocabularyDeck,
} from '@/data/types'

const props = defineProps<{
  result?: QuizResult | null
  resultId?: string
}>()

const route = useRoute()
const auth = getAuth(firebase)
const db = getDatabase(firebase)

const audioFiles = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const result = ref<QuizResult | null>(null)
const vocabularyCards = ref<VocabularyCard[]>([])

const isLoading = ref(true)
const isVocabularyLoading = ref(false)
const error = ref('')

const authReady = ref(false)
const currentUser = ref<User | null>(null)

const playingCardIndex = ref<number | null>(null)

let audioPlayer: HTMLAudioElement | null = null
let unsubscribeAuth: (() => void) | null = null
let requestVersion = 0
let audioRequestVersion = 0

const activeResultId = computed(() => {
  const id = props.resultId ?? route.params.resultId
  return typeof id === 'string' ? id : undefined
})

const totalCards = computed(() => result.value?.totalCards ?? 0)

const totalPoints = computed(() => totalCards.value * 2)

const correctPinyin = computed(
  () => result.value?.results.reduce((total, card) => total + Number(card.pinyin.correct), 0) ?? 0,
)

const correctEnglish = computed(
  () => result.value?.results.reduce((total, card) => total + Number(card.english.correct), 0) ?? 0,
)

const score = computed(() => correctPinyin.value + correctEnglish.value)

const percentage = computed(() => {
  if (!totalPoints.value) return 0

  return (score.value / totalPoints.value) * 100
})

const correctCards = computed(
  () =>
    result.value?.results.filter((card) => card.pinyin.correct && card.english.correct).length ?? 0,
)

const partialCards = computed(
  () =>
    result.value?.results.filter((card) => card.pinyin.correct !== card.english.correct).length ??
    0,
)

const incorrectCards = computed(
  () =>
    result.value?.results.filter((card) => !card.pinyin.correct && !card.english.correct).length ??
    0,
)

const sortedResults = computed<QuizCardResult[]>(() => result.value?.results ?? [])

const formatDate = (date: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const getVocabularyCard = (card: QuizCardResult): VocabularyCard | undefined => {
  const indexedCard = vocabularyCards.value[card.cardIndex]

  if (indexedCard?.hanzi === card.hanzi) {
    return indexedCard
  }

  return vocabularyCards.value.find((vocabularyCard) => vocabularyCard.hanzi === card.hanzi)
}

const getAudioUrl = (card: QuizCardResult): string | null => {
  const filename = getVocabularyCard(card)?.audio

  if (!filename) return null

  return audioFiles[`../assets/audio/${filename}`] ?? null
}

const stopAudio = (): void => {
  ++audioRequestVersion

  if (audioPlayer) {
    audioPlayer.pause()
    audioPlayer.currentTime = 0
  }

  playingCardIndex.value = null
}

const playAudio = async (cardIndex: number): Promise<void> => {
  const card = result.value?.results.find((item) => item.cardIndex === cardIndex)

  if (!card || !audioPlayer) return

  const url = getAudioUrl(card)

  if (!url) return

  if (playingCardIndex.value === cardIndex && !audioPlayer.paused) {
    stopAudio()
    return
  }

  stopAudio()

  const currentRequest = audioRequestVersion

  audioPlayer.src = url
  playingCardIndex.value = cardIndex

  try {
    await audioPlayer.play()

    if (currentRequest !== audioRequestVersion) {
      audioPlayer.pause()
    }
  } catch (err) {
    if (currentRequest !== audioRequestVersion) return

    console.error('Unable to play audio:', err)
    playingCardIndex.value = null
  }
}

const handleAudioEnded = (): void => {
  playingCardIndex.value = null
}

const handleAudioError = (): void => {
  playingCardIndex.value = null
}

const loadVocabulary = async (deckId: string, version: number): Promise<void> => {
  isVocabularyLoading.value = true
  vocabularyCards.value = []

  try {
    const manifestResponse = await fetch(`${import.meta.env.BASE_URL}deck-manifest.json`)

    if (!manifestResponse.ok) {
      throw new Error('Unable to load deck manifest.')
    }

    const manifest: DeckManifest = await manifestResponse.json()

    const deck = manifest.decks.find((item) => item.id === deckId)

    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`)
    }

    // Normalize the path to avoid duplicating "decks/".
    const relativePath = deck.filename.replace(/^\/+/, '')

    const deckPath = relativePath.startsWith('decks/') ? relativePath : `decks/${relativePath}`

    const vocabularyResponse = await fetch(`${import.meta.env.BASE_URL}${deckPath}`)

    if (!vocabularyResponse.ok) {
      throw new Error(`Unable to load vocabulary: ${deckPath}`)
    }

    // Detect unexpected HTML responses before attempting JSON parsing.
    const contentType = vocabularyResponse.headers.get('content-type') ?? ''

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Expected JSON but received ${contentType || 'unknown content type'} from ${deckPath}`,
      )
    }

    const vocabulary: VocabularyDeck = await vocabularyResponse.json()

    if (version !== requestVersion) return

    if (vocabulary.id !== deck.id) {
      throw new Error('Deck ID does not match its manifest.')
    }

    vocabularyCards.value = vocabulary.cards
  } catch (err) {
    if (version !== requestVersion) return

    console.error('Unable to load vocabulary audio:', err)
    vocabularyCards.value = []
  } finally {
    if (version === requestVersion) {
      isVocabularyLoading.value = false
    }
  }
}

const loadResult = async (): Promise<void> => {
  const version = ++requestVersion

  stopAudio()

  result.value = null
  vocabularyCards.value = []
  isLoading.value = true
  isVocabularyLoading.value = false
  error.value = ''

  try {
    let loadedResult: QuizResult | null = null

    if (props.result && !activeResultId.value) {
      loadedResult = props.result
    } else if (activeResultId.value) {
      if (!currentUser.value) {
        throw new Error('Please log in to view this result.')
      }

      const resultRef = dbRef(db, `users/${currentUser.value.uid}/results/${activeResultId.value}`)

      const snapshot = await get(resultRef)

      if (!snapshot.exists()) {
        throw new Error('Result not found.')
      }

      loadedResult = snapshot.val() as QuizResult
    } else if (props.result) {
      loadedResult = props.result
    }

    if (version !== requestVersion) return

    if (!loadedResult) {
      throw new Error('No quiz result is available.')
    }

    result.value = loadedResult
    isLoading.value = false

    await loadVocabulary(loadedResult.deckId, version)
  } catch (err) {
    if (version !== requestVersion) return

    error.value = err instanceof Error ? err.message : 'Unable to load results.'

    isLoading.value = false
    isVocabularyLoading.value = false
  }
}

watch([authReady, currentUser, activeResultId, () => props.result], () => {
  if (!authReady.value) return

  void loadResult()
})

onMounted(() => {
  audioPlayer = new Audio()
  audioPlayer.preload = 'none'
  audioPlayer.autoplay = false

  audioPlayer.addEventListener('ended', handleAudioEnded)
  audioPlayer.addEventListener('error', handleAudioError)

  unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      currentUser.value = user
      authReady.value = true
    },
    (err) => {
      console.error('Authentication error:', err)
      currentUser.value = null
      authReady.value = true
    },
  )
})

onUnmounted(() => {
  ++requestVersion

  unsubscribeAuth?.()

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
    <section class="content-container results-page">
      <h3><span>复习结果</span> · Results</h3>

      <p v-if="isLoading" role="status">Loading results...</p>

      <p v-else-if="error" role="alert" class="results-error">
        {{ error }}
      </p>

      <template v-else-if="result">
        <div class="results-heading">
          <div>
            <h4>{{ result.deckTitle }}</h4>

            <p>Completed {{ formatDate(result.completedAt) }}</p>
          </div>

          <RouterLink
            :to="{
              name: 'quiz',
              params: { deckId: result.deckId },
            }"
            class="review-button"
          >
            Review Again
          </RouterLink>
        </div>

        <div class="score-summary">
          <div class="score-primary">
            <span class="score-label">Your Score</span>

            <strong class="score-percentage"> {{ percentage.toFixed(1) }}% </strong>

            <span class="score-points"> {{ score }} / {{ totalPoints }} points </span>
          </div>

          <div class="score-breakdown">
            <div class="score-stat">
              <span>Pinyin Correct</span>
              <strong> {{ correctPinyin }} / {{ totalCards }} </strong>
            </div>

            <div class="score-stat">
              <span>English Correct</span>
              <strong> {{ correctEnglish }} / {{ totalCards }} </strong>
            </div>
          </div>
        </div>

        <div class="card-summary">
          <div class="summary-item summary-correct">
            <strong>{{ correctCards }}</strong>
            <span>Fully Correct</span>
          </div>

          <div class="summary-item summary-partial">
            <strong>{{ partialCards }}</strong>
            <span>Partially Correct</span>
          </div>

          <div class="summary-item summary-incorrect">
            <strong>{{ incorrectCards }}</strong>
            <span>Incorrect</span>
          </div>
        </div>

        <div class="results-list-heading">
          <h4>Vocabulary Review</h4>

          <p v-if="isVocabularyLoading" role="status">Loading pronunciation files...</p>
        </div>

        <div class="results-grid">
          <ResultCard
            v-for="(card, index) in sortedResults"
            :key="`${card.cardIndex}-${index}`"
            :card="card"
            :number="index + 1"
            :audio-url="getAudioUrl(card)"
            :is-playing="playingCardIndex === card.cardIndex"
            @play-audio="playAudio"
          />
        </div>

        <div class="results-actions">
          <RouterLink to="/decks" class="back-button"> Back to Decks </RouterLink>

          <RouterLink v-if="currentUser" to="/history" class="back-button">
            View History
          </RouterLink>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.results-page {
  font-family: var(--font-ui);
}

h3 {
  margin: 0 0 1.5rem;
  font-family: var(--font-ui);
  font-size: 1.5rem;
  line-height: 1.2;
  color: var(--color-text);
}

h3 span {
  font-family: var(--font-brand);
}

.results-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.results-heading h4 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.results-heading p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.score-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: rgb(from var(--color-surface) r g b / 75%);
}

.score-primary {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
}

.score-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.score-percentage {
  font-size: clamp(2.5rem, 7vw, 4rem);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--color-primary);
}

.score-points {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
}

.score-stat {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.score-stat span {
  font-size: 0.9rem;
  color: var(--color-text-muted);
}

.score-stat strong {
  font-variant-numeric: tabular-nums;
}

.card-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.5rem 0 2rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: rgb(from var(--color-surface) r g b / 65%);
  text-align: center;
}

.summary-item strong {
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
}

.summary-item span {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.summary-correct strong {
  color: #54877b;
}

.summary-partial strong {
  color: var(--color-accent);
}

.summary-incorrect strong {
  color: #b85c5c;
}

.results-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.results-list-heading h4 {
  margin: 0;
  font-size: 1.25rem;
}

.results-list-heading p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
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

.review-button,
.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  font: inherit;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
}

.review-button {
  background: var(--color-text);
  color: var(--color-background);
}

.back-button {
  background: transparent;
  color: var(--color-text);
}

.review-button:hover,
.back-button:hover {
  opacity: 0.8;
}

.results-error {
  color: #b85c5c;
}

@media (max-width: 700px) {
  .results-grid {
    grid-template-columns: 1fr;
  }

  .score-summary {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .card-summary {
    gap: 0.5rem;
  }

  .summary-item {
    padding: 0.75rem 0.5rem;
  }

  .summary-item strong {
    font-size: 1.4rem;
  }

  .summary-item span {
    font-size: 0.7rem;
  }

  .results-actions > * {
    flex: 1;
  }
}
</style>
