<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import { getDatabase, push, ref as dbRef, set } from 'firebase/database'
import firebase from '@/utils/firebase'
import QuizCard from '@/components/SubComponents/QuizCard.vue'
import { formatPinyin } from '@/utils/pinyin'
import type {
  Deck,
  DeckManifest,
  VocabularyCard,
  VocabularyDeck,
  QuizAnswer,
  QuizCardResult,
  QuizResult,
} from '@/data/types'

type QuizStage = 'pinyin' | 'english'

const route = useRoute()
const router = useRouter()

const deck = ref<Deck | null>(null)
const vocabulary = ref<VocabularyDeck | null>(null)

const isLoading = ref(true)
const isSaving = ref(false)
const error = ref('')

const currentIndex = ref(0)
const stage = ref<QuizStage>('pinyin')
const answered = ref(false)

const pinyinInput = ref('')
const englishInput = ref('')

const pinyinResult = ref<QuizAnswer | null>(null)
const englishResult = ref<QuizAnswer | null>(null)

const results = ref<QuizCardResult[]>([])
const startedAt = ref('')

const quizCardElement = ref<InstanceType<typeof QuizCard> | null>(null)

const shuffledCards = ref<{ card: VocabularyCard; originalIndex: number }[]>([])

const currentEntry = computed(() => shuffledCards.value[currentIndex.value] ?? null)

const currentCard = computed(() => currentEntry.value?.card ?? null)

const totalCards = computed(() => shuffledCards.value.length)

const progress = computed(() =>
  totalCards.value ? Math.round((currentIndex.value / totalCards.value) * 100) : 0,
)

const currentResult = computed(() =>
  stage.value === 'pinyin' ? pinyinResult.value : englishResult.value,
)

const normalizePinyin = (value: string): string =>
  value.normalize('NFC').toLowerCase().replace(/\s+/g, '')

const normalizeEnglish = (value: string): string =>
  value
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')

const shuffleCards = (cards: VocabularyCard[]) => {
  const entries = cards.map((card, originalIndex) => ({
    card,
    originalIndex,
  }))

  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[entries[i], entries[j]] = [entries[j]!, entries[i]!]
  }

  return entries
}

const resetCard = (): void => {
  stage.value = 'pinyin'
  answered.value = false

  pinyinInput.value = ''
  englishInput.value = ''

  pinyinResult.value = null
  englishResult.value = null
}

const focusInput = async (): Promise<void> => {
  await nextTick()
  await quizCardElement.value?.focusInput()
}

const submitPinyin = (): void => {
  if (!currentCard.value || answered.value || isSaving.value) return
  if (!pinyinInput.value.trim()) return

  let submitted: string

  try {
    submitted = formatPinyin(pinyinInput.value)
  } catch {
    error.value = 'Please enter valid Pinyin.'
    return
  }

  error.value = ''

  const expected = currentCard.value.pinyin

  pinyinResult.value = {
    submitted,
    expected: [expected],
    correct: normalizePinyin(submitted) === normalizePinyin(expected),
  }

  answered.value = true
}

const submitEnglish = (): void => {
  if (!currentCard.value || answered.value || isSaving.value) return
  if (!englishInput.value.trim()) return

  const submitted = englishInput.value.trim()
  const expected = currentCard.value.english_answers

  englishResult.value = {
    submitted,
    expected: [...expected],
    correct: expected.some(
      (answer) => normalizeEnglish(answer) === normalizeEnglish(submitted),
    ),
  }

  error.value = ''
  answered.value = true
}

const submitAnswer = (): void => {
  if (stage.value === 'pinyin') {
    submitPinyin()
  } else {
    submitEnglish()
  }
}

