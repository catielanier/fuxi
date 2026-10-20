<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, get, ref as dbRef } from 'firebase/database'
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxEmpty,
  ComboboxItem,
} from 'reka-ui'
import firebase from '@/utils/firebase'
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
const searchTerm = ref('')
const isSearching = ref(false)
const isDropdownOpen = ref(false)

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

const selectedDeck = computed(() =>
  visibleDecks.value.find(
    (deck) => deck.id === selectedDeckId.value,
  ),
)

const filteredDecks = computed(() => {
  if (!isSearching.value) return visibleDecks.value

  const query = searchTerm.value.trim().toLowerCase()

  if (!query) return visibleDecks.value

  return visibleDecks.value.filter((deck) =>
    [deck.title, deck.category, deck.description].some(
      (value) => value.toLowerCase().includes(query),
    ),
  )
})

const handleDropdownOpen = (open: boolean): void => {
  isDropdownOpen.value = open

  if (open) {
    isSearching.value = false
  }
}

const loadDecks = async (
  uid: string | null,
): Promise<void> => {
  const version = ++requestVersion

  controller?.abort()
  controller = new AbortController()

  isLoading.value = true
  error.value = ''
  decks.value = []
  questionCounts.value = {}
  selectedDeckId.value = undefined
  shouldShowLGBT.value = false

  try {
    const [manifest, preference] = await Promise.all([
      loadListeningManifest(controller.signal),
      uid
        ? get(dbRef(db, `users/${uid}/shouldShowLGBT`))
        : Promise.resolve(null),
    ])

    if (version !== requestVersion) return

    shouldShowLGBT.value = preference?.val() === true

    const availableDecks = getVisibleDecks(
      manifest.decks,
      shouldShowLGBT.value,
    )

    const deckData = await Promise.allSettled(
      availableDecks.map(async (deck) => {
        const vocabulary = await loadListeningVocabulary(
          deck.filename,
          controller!.signal,
        )

        return {
          id: deck.id,
          count: generateListeningQuestions(
            vocabulary.cards,
          ).length,
        }
      }),
    )

    if (version !== requestVersion) return

    const counts: Record<string, number> = {}

    for (const item of deckData) {
      if (item.status === 'fulfilled') {
        counts[item.value.id] = item.value.count
      }
    }

    decks.value = availableDecks
    questionCounts.value = counts
  } catch (err) {
    if (version !== requestVersion) return

    error.value =
      err instanceof Error
        ? err.message
        : 'Unable to load listening decks.'
  } finally {
    if (version === requestVersion) {
      isLoading.value = false
    }
  }
}

const startListening = async (): Promise<void> => {
  if (!selectedDeck.value) return

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
        <label for="listening-deck-search">
          Choose a listening vocabulary deck
        </label>

        <ComboboxRoot
          v-model="selectedDeckId"
          :open="isDropdownOpen"
          :open-on-click="true"
          :ignore-filter="true"
          @update:open="handleDropdownOpen"
        >
          <ComboboxAnchor class="deck-combobox">
            <ComboboxInput
              id="listening-deck-search"
              v-model="searchTerm"
              class="deck-input"
              placeholder="Search listening decks..."
              :display-value="
                (id) =>
                  visibleDecks.find((deck) => deck.id === id)
                    ?.title ?? ''
              "
              @input="isSearching = true"
            />

            <ComboboxTrigger
              class="deck-trigger"
              aria-label="Show listening decks"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </ComboboxTrigger>
          </ComboboxAnchor>

          <ComboboxPortal>
            <ComboboxContent
              position="popper"
              class="deck-dropdown"
              :side-offset="6"
            >
              <ComboboxViewport class="deck-options">
                <ComboboxEmpty class="deck-empty">
                  No matching decks found.
                </ComboboxEmpty>

                <ComboboxItem
                  v-for="deck in filteredDecks"
                  :key="deck.id"
                  :value="deck.id"
                  :text-value="deck.title"
                  class="deck-option"
                >
                  <span>{{ deck.title }}</span>

                  <span class="deck-count">
                    {{ questionCounts[deck.id] }} questions
                  </span>
                </ComboboxItem>
              </ComboboxViewport>
            </ComboboxContent>
          </ComboboxPortal>
        </ComboboxRoot>

        <div v-if="selectedDeck" class="deck-details">
          <h4>{{ selectedDeck.title }}</h4>

          <p>{{ selectedDeck.description }}</p>

          <span>
            {{ questionCounts[selectedDeck.id] }}
            listening questions
          </span>
        </div>

        <p v-else-if="!visibleDecks.length" role="status">
          No listening decks have playable audio yet.
        </p>

        <button
          type="button"
          class="start-button"
          :disabled="!selectedDeck"
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
  font-size: 1.5rem;
  font-family: var(--font-ui);
}

h3 span {
  font-family: var(--font-brand);
}

.deck-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 36rem;
}

.deck-selection > label {
  font-weight: 600;
}

.deck-combobox {
  display: flex;
  align-items: center;
  min-height: 3rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
}

.deck-input {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font: inherit;
}

.deck-combobox:focus-within {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.deck-trigger {
  display: grid;
  place-items: center;
  width: 3rem;
  align-self: stretch;
  border: 0;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
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

.deck-details span {
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

<style>
.deck-dropdown {
  z-index: 1000;
  width: var(--reka-combobox-trigger-width);
  max-height: min(22rem, var(--reka-combobox-content-available-height));
  overflow: hidden;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.12);
}

.deck-options {
  max-height: inherit;
  overflow-y: auto;
  padding: 0.35rem;
}

.deck-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
  outline: none;
}

.deck-option[data-highlighted] {
  background: var(--color-text);
  color: var(--color-background);
}

.deck-count {
  flex-shrink: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.deck-option[data-highlighted] .deck-count {
  color: inherit;
}

.deck-empty {
  padding: 1rem;
  color: var(--color-text-muted);
}
</style>