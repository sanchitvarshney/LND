/**
 * AI provider layer — FREE providers only, via the OpenAI-compatible
 * Chat Completions API. No SDK dependency (plain fetch). No paid services.
 *
 * Recommended free providers (pick ONE, set the env vars below):
 *   Groq   (default) — free key at https://console.groq.com  (fast, no card)
 *   Gemini           — free tier at https://aistudio.google.com (no card)
 *
 * Configure with env vars:
 *   AI_API_KEY    your FREE provider key. Leave empty and AI features just stay
 *                 hidden — the rest of the app works at zero cost.
 *   AI_BASE_URL   API base. Default: https://api.groq.com/openai/v1
 *   AI_MODEL      model id.  Default: llama-3.3-70b-versatile
 *
 * Every endpoint degrades gracefully when no key is configured.
 */

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1'; // Groq free tier
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

function apiKey(): string | undefined {
  return process.env.AI_API_KEY;
}

function baseUrl(): string {
  const b = (process.env.AI_BASE_URL || '').trim().replace(/\/+$/, '');
  return b || DEFAULT_BASE_URL;
}

function model(): string {
  return process.env.AI_MODEL || DEFAULT_MODEL;
}

export function aiEnabled(): boolean {
  return !!apiKey();
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function complete(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = apiKey();
  if (!key) throw Object.assign(new Error('AI is not configured'), { status: 503 });

  const res = await fetch(`${baseUrl()}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model(),
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.4,
      messages: [{ role: 'system', content: opts.system }, ...opts.messages],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[ai] provider error', res.status, body.slice(0, 300));
    throw Object.assign(new Error('AI provider request failed'), { status: 502 });
  }
  const data: any = await res.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

/** Ask for strict JSON and parse it (tolerates code fences). */
export async function completeJson<T>(opts: { system: string; user: string; maxTokens?: number }): Promise<T> {
  const text = await complete({
    system: opts.system + '\nRespond with ONLY valid JSON. No prose, no markdown fences.',
    messages: [{ role: 'user', content: opts.user }],
    maxTokens: opts.maxTokens ?? 1500,
    temperature: 0.5,
  });
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf(cleaned.startsWith('[') ? '[' : '{');
  return JSON.parse(cleaned.slice(start >= 0 ? start : 0)) as T;
}