const completeQuiz = async (): Promise<void> => {
  if (!deck.value || isSaving.value) return

  isSaving.value = true
  error.value = ''

  const result: QuizResult = {
    deckId: deck.value.id,
    deckTitle: deck.value.title,
    startedAt: startedAt.value,
    completedAt: new Date().toISOString(),
    totalCards: totalCards.value,
    results: results.value,
  }

  try {
    const auth = getAuth(firebase)
    const user = auth.currentUser

    if (user) {
      const database = getDatabase(firebase)

      const resultsRef = dbRef(database, `users/${user.uid}/results`)

      const newResultRef = push(resultsRef)

      if (!newResultRef.key) {
        throw new Error('Unable to generate result ID.')
      }

      await set(newResultRef, result)

      await router.push({
        name: 'result',
        params: { resultId: newResultRef.key },
      })
    } else {
      await router.push({
        name: 'results',
        state: {
          guestResult: JSON.stringify(result),
        },
      })
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to save your results.'
  } finally {
    isSaving.value = false
  }
}

const nextStage = async (): Promise<void> => {
  if (!answered.value || !currentCard.value || isSaving.value) return

  if (stage.value === 'pinyin') {
    stage.value = 'english'
    answered.value = false
    error.value = ''

    await focusInput()
    return
  }

  if (!pinyinResult.value || !englishResult.value) return
  if (!currentEntry.value) return

  if (currentIndex.value + 1 >= totalCards.value) {
    results.value.push({
      cardIndex: currentEntry.value.originalIndex,
      hanzi: currentCard.value.hanzi,
      pinyin: { ...pinyinResult.value },
      english: { ...englishResult.value },
    })

    await completeQuiz()
    return
  }

  results.value.push({
    cardIndex: currentEntry.value.originalIndex,
    hanzi: currentCard.value.hanzi,
    pinyin: { ...pinyinResult.value },
    english: { ...englishResult.value },
  })

  currentIndex.value++
  resetCard()
  error.value = ''

  await focusInput()
}

const loadDeck = async (deckId: string, signal?: AbortSignal): Promise<void> => {
  isLoading.value = true
  error.value = ''

  deck.value = null
  vocabulary.value = null
  shuffledCards.value = []

  results.value = []
  currentIndex.value = 0

  resetCard()

  try {
    const manifestResponse = await fetch(`${import.meta.env.BASE_URL}deck-manifest.json`, {
      signal,
    })

    if (!manifestResponse.ok) {
      throw new Error('Unable to load deck manifest.')
    }

    const manifest: DeckManifest = await manifestResponse.json()

    const selectedDeck = manifest.decks.find((item) => item.id === deckId)

    if (!selectedDeck) {
      throw new Error(`Deck "${deckId}" not found.`)
    }

    const deckResponse = await fetch(`${import.meta.env.BASE_URL}${selectedDeck.filename}`, {
      signal,
    })

    if (!deckResponse.ok) {
      throw new Error(`Unable to load ${selectedDeck.title}.`)
    }

    const data: VocabularyDeck = await deckResponse.json()

    if (signal?.aborted) return

    if (data.id !== selectedDeck.id) {
      throw new Error('Deck ID does not match its manifest.')
    }

    if (!data.cards.length) {
      throw new Error('This vocabulary deck is empty.')
    }

    deck.value = selectedDeck
    vocabulary.value = data
    shuffledCards.value = shuffleCards(data.cards)

    startedAt.value = new Date().toISOString()
  } catch (err) {
    if (signal?.aborted) return

    error.value = err instanceof Error ? err.message : 'Unable to load deck.'
  } finally {
    if (!signal?.aborted) {
      isLoading.value = false

      if (currentCard.value && deck.value) {
        await focusInput()
      }
    }
  }
}

watch(
  () => route.params.deckId,
  (deckId, _, onCleanup) => {
    const controller = new AbortController()

    onCleanup(() => controller.abort())

    if (typeof deckId === 'string') {
      void loadDeck(deckId, controller.signal)
    }
  },
  { immediate: true },
)
</script>

<template>
  <main>
    <section class="content-container quiz">
      <p v-if="isLoading">
        Loading vocabulary...
      </p>

      <template v-else-if="currentCard && deck">
        <header class="quiz-header">
          <h3>{{ deck.title }}</h3>

          <span>
            Card {{ currentIndex + 1 }} of {{ totalCards }}
          </span>
        </header>

        <div
          class="quiz-progress"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${progress}% of deck completed`"
        >
          <div
            class="quiz-progress-fill"
            :style="{ width: `${progress}%` }"
          />
        </div>

        <QuizCard
          ref="quizCardElement"
          :key="currentIndex"
          v-model:pinyin-input="pinyinInput"
          v-model:english-input="englishInput"
          :card="currentCard"
          :stage="stage"
          :answered="answered"
          :current-result="currentResult"
          :card-number="currentIndex + 1"
          :total-cards="totalCards"
          :is-saving="isSaving"
          :error="error"
          @submit="submitAnswer"
          @continue="nextStage"
        />
      </template>

      <p v-else-if="error" role="alert">
        {{ error }}
      </p>
    </section>
  </main>
</template>

<style scoped>
.quiz {
  font-family: var(--font-ui);
}

.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.quiz-header h3 {
  margin: 0;
}

.quiz-progress {
  height: 0.4rem;
  margin: 1.5rem 0;
  overflow: hidden;
  background: var(--color-background-soft, #ddd);
  border-radius: 999px;
}

.quiz-progress-fill {
  height: 100%;
  background: var(--color-text);
  border-radius: inherit;
  transition: width 0.25s ease;
}
</style>