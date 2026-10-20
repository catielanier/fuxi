export interface Deck {
  id: string
  filename: string
  title: string
  category: string
  part: number
  cards: number
  description: string
  printable?: string
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
  audio?: string
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
  mode?: 'reading'
  deckId: string
  deckTitle: string
  startedAt: string
  completedAt: string
  totalCards: number
  results: QuizCardResult[]
}

export interface ProgressPoint {
  resultId: string
  startedAt: string
  completedAt: string
  score: number
  totalPoints: number
  percentage: number
}

export type QuizMode = 'reading' | 'listening'

export interface ListeningAnswer {
  hanzi: string
  english: string[]
}

export interface ListeningQuestion {
  id: string
  pinyin: string
  audio: string
  answers: ListeningAnswer[]
}

export interface ListeningCardResult {
  questionId: string
  audio: string
  submitted: string
  correct: boolean
  acceptedAnswers: ListeningAnswer[]
}

export interface ListeningQuizResult {
  mode: 'listening'
  deckId: string
  deckTitle: string
  startedAt: string
  completedAt: string
  totalQuestions: number
  results: ListeningCardResult[]
}

export type SavedQuizResult = QuizResult | ListeningQuizResult