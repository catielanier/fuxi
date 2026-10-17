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
