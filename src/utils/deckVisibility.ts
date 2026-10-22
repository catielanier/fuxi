import type { Deck } from '@/data/types'

const restrictedDeckIds = new Set([
  'lgbtq_I',
  'lgbtq_II',
  'lgbtq_III',
  'clothes_III',
  'sexual_vocabulary_I',
  'sexual_vocabulary_II',
  'sexual_vocabulary_III',
  'insults_I',
])

export const canAccessDeck = (deckId: string, shouldShowLGBT: boolean): boolean =>
  shouldShowLGBT || !restrictedDeckIds.has(deckId)

export const getVisibleDecks = (decks: Deck[], shouldShowLGBT: boolean): Deck[] =>
  decks
    .filter((deck) => canAccessDeck(deck.id, shouldShowLGBT))
    .sort((a, b) =>
      a.title.localeCompare(b.title, 'en', {
        numeric: true,
        sensitivity: 'base',
      }),
    )
