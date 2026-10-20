<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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

export interface DropdownOption {
  value: string
  label: string
  description?: string
  detail?: string
}

const props = withDefaults(
  defineProps<{
    options: DropdownOption[]
    label: string
    placeholder?: string
    emptyMessage?: string
    disabled?: boolean
  }>(),
  {
    placeholder: 'Search vocabulary decks...',
    emptyMessage: 'No matching decks found.',
    disabled: false,
  },
)

const selectedValue = defineModel<string | undefined>()

const searchTerm = ref('')
const isSearching = ref(false)
const isOpen = ref(false)

const inputId = `deck-dropdown-${Math.random().toString(36).slice(2)}`

const filteredOptions = computed(() => {
  if (!isSearching.value) return props.options

  const query = searchTerm.value.trim().toLowerCase()

  if (!query) return props.options

  return props.options.filter((option) =>
    [
      option.label,
      option.description ?? '',
      option.detail ?? '',
    ].some((value) => value.toLowerCase().includes(query)),
  )
})

const getDisplayValue = (value: unknown): string => {
  return (
    props.options.find(
      (option) => option.value === value,
    )?.label ?? ''
  )
}

const handleOpenChange = (open: boolean): void => {
  isOpen.value = open

  if (open) {
    isSearching.value = false
  }
}

const handleInput = (): void => {
  isSearching.value = true
}

watch(selectedValue, () => {
  isSearching.value = false
})

watch(
  () => props.options,
  (options) => {
    if (
      selectedValue.value &&
      !options.some(
        (option) => option.value === selectedValue.value,
      )
    ) {
      selectedValue.value = undefined
      searchTerm.value = ''
      isSearching.value = false
    }
  },
)
</script>

<template>
  <div class="dropdown-field">
    <label :for="inputId">
      {{ label }}
    </label>

    <ComboboxRoot
      v-model="selectedValue"
      :open="isOpen"
      :open-on-click="true"
      :ignore-filter="true"
      :disabled="disabled"
      @update:open="handleOpenChange"
    >
      <ComboboxAnchor class="dropdown-anchor">
        <ComboboxInput
          :id="inputId"
          v-model="searchTerm"
          class="dropdown-input"
          :placeholder="placeholder"
          :display-value="getDisplayValue"
          @input="handleInput"
        />

        <ComboboxTrigger
          class="dropdown-trigger"
          :aria-label="`Show ${label.toLowerCase()}`"
          @pointerdown="isSearching = false"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </ComboboxTrigger>
      </ComboboxAnchor>

      <ComboboxPortal>
        <ComboboxContent
          position="popper"
          class="shared-dropdown-content"
          :side-offset="6"
        >
          <ComboboxViewport class="shared-dropdown-viewport">
            <ComboboxEmpty class="shared-dropdown-empty">
              {{ emptyMessage }}
            </ComboboxEmpty>

            <ComboboxItem
              v-for="option in filteredOptions"
              :key="option.value"
              :value="option.value"
              :text-value="option.label"
              class="shared-dropdown-option"
            >
              <span class="option-label">
                {{ option.label }}
              </span>

              <span v-if="option.detail" class="option-detail">
                {{ option.detail }}
              </span>
            </ComboboxItem>
          </ComboboxViewport>
        </ComboboxContent>
      </ComboboxPortal>
    </ComboboxRoot>
  </div>
</template>

<style scoped>
.dropdown-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.dropdown-field > label {
  font-weight: 600;
}

.dropdown-anchor {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 3rem;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  transition: border-color 0.2s ease;
}

.dropdown-anchor:focus-within {
  outline: 2px solid var(--color-text);
  outline-offset: 2px;
}

.dropdown-input {
  flex: 1;
  min-width: 0;
  padding: 0.75rem 1rem;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--color-text);
  font: inherit;
}

.dropdown-input::placeholder {
  opacity: 0.6;
}

.dropdown-trigger {
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

.dropdown-trigger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-detail {
  flex-shrink: 0;
  font-size: 0.8rem;
  opacity: 0.65;
}
</style>

<style>
.shared-dropdown-content {
  z-index: 1000;
  width: var(--reka-combobox-trigger-width);
  max-height: min(
    22rem,
    var(--reka-combobox-content-available-height)
  );
  overflow: hidden;
  border: 1px solid var(--color-text);
  border-radius: 0.5rem;
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.12);
}

.shared-dropdown-viewport {
  max-height: inherit;
  overflow-y: auto;
  padding: 0.35rem;
}

.shared-dropdown-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border-radius: 0.35rem;
  cursor: pointer;
  outline: none;
}

.shared-dropdown-option[data-highlighted] {
  background: var(--color-text);
  color: var(--color-background);
}

.shared-dropdown-option[data-state='checked'] .option-label {
  font-weight: 700;
}

.shared-dropdown-empty {
  padding: 1rem;
  text-align: center;
  opacity: 0.7;
}
</style>