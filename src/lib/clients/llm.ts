import { Logger } from '../utils/logger'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmCompletionOptions {
  messages: ChatMessage[]
  models?: string[]
  providerOrder?: string[]
  providerIgnore?: string[]
  timeoutMs?: number
  responseFormat?: 'json_object' | 'text'
}

export interface LlmCompletionResult {
  content: string
  modelUsed?: string
  provider?: string
  elapsedMs: number
}

export class LlmService {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModels: string[]
  private readonly defaultOrder: string[]
  private readonly defaultIgnore: string[]

  constructor(opts?: {
    apiKey?: string
    baseUrl?: string
    defaultModels?: string[]
    defaultOrder?: string[]
    defaultIgnore?: string[]
  }) {
    this.apiKey =
      opts?.apiKey ||
      process.env.OPENROUTER_API_KEY ||
      ''
    this.baseUrl = opts?.baseUrl || 'https://openrouter.ai/api/v1'
    this.defaultModels = opts?.defaultModels || [
      'cohere/north-mini-code:free',
      'inclusionai/ling-3.0-flash-fin:free',
      'openrouter/free',
    ]
    this.defaultOrder = opts?.defaultOrder || ['Cohere', 'Novita', 'Liquid']
    this.defaultIgnore = opts?.defaultIgnore || ['Google', 'Nvidia', 'Z-AI']
  }

  /**
   * Complete a chat prompt with automatic prioritized fallback routing,
   * provider filtering, and strict timeout.
   */
  async chat(opts: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const start = Date.now()
    const timeoutMs = opts.timeoutMs ?? 8000
    const models = (opts.models || this.defaultModels).slice(0, 3)

    const payload: Record<string, unknown> = {
      models,
      provider: {
        order: opts.providerOrder || this.defaultOrder,
        ignore: opts.providerIgnore || this.defaultIgnore,
      },
      messages: opts.messages,
    }

    if (opts.responseFormat === 'json_object') {
      payload.response_format = { type: 'json_object' }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const elapsedMs = Date.now() - start

      if (!res.ok) {
        const errText = await res.text()
        Logger.warn({
          group: 'llm_service',
          topic: 'http_error',
          message: `LLM API returned HTTP ${res.status}: ${errText.slice(0, 150)}`,
        })
        throw new Error(`LLM API returned HTTP ${res.status}`)
      }

      const data = (await res.json()) as {
        model?: string
        provider?: string
        choices?: Array<{ message?: { content?: string } }>
      }

      const content = data.choices?.[0]?.message?.content || ''

      return {
        content,
        modelUsed: data.model,
        provider: data.provider,
        elapsedMs,
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Helper to request and safely parse JSON from the LLM.
   */
  async json<T extends object>(
    opts: LlmCompletionOptions,
    fallback: T,
  ): Promise<{ data: T; source: 'llm' | 'fallback'; elapsedMs: number }> {
    try {
      const result = await this.chat({ ...opts, responseFormat: 'json_object' })
      const parsed = this.cleanAndParseJson<T>(result.content)
      if (!parsed) {
        return { data: fallback, source: 'fallback', elapsedMs: result.elapsedMs }
      }
      return { data: parsed, source: 'llm', elapsedMs: result.elapsedMs }
    } catch {
      return { data: fallback, source: 'fallback', elapsedMs: 0 }
    }
  }

  /**
   * Sanitizes markdown fences, trailing commas, and preamble chatter from LLM JSON strings.
   */
  private cleanAndParseJson<T extends object>(raw: string): T | null {
    if (!raw || typeof raw !== 'string') return null

    let cleaned = raw
      .replace(/^```(?:json)?\s*/gim, '')
      .replace(/```\s*$/gm, '')
      .trim()

    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1)
    }

    cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

    try {
      return JSON.parse(cleaned) as T
    } catch {
      return null
    }
  }
}

// Singleton client instance
let llmClient: LlmService | null = null

export function getLlmClient(): LlmService {
  if (llmClient) return llmClient
  llmClient = new LlmService()
  return llmClient
}
