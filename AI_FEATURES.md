# LearnGuard AI Features

Four production AI features, all grounded in data the platform already captures.
Powered by the Anthropic API — works with the zero-setup file store and Prisma alike.

## Enable

Add to `server/.env`:

```
AI_API_KEY="sk-ant-..."        # required
# AI_MODEL="claude-haiku-4-5-20251001"   # optional override
```

No key = everything degrades gracefully (AI UI simply doesn't render; `GET /api/v1/ai/status` returns `enabled:false`).

## Features

| Feature | Where | Who | Endpoint |
|---|---|---|---|
| **Learning Assistant** — floating "Ask AI" chat grounded in the current module (titles, videos, your watch progress). Refuses to leak assessment answers. | Module detail + video player | All users | `POST /ai/modules/:id/chat` |
| **AI question drafts** — drafts 5 mixed-type questions (MCQ, multi-select, true/false, short answer) from the module's content; admin clicks "Use" to load a draft into the form, reviews, then saves. | Admin → Add question modal | Admin | `POST /ai/assessments/:id/generate-questions` |
| **Personal review plan** — after a failed attempt, maps wrong answers to the exact videos to rewatch, with an encouraging tone. Never reveals answers. | Result page (failed state) | Learner | `POST /ai/attempts/:id/review-plan` |
| **Compliance digest** — one-click natural-language summary: who needs attention, what's due this week, recommended next action. | Admin Overview + Team Tracking | Manager / Admin | `GET /ai/digest` |

## Design notes

- All endpoints require auth; role checks mirror the rest of the API (generator = admin, digest = manager+).
- AI usage is audit-logged (`ai.generate_questions`, `ai.review_plan`).
- The assistant is instructed to never reveal assessment questions/answers and to redirect off-topic chats.
- Server calls Anthropic directly over fetch — no SDK dependency added.
