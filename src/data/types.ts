export interface Deck {
  id: string
  filename: string
  title: string
  category: string
  part: number
  cards: number
  description: string
}

export interface DeckManifest {
  schema_version: number
  content_version: string
  total_cards: number
  decks: Deck[]
}

export interface VocabularyCard {
  hanzi: string
  pinyin: string
  english_answers: string[]
  english_gloss: string
}

export interface VocabularyDeck {
  id: string
  title: string
  language: string
  source: string
  card_count: number
  cards: VocabularyCard[]
}

export interface QuizAnswer {
  submitted: string
  expected: string[]
  correct: boolean
}

export interface QuizCardResult {
  cardIndex: number
  hanzi: string
  pinyin: QuizAnswer
  english: QuizAnswer
}

export interface QuizResult {
  deckId: string
  deckTitle: string
  startedAt: string
  completedAt: string
  totalCards: number
  results: QuizCardResult[]
}
