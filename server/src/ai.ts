/**
 * AI provider layer — Anthropic Messages API over plain fetch (no SDK dependency).
 *
 * Configure with:
 *   AI_API_KEY   = your Anthropic API key (required to enable AI features)
 *   AI_MODEL     = optional model override (default: claude-haiku-4-5-20251001)
 *
 * Every endpoint degrades gracefully when no key is configured: the client
 * shows a "not configured" hint instead of broken UI.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

export function aiEnabled(): boolean {
  return !!(process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY);
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function complete(opts: {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const key = process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('AI is not configured'), { status: 503 });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || DEFAULT_MODEL,
      max_tokens: opts.maxTokens ?? 700,
      temperature: opts.temperature ?? 0.4,
      system: opts.system,
      messages: opts.messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error('[ai] provider error', res.status, body.slice(0, 300));
    throw Object.assign(new Error('AI provider request failed'), { status: 502 });
  }
  const data: any = await res.json();
  return (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
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
