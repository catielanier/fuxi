<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getDatabase, ref as dbRef, onValue } from 'firebase/database'
import firebase from '@/utils/firebase'
import { getVisibleDecks } from '@/utils/deckVisibility'
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
const searchTerm = ref('')
const isSearching = ref(false)
const isDropdownOpen = ref(false)
const isLoading = ref(true)
const error = ref('')

const shouldShowLGBT = ref(false)
const isAuthLoading = ref(true)

let unsubscribeAuth: (() => void) | null = null
let unsubscribeUser: (() => void) | null = null

const visibleDecks = computed(() =>
  getVisibleDecks(decks.value, shouldShowLGBT.value),
)

const selectedDeck = computed(() =>
  visibleDecks.value.find(
    (deck: Deck) => deck.id === selectedDeckId.value,
  ),
)

const filteredDecks = computed(() => {
  if (!isSearching.value) return visibleDecks.value

  const query = searchTerm.value.trim().toLowerCase()

  if (!query) return visibleDecks.value

  return visibleDecks.value.filter((deck: Deck) =>
    [deck.title, deck.category, deck.description].some(
      (value) => value.toLowerCase().includes(query),
    ),
  )
})

const printableUrl = computed(() => {
  if (!selectedDeck.value?.printable) return null

  const path = `../assets/printables/${selectedDeck.value.printable}`

  return printableFiles[path] ?? null
})

const handleDropdownOpen = (open: boolean): void => {
  isDropdownOpen.value = open

  if (open) {
    isSearching.value = false
  }
}

const handleSearchInput = (): void => {
  isSearching.value = true
}

watch(visibleDecks, () => {
  if (
    selectedDeckId.value &&
    !visibleDecks.value.some(
      (deck: Deck) => deck.id === selectedDeckId.value,
    )
  ) {
    selectedDeckId.value = undefined
    searchTerm.value = ''
    isSearching.value = false
  }
})

watch(selectedDeckId, () => {
  isSearching.value = false
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
        : 'Unable to load decks'
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

      const preferenceRef = dbRef(
        db,
        `users/${user.uid}/shouldShowLGBT`,
      )

      unsubscribeUser = onValue(
        preferenceRef,
        (snapshot) => {
          shouldShowLGBT.value = snapshot.val() === true
          isAuthLoading.value = false
        },
        (err) => {
          console.error(
            'Failed to load deck preferences:',
            err,
          )

          shouldShowLGBT.value = false
          isAuthLoading.value = false
        },
      )
    },
    (err) => {
      console.error('Authentication error:', err)

      unsubscribeUser?.()
      unsubscribeUser = null

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
      <h3><span>牌组</span>·Decks</h3>

      <p v-if="isLoading || isAuthLoading">
        Loading decks...
      </p>

      <p v-else-if="error" role="alert">
        {{ error }}
      </p>

      <div v-else class="deck-selection">
        <label for="deck-search">
          Choose a vocabulary deck
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
              id="deck-search"
              v-model="searchTerm"
              class="deck-input"
              placeholder="Search vocabulary decks..."
              :display-value="
                (id) =>
                  visibleDecks.find(
                    (deck: Deck) => deck.id === id,
                  )?.title ?? ''
              "
              @input="handleSearchInput"
            />

            <ComboboxTrigger
              class="deck-trigger"
              aria-label="Show vocabulary decks"
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
                  <span class="deck-option-title">
                    {{ deck.title }}
                  </span>

                  <span class="deck-option-count">
                    {{ deck.cards }} cards
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
            {{ selectedDeck.cards }} vocabulary cards
          </span>
        </div>

        <div class="deck-actions">
          <button
            class="start-button"
            type="button"
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
  font-family: var(--font-ui);
  font-size: 1.5rem;
  line-height: 1.2;
  color: var(--color-text);
  margin-top: 0;
}

h3 span {
  font-family: var(--font-brand);
  line-height: 1.2;
  color: var(--color-text);
}

.deck-selection {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 36rem;
}

.deck-selection > label {
  font-weight: 600;
}

.deck-combobox {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 3rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  transition: border-color 0.2s ease;
}

.deck-combobox:focus-within {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.deck-input {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
}

.deck-input::placeholder {
  opacity: 0.6;
}

.deck-trigger {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 3rem;
  align-self: stretch;
  border: 0;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
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

.deck-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
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
    flex-direction: