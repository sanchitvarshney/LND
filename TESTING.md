# Testing LearnGuard

## Automated integration suite (57 assertions)

Covers authentication, RBAC scoping, the unskippable video gate, the assessment
engine (all 4 question types + grading rules), certificates + public verification,
manager/admin reporting, admin authoring, audit logging, and assignments.

### Run it

1. Start the backend on a test port with a fresh database:

   ```bash
   cd server
   rm -f data.json            # fresh seed
   PORT=4090 npm run dev
   ```

2. In another terminal, run the suite:

   ```bash
   cd server
   BASE=http://localhost:4090 node test/integration.test.mjs
   ```

Expected output ends with: `RESULTS: 57 passed, 0 failed` → `ALL TESTS PASSED`.

## What was verified in development

| Area | Result |
|------|--------|
| Backend TypeScript typecheck | ✓ 0 errors |
| Frontend TypeScript typecheck | ✓ 0 errors |
| Frontend production build (Vite) | ✓ 1702 modules, built clean |
| API integration suite | ✓ 57/57 passed |

### Security edge cases explicitly tested
- Quiz blocked until all videos watched (403)
- Video completion DENIED at partial coverage (409)
- Skipping to the end without watching the middle still denied (409)
- Answer keys never sent to learners (but visible to admins)
- Multiple-select graded all-or-nothing
- Short-answer keyword match is case-insensitive + substring
- Max attempts enforced (4th attempt → 403)
- Learner blocked from manager/admin reports + audit log (403)
- Learner cannot create modules (403)
- Public certificate verification works without auth; bad hash → invalid
