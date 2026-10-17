<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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

const decks = ref<Deck[]>([])
const selectedDeckId = ref<string>()
const searchTerm = ref('')
const isLoading = ref(true)
const error = ref('')

const selectedDeck = computed(() =>
  decks.value.find((deck: Deck) => deck.id === selectedDeckId.value),
)

const filteredDecks = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()

  if (!query) return decks.value

  return decks.value.filter((deck: Deck) =>
    [deck.title, deck.category, deck.description].some((value) =>
      value.toLowerCase().includes(query),
    ),
  )
})

const loadDecks = async (): Promise<void> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}deck-manifest.json`)

    if (!response.ok) {
      throw new Error(`Failed to load decks: ${response.status}`)
    }

    const manifest: DeckManifest = await response.json()
    decks.value = manifest.decks
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unable to load decks'
  } finally {
    isLoading.value = false
  }
}

const startDeck = async (): Promise<void> => {
  if (!selectedDeck.value) return

  await router.push({
    name: 'quiz',
    params: {
      deckId: selectedDeck.value.id,
    },
  })
}

onMounted(loadDecks)
</script>

<template>
  <main>
    <section class="content-container decks">
      <h3><span>牌组</span>·Decks</h3>

      <p v-if="isLoading">Loading decks...</p>

      <p v-else-if="error" role="alert">{{ error }}</p>

      <div v-else class="deck-selection">
        <label for="deck-search">Choose a vocabulary deck</label>

        <ComboboxRoot v-model="selectedDeckId" :ignore-filter="true">
          <ComboboxAnchor class="deck-combobox">
            <ComboboxInput
              id="deck-search"
              v-model="searchTerm"
              class="deck-input"
              placeholder="Search vocabulary decks..."
              :display-value="(id) => decks.find((deck: Deck) => deck.id === id)?.title ?? ''"
            />

            <ComboboxTrigger class="deck-trigger" aria-label="Show vocabulary decks">
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
            <ComboboxContent position="popper" class="deck-dropdown" :side-offset="6">
              <ComboboxViewport class="deck-options">
                <ComboboxEmpty class="deck-empty"> No matching decks found. </ComboboxEmpty>

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

                  <span class="deck-option-count"> {{ deck.cards }} cards </span>
                </ComboboxItem>
              </ComboboxViewport>
            </ComboboxContent>
          </ComboboxPortal>
        </ComboboxRoot>

        <div v-if="selectedDeck" class="deck-details">
          <h4>{{ selectedDeck.title }}</h4>
          <p>{{ selectedDeck.description }}</p>
          <span>{{ selectedDeck.cards }} vocabulary cards</span>
        </div>

        <button class="start-button" type="button" :disabled="!selectedDeck" @click="startDeck">
          Start Studying
        </button>
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
  justify-content: space-between;
  align-items: center;
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

.deck-option[data-state='checked'] .deck-option-title {
  font-weight: 700;
}

.deck-option-count {
  flex-shrink: 0;
  font-size: 0.8rem;
  opacity: 0.65;
}

.deck-empty {
  padding: 1rem;
  text-align: center;
  opacity: 0.7;
}
</style>
