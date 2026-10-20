import type {
  DeckManifest,
  ListeningQuestion,
  ListeningQuizResult,
  VocabularyCard,
  VocabularyDeck,
} from '@/data/types'
import { formatPinyin } from '@/utils/pinyin'

const audioFiles = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const getAudioUrl = (filename?: string | null): string | null => {
  if (!filename) return null

  const basename = filename.split('/').pop()

  if (!basename || !basename.toLowerCase().endsWith('.mp3')) {
    return null
  }

  return audioFiles[`../assets/audio/${basename}`] ?? null
}

export const normalizeHanzi = (value: string): string =>
  value.normalize('NFC').trim().replace(/\s+/g, '')

export const normalizeListeningPinyin = (value: string): string => {
  let normalized = value

  try {
    normalized = formatPinyin(value)
  } catch {
    normalized = value
  }

  return normalized
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, '')
}

export const shuffleListeningQuestions = (
  questions: ListeningQuestion[],
): ListeningQuestion[] => {
  const shuffled = [...questions]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!]
  }

  return shuffled
}

export const generateListeningQuestions = (
  cards: VocabularyCard[],
): ListeningQuestion[] => {
  const groups = new Map<string, VocabularyCard[]>()

  for (const card of cards) {
    const key = normalizeListeningPinyin(card.pinyin)

    if (!key) continue

    const group = groups.get(key) ?? []
    group.push(card)
    groups.set(key, group)
  }

  const questions: ListeningQuestion[] = []

  for (const [pinyin, group] of groups) {
    const playable = group.find(
      (card) => card.audio && getAudioUrl(card.audio),
    )

    if (!playable?.audio) continue

    const answers = new Map<
      string,
      ListeningQuestion['answers'][number]
    >()

    for (const card of group) {
      const key = normalizeHanzi(card.hanzi)

      if (!key) continue

      const existing = answers.get(key)

      if (existing) {
        existing.english = Array.from(
          new Set([
            ...existing.english,
            ...card.english_answers,
          ]),
        )
      } else {
        answers.set(key, {
          hanzi: card.hanzi,
          english: [...card.english_answers],
        })
      }
    }

    if (!answers.size) continue

    questions.push({
      id: pinyin,
      pinyin: playable.pinyin,
      audio: playable.audio,
      answers: Array.from(answers.values()),
    })
  }

  return questions
}

export const isCorrectListeningAnswer = (
  submitted: string,
  question: ListeningQuestion,
): boolean => {
  const answer = normalizeHanzi(submitted)

  if (!answer) return false

  return question.answers.some(
    (candidate) => normalizeHanzi(candidate.hanzi) === answer,
  )
}

export const calculateListeningScore = (
  result: ListeningQuizResult,
): number => {
  if (!result.totalQuestions) return 0

  const correct = result.results.filter(
    (answer) => answer.correct,
  ).length

  return (correct / result.totalQuestions) * 100
}

export const loadListeningManifest = async (
  signal?: AbortSignal,
): Promise<DeckManifest> => {
  const response = await fetch(
    `${import.meta.env.BASE_URL}deck-manifest.json`,
    { signal },
  )

  if (!response.ok) {
    throw new Error(
      `Unable to load deck manifest (${response.status}).`,
    )
  }

  return response.json() as Promise<DeckManifest>
}

export const loadListeningVocabulary = async (
  filename: string,
  signal?: AbortSignal,
): Promise<VocabularyDeck> => {
  const relativePath = filename.replace(/^\/+/, '')

  const path = relativePath.startsWith('decks/')
    ? relativePath
    : `decks/${relativePath}`

  const response = await fetch(
    `${import.meta.env.BASE_URL}${path}`,
    { signal },
  )

  if (!response.ok) {
    throw new Error(
      `Unable to load vocabulary file "${filename}" (${response.status}).`,
    )
  }

  return response.json() as Promise<VocabularyDeck>
}