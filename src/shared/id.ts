import { customAlphabet } from 'nanoid'

/**
 * 8-character nanoid using lowercase alphanumeric characters.
 * Matches the character length of "agent-cache".
 */
const generateNano = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8)

export function generateJobId(): string {
  return `ac-${generateNano()}`
}

export function isValidJobId(id: string): boolean {
  return /^ac-[a-z0-9]{8}$/.test(id)
}
