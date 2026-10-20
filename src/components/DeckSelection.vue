<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, ref as dbRef, onValue } from 'firebase/database'
import firebase from '@/utils/firebase'
import DeckDropdown from '@/components/SubComponents/DeckDropdown.vue'
import { getVisibleDecks } from '@/utils/deckVisibility'
import type { Deck, DeckManifest } from '@/data/types'

const router = useRouter()
const auth = getAuth(firebase)
const db = getDatabase(firebase)

const printableFiles = import.meta.glob('../assets/printables/*.pdf', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const decks = ref<Deck[]>([])
const selectedDeckId = ref<string>()

const isLoading = ref(true)
const isAuthLoading = ref(true)
const error = ref('')
const shouldShowLGBT = ref(false)

let unsubscribeAuth: (() => void) | null = null
let unsubscribeUser: (() => void) | null = null

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

const printableUrl = computed(() => {
  if (!selectedDeck.value?.printable) return null

  const path = `../assets/printables/${selectedDeck.value.printable}`

  return printableFiles[path] ?? null
})

const loadDecks = async (): Promise<void> => {
  isLoading.value = true
  error.value = ''

  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}deck-manifest.json`,
    )

    if (!response.ok) {
      throw new Error(`Failed to load decks: ${response.status}`)
    }

    const manifest: DeckManifest = await response.json()

    decks.value = manifest.decks
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to load decks.'
  } finally {
    isLoading.value = false
  }
}

const initializeUserPreferences = (): void => {
  unsubscribeAuth = onAuthStateChanged(
    auth,
    (user) => {
      unsubscribeUser?.()
      unsubscribeUser = null

      shouldShowLGBT.value = false

      if (!user) {
        isAuthLoading.value = false
        return
      }

      isAuthLoading.value = true

      unsubscribeUser = onValue(
        dbRef(db, `users/${user.uid}/shouldShowLGBT`),
        (snapshot) => {
          shouldShowLGBT.value = snapshot.val() === true
          isAuthLoading.value = false
        },
        (err) => {
          console.error('Failed to load deck preferences:', err)
          shouldShowLGBT.value = false
          isAuthLoading.value = false
        },
      )
    },
    (err) => {
      console.error('Authentication error:', err)
      shouldShowLGBT.value = false
      isAuthLoading.value = false
    },
  )
}

const startDeck = async (): Promise<void> => {
  if (!selectedDeck.value || isAuthLoading.value) return

  await router.push({
    name: 'quiz',
    params: {
      deckId: selectedDeck.value.id,
    },
  })
}

onMounted(() => {
  void loadDecks()
  initializeUserPreferences()
})

onUnmounted(() => {
  unsubscribeAuth?.()
  unsubscribeUser?.()
})
</script>

<template>
  <main>
    <section class="content-container decks">
      <h3><span>牌组</span> · Decks</h3>

      <p v-if="isLoading || isAuthLoading" role="status">
        Loading decks...
      </p>

      <p v-else-if="error" role="alert">
        {{ error }}
      </p>

      <div v-else class="deck-selection">
        <DeckDropdown
          v-model="selectedDeckId"
          :options="dropdownOptions"
          label="Choose a vocabulary deck"
          placeholder="Search vocabulary decks..."
        />

        <div v-if="selectedDeck" class="deck-details">
          <h4>{{ selectedDeck.title }}</h4>

          <p>{{ selectedDeck.description }}</p>

          <span>
            {{ selectedDeck.cards }} vocabulary cards
          </span>
        </div>

        <div class="deck-actions">
          <button
            type="button"
            class="start-button"
            :disabled="!selectedDeck || isAuthLoading"
            @click="startDeck"
          >
            Start Studying
          </button>

          <a
            v-if="selectedDeck && printableUrl"
            :href="printableUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="print-button"
          >
            Print Physical Deck
          </a>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
h3 {
  margin-top: 0;
  font-family: var(--font-ui);
  font-size: 1.5rem;
  line-height: 1.2;
  color: var(--color-text);
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
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
}

.deck-details h4 {
  margin: 0 0 0.5rem;
}

.deck-details p {
  margin: 0 0 0.75rem;
}

.deck-details span {
  font-size: 0.85rem;
  opacity: 0.7;
}

.deck-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.start-button {
  align-self: flex-start;
  padding: 0.75rem 1.5rem;
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

.print-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.print-button:hover {
  background: var(--color-text);
  color: var(--color-background);
}

.print-button:focus-visible {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

@media (max-width: 640px) {
  .deck-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .deck-actions > * {
    width: 100%;
    text-align: center;
  }
}
</style>