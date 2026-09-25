const ADJECTIVES = [
  'Neon',
  'Cyber',
  'Solar',
  'Velvet',
  'Shadow',
  'Electric',
  'Lunar',
  'Cosmic',
  'Turbo',
  'Brave',
  'Frost',
  'Iron',
  'Magic',
  'Pixel',
  'Nova',
  'Astral',
  'Quantum',
  'Swift',
  'Hyper',
  'Golden',
  'Silent',
  'Alpha',
  'Blaze',
  'Storm',
  'Vivid',
  'Echo',
  'Prism',
  'Rogue',
  'Apex',
  'Zenith',
  'Phantom',
  'Matrix',
]

interface AnimalDef {
  name: string
  emoji: string
}

const ANIMALS: AnimalDef[] = [
  { name: 'Fox', emoji: '🦊' },
  { name: 'Tiger', emoji: '🐯' },
  { name: 'Falcon', emoji: '🦅' },
  { name: 'Otter', emoji: '🦫' },
  { name: 'Bison', emoji: '🦬' },
  { name: 'Wolf', emoji: '🐺' },
  { name: 'Panther', emoji: '🐆' },
  { name: 'Lion', emoji: '🦁' },
  { name: 'Dolphin', emoji: '🐬' },
  { name: 'Owl', emoji: '🦉' },
  { name: 'Panda', emoji: '🐼' },
  { name: 'Koala', emoji: '🐨' },
  { name: 'Unicorn', emoji: '🦄' },
  { name: 'Dragon', emoji: '🐲' },
  { name: 'Octopus', emoji: '🐙' },
  { name: 'Turtle', emoji: '🐢' },
  { name: 'Badger', emoji: '🦡' },
  { name: 'Eagle', emoji: '🦅' },
  { name: 'Lynx', emoji: '🐱' },
  { name: 'Cheetah', emoji: '🐆' },
  { name: 'Bear', emoji: '🐻' },
  { name: 'Penguin', emoji: '🐧' },
  { name: 'Hedgehog', emoji: '🦔' },
  { name: 'Chameleon', emoji: '🦎' },
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

export function generateCodename(userId: string): { codename: string; emoji: string } {
  if (!userId) {
    return { codename: 'Guest-000', emoji: '👤' }
  }

  const h = hashString(userId)
  const adj = ADJECTIVES[h % ADJECTIVES.length]
  const animal = ANIMALS[(h >> 3) % ANIMALS.length]
  const num = (h % 900) + 100 // 3-digit number 100-999

  return {
    codename: `${adj}${animal.name}-${num}`,
    emoji: animal.emoji,
  }
}

export function getEmojiForCodename(codename: string): string {
  if (!codename) return '👤'
  for (const animal of ANIMALS) {
    if (codename.includes(animal.name)) {
      return animal.emoji
    }
  }
  return '🐾'
}
