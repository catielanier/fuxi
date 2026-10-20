<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import firebase from '@/utils/firebase'
import DeckDropdown from '@/components/SubComponents/DeckDropdown.vue'
import {
  generateListeningQuestions,
  loadListeningManifest,
  loadListeningVocabulary,
} from '@/utils/listening'
import { getVisibleDecks } from '@/utils/deckVisibility'
import type { Deck } from '@/data/types'

const router = useRouter()
const auth = getAuth(firebase)
const db = getDatabase(firebase)

const decks = ref<Deck[]>([])
const questionCounts = ref<Record<string, number>>({})
const selectedDeckId = ref<string>()

const shouldShowLGBT = ref(false)
const isLoading = ref(true)
const error = ref('')

let unsubscribeAuth: (() => void) | null = null
let controller: AbortController | null = null
let requestVersion = 0

const visibleDecks = computed(() =>
  getVisibleDecks(decks.value, shouldShowLGBT.value).filter(
    (deck) => (questionCounts.value[deck.id] ?? 0) > 0,
  ),
)

const dropdownOptions = computed(() =>
  visibleDecks.value.map((deck) => ({
    value: deck.id,
    label: deck.title,
    description: deck.description,
    detail: `${questionCounts.value[deck.id]} questions`,
  })),
)

const selectedDeck = computed(() =>
  visibleDecks.value.find(
    (deck) => deck.id === selectedDeckId.value,
  ),
)

const loadDecks = async (uid: string | null): Promise<void> => {
  const version = ++requestVersion

  controller?.abort()

  const activeController = new AbortController()
  controller = activeController

  isLoading.value = true
  error.value = ''
  decks.value = []
  questionCounts.value = {}
  selectedDeckId.value = undefined
  shouldShowLGBT.value = false

  try {
    const [manifest, preference] = await Promise.all([
      loadListeningManifest(activeController.signal),
      uid
        ? get(dbRef(db, `users/${uid}/shouldShowLGBT`))
        : Promise.resolve(null),
    ])

    if (activeController.signal.aborted || version !== requestVersion) {
      return
    }

    shouldShowLGBT.value = preference?.val() === true

    const availableDecks = getVisibleDecks(
      manifest.decks,
      shouldShowLGBT.value,
    )

    const deckData = await Promise.allSettled(
      availableDecks.map(async (deck) => {
        const vocabulary = await loadListeningVocabulary(
          deck.filename,
          activeController.signal,
        )

        return {
          id: deck.id,
          count: generateListeningQuestions(vocabulary.cards).length,
        }
      }),
    )

    if (activeController.signal.aborted || version !== requestVersion) {
      return
    }

    const counts: Record<string, number> = {}

    for (const item of deckData) {
      if (item.status === 'fulfilled') {
        counts[item.value.id] = item.value.count
      }
    }

    decks.value = availableDecks
    questionCounts.value = counts
  } catch (err) {
    if (activeController.signal.aborted || version !== requestVersion) {
      return
    }

    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to load listening decks.'
  } finally {
    if (!activeController.signal.aborted && version === requestVersion) {
      isLoading.value = false
    }
  }
}

const startListening = async (): Promise<void> => {
  if (!selectedDeck.value || isLoading.value) return

  await router.push({
    name: 'listening-quiz',
    params: { deckId: selectedDeck.value.id },
  })
}

onMounted(() => {
  unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      void loadDecks(user?.uid ?? null)
    },
    (err) => {
      error.value = err.message
      isLoading.value = false
    },
  )
})

onUnmounted(() => {
  ++requestVersion
  controller?.abort()
  unsubscribeAuth?.()
})
</script>

<template>
  <main>
    <section class="content-container listening-decks">
      <h3><span>听力练习</span> · Listening</h3>

      <p v-if="isLoading" role="status">
        Loading listening decks...
      </p>

      <p v-else-if="error" role="alert">
        {{ error }}
      </p>

      <div v-else class="deck-selection">
        <DeckDropdown
          v-model="selectedDeckId"
          :options="dropdownOptions"
          label="Choose a listening vocabulary deck"
          placeholder="Search listening decks..."
          empty-message="No matching listening decks found."
        />

        <div v-if="selectedDeck" class="deck-details">
          <h4>{{ selectedDeck.title }}</h4>

          <p>{{ selectedDeck.description }}</p>

          <span>
            {{ questionCounts[selectedDeck.id] }} listening questions
          </span>
        </div>

        <p
          v-else-if="!visibleDecks.length"
          class="empty-message"
          role="status"
        >
          No listening decks have playable audio yet.
        </p>

        <button
          type="button"
          class="start-button"
          :disabled="!selectedDeck || isLoading"
          @click="startListening"
        >
          Start Listening
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
h3 {
  margin: 0 0 1.5rem;
  font-family: var(--font-ui);
  font-size: 1.5rem;
}

h3 span {
  font-family: var(--font-brand);
}

.deck-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 36rem;
}

.deck-details {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.deck-details h4 {
  margin: 0 0 0.5rem;
}

.deck-details p {
  margin: 0 0 0.75rem;
}

.deck-details span,
.empty-message {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.start-button {
  align-self: flex-start;
  padding: 0.85rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-text);
  color: var(--color-background);
  font: inherit;
  cursor: pointer;
}

.start-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>