const toneMarks: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

const initials = [
  '',
  'b',
  'p',
  'm',
  'f',
  'd',
  't',
  'n',
  'l',
  'g',
  'k',
  'h',
  'j',
  'q',
  'x',
  'zh',
  'ch',
  'sh',
  'r',
  'z',
  'c',
  's',
  'y',
  'w',
]

const finals = [
  'a',
  'o',
  'e',
  'ai',
  'ei',
  'ao',
  'ou',
  'an',
  'en',
  'ang',
  'eng',
  'ong',
  'er',
  'i',
  'ia',
  'ie',
  'iao',
  'iu',
  'ian',
  'in',
  'iang',
  'ing',
  'iong',
  'u',
  'ua',
  'uo',
  'uai',
  'ui',
  'uan',
  'un',
  'uang',
  'ueng',
  'ü',
  'üe',
  'üan',
  'ün',
  'ue',
]

const syllables = new Set(initials.flatMap((initial) => finals.map((final) => initial + final)))

const getLastSyllable = (input: string): string | null => {
  for (let start = 0; start < input.length; start++) {
    const candidate = input.slice(start)

    if (syllables.has(candidate)) {
      return candidate
    }
  }

  return null
}

const applyTone = (syllable: string, tone: number): string => {
  if (tone === 5 || tone === 0) return syllable

  const vowels = [...syllable]

  let index = vowels.indexOf('a')

  if (index === -1) {
    index = vowels.indexOf('e')
  }

  if (index === -1 && syllable.includes('ou')) {
    index = vowels.indexOf('o')
  }

  if (index === -1) {
    for (let i = vowels.length - 1; i >= 0; i--) {
      if (toneMarks[vowels[i]!]) {
        index = i
        break
      }
    }
  }

  if (index === -1) return syllable

  const vowel = vowels[index]!
  const replacement = toneMarks[vowel]?.[tone - 1]

  if (!replacement) return syllable

  vowels[index] = replacement

  return vowels.join('')
}

export const formatPinyin = (input: string): string => {
  const normalized = input.toLowerCase().replace(/\s+/g, '').replace(/v/g, 'ü')

  let result = ''

  for (const char of normalized) {
    if (!/^[1-5]$/.test(char)) {
      result += char
      continue
    }

    const syllable = getLastSyllable(result)

    if (!syllable) {
      throw new Error(`No valid syllable before tone ${char}`)
    }

    const start = result.length - syllable.length

    result = result.slice(0, start) + applyTone(syllable, Number(char))
  }

  return result
}
