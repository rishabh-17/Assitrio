/**
 * Azure AI Foundry — primary model for MOM extraction and AI answers (via /api/azure-openai dev proxy).
 * Keys stay in env or src/services/azureAI.js; do not commit secrets here.
 */
export const AZURE_FOUNDRY_HOST = 'https://triotechcode.services.ai.azure.com'
export const AZURE_FOUNDRY_RESPONSES_PATH =
  '/api/projects/triotechcode/openai/v1/responses'
export const AZURE_FOUNDRY_RESPONSES_URL = `${AZURE_FOUNDRY_HOST}${AZURE_FOUNDRY_RESPONSES_PATH}`
export const AZURE_PRIMARY_MODEL = 'gpt-5.4-pro'

/** First non-empty trimmed string (env placeholders / spaces must not block a valid key from the client). */
export function firstNonEmptyKey(...candidates) {
  for (const v of candidates) {
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

/** Map chat-style messages to Azure AI Foundry Responses `input` items. */
export function openAiMessagesToFoundryInput(messages) {
  return messages.map((m) => {
    const raw = m.content
    let text
    if (typeof raw === 'string') text = raw
    else if (Array.isArray(raw)) {
      text = raw
        .map((part) => {
          if (typeof part === 'string') return part
          if (part?.type === 'text' && part.text) return part.text
          return ''
        })
        .filter(Boolean)
        .join('\n')
    } else {
      text = String(raw ?? '')
    }
    const role =
      m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user'
    const partType = role === 'assistant' ? 'output_text' : 'input_text'
    return {
      type: 'message',
      role,
      content: [{ type: partType, text }],
    }
  })
}
