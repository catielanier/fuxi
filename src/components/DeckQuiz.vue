<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAuth } from 'firebase/auth'
import { getDatabase, push, ref as dbRef, set } from 'firebase/database'
import firebase from '@/utils/firebase'
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

const pinyinInputElement = ref<HTMLInputElement | null>(null)
const englishInputElement = ref<HTMLInputElement | null>(null)

// Keep the shuffled order independently of the source JSON.
const shuffledCards = ref<{ card: VocabularyCard; originalIndex: number }[]>([])

const currentEntry = computed(() => shuffledCards.value[currentIndex.value] ?? null)

const currentCard = computed(() => currentEntry.value?.card ?? null)

const totalCards = computed(() => shuffledCards.value.length)

const progress = computed(() =>
  totalCards.value ? Math.round((currentIndex.value / totalCards.value) * 100) : 0,
)

const formattedPinyin = computed(() => {
  try {
    return formatPinyin(pinyinInput.value)
  } catch {
    return ''
  }
})

const currentResult = computed(() =>
  stage.value === 'pinyin' ? pinyinResult.value : englishResult.value,
)

// Normalize formatting before grading.
const normalizePinyin = (value: string): string =>
  value.normalize('NFC').toLowerCase().replace(/\s+/g, '')

const normalizeEnglish = (value: string): string =>
  value
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '')

// Fisher-Yates shuffle.
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

  if (stage.value === 'pinyin') {
    pinyinInputElement.value?.focus()
  } else {
    englishInputElement.value?.focus()
  }
}

// Insert a tone number at the current cursor position.
const insertTone = (tone: number): void => {
  if (answered.value) return

  const input = pinyinInputElement.value

  if (!input) {
    pinyinInput.value += String(tone)
    return
  }

  const start = input.selectionStart ?? pinyinInput.value.length
  const end = input.selectionEnd ?? start

  pinyinInput.value = pinyinInput.value.slice(0, start) + tone + pinyinInput.value.slice(end)

  void nextTick(() => {
    input.focus()
    input.setSelectionRange(start + 1, start + 1)
  })
}

const submitPinyin = (): void => {
  if (!currentCard.value || answered.value) return
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
  if (!currentCard.value || answered.value) return
  if (!englishInput.value.trim()) return

  const submitted = englishInput.value.trim()
  const expected = currentCard.value.english_answers

  englishResult.value = {
    submitted,
    expected: [...expected],
    correct: expected.some((answer) => normalizeEnglish(answer) === normalizeEnglish(submitted)),
  }

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
  if (!answered.value || !currentCard.value) return

  if (stage.value === 'pinyin') {
    stage.value = 'english'
    answered.value = false

    await focusInput()
    return
  }

  if (!pinyinResult.value || !englishResult.value) return
  if (!currentEntry.value) return

  results.value.push({
    cardIndex: currentEntry.value.originalIndex,
    hanzi: currentCard.value.hanzi,
    pinyin: { ...pinyinResult.value },
    english: { ...englishResult.value },
  })

  if (currentIndex.value + 1 >= totalCards.value) {
    await completeQuiz()
    return
  }

  currentIndex.value++
  resetCard()

  await focusInput()
}

const loadDeck = async (deckId: string, signal?: AbortSignal): Promise<void> => {
  isLoading.value = true
  error.value = ''
  deck.value = null
  vocabulary.value = null

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
      <p v-if="isLoading">Loading vocabulary...</p>

      <template v-else-if="currentCard && deck">
        <header class="quiz-header">
          <h3>{{ deck.title }}</h3>

          <span> Card {{ currentIndex + 1 }} of {{ totalCards }} </span>
        </header>

        <div
          class="quiz-progress"
          role="progressbar"
          :aria-valuenow="progress"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${progress}% of deck completed`"
        >
          <div class="quiz-progress-fill" :style="{ width: `${progress}%` }" />
        </div>

        <div class="quiz-card">
          <h1 class="hanzi" lang="zh-Hans">
            {{ currentCard.hanzi }}
          </h1>
        </div>

        <form class="quiz-form" @submit.prevent="answered ? nextStage() : submitAnswer()">
          <template v-if="stage === 'pinyin'">
            <label for="pinyin-answer"> Enter the Pinyin </label>

            <input
              id="pinyin-answer"
              ref="pinyinInputElement"
              v-model="pinyinInput"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              placeholder="e.g. ni3hao3"
              :disabled="answered"
            />

            <div class="tone-buttons">
              <button
                v-for="tone in 4"
                :key="tone"
                type="button"
                :disabled="answered"
                @pointerdown.prevent
                @click="insertTone(tone)"
              >
                {{ tone }}
              </button>
            </div>

            <p class="pinyin-preview" aria-live="polite">
              {{ formattedPinyin || ' ' }}
            </p>
          </template>

          <template v-else>
            <label for="english-answer"> Enter the English meaning </label>

            <input
              id="english-answer"
              ref="englishInputElement"
              v-model="englishInput"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="English definition"
              :disabled="answered"
            />
          </template>

          <p
            v-if="answered && currentResult"
            class="answer-feedback"
            :class="{
              correct: currentResult.correct,
              incorrect: !currentResult.correct,
            }"
            role="status"
          >
            {{ currentResult.correct ? 'Correct!' : 'Incorrect.' }}
          </p>

          <p v-if="error" class="quiz-error" role="alert">
            {{ error }}
          </p>

          <button
            type="submit"
            class="quiz-submit"
            :disabled="
              isSaving ||
              (!answered && !(stage === 'pinyin' ? pinyinInput.trim() : englishInput.trim()))
            "
          >
            <template v-if="isSaving"> Saving results... </template>

            <template v-else-if="!answered"> Submit Answer </template>

            <template v-else-if="stage === 'pinyin'"> Continue to English </template>

            <template v-else-if="currentIndex + 1 === totalCards"> Finish Review </template>

            <template v-else> Next Card </template>
          </button>
        </form>
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

.quiz-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 15rem;
  padding: 2rem;
}

.hanzi {
  margin: 0;
  font-family: var(--font-hanzi);
  font-size: clamp(4rem, 12vw, 7rem);
  font-weight: 400;
  line-height: 1.3;
  text-align: center;
  overflow-wrap: anywhere;
}

.quiz-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 36rem;
  margin-inline: auto;
  font-family: var(--font-ui);
}

.quiz-form label {
  font-weight: 600;
}

.quiz-form input {
  width: 100%;
  min-width: 0;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
}

.quiz-form input:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.tone-buttons {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
}

.tone-buttons button {
  padding: 0.75rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  font: inherit;
  cursor: pointer;
}

.tone-buttons button:hover:not(:disabled) {
  background: var(--color-text);
  color: var(--color-background);
}

.tone-buttons button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pinyin-preview {
  min-height: 2rem;
  margin: 0;
  text-align: center;
  font-family: var(--font-ui);
  font-size: 1.4rem;
}

.answer-feedback {
  margin: 0;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 600;
  text-align: center;
}

.answer-feedback.correct {
  color: #167a39;
  background: rgb(22 122 57 / 0.1);
}

.answer-feedback.incorrect {
  color: #b42318;
  background: rgb(180 35 24 / 0.1);
}

.quiz-error {
  color: #b42318;
}

.quiz-submit {
  padding: 0.85rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  font: inherit;
  cursor: pointer;
}

.quiz-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
