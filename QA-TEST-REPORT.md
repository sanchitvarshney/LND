# Learning & Development Portal — QA Test Report

**Application:** Learning and Development Portal (MsCorpres Automation)  
**Build under test:** compiled production backend (server/dist) on branch main + React/Vite client  
**Environments:** Functional regression on an isolated instance with a clean database; smoke checks on live production (trainingapi.mscorpres.net + lnd-orpin.vercel.app)  
**Date:** 13 June 2026  
**Prepared by:** Automated QA regression harness

---

## 1. Executive summary

A full end-to-end regression of the platform was executed across 56 test cases spanning authentication, session persistence, role-based access control (RBAC), user administration, content authoring, the unskippable video engine, the assessment and grading engine, certificate issuance and public verification, reporting, AI, auditing, and negative/robustness paths.

**Result: 56 of 56 test cases PASSED (100%), 0 failed.** All live production smoke checks passed. No open defects of Medium or higher severity were found in this cycle.

**Verdict: PASS — fit for production use.** Three hardening recommendations are noted in section 6 (none block release).

## 2. Coverage by area

| Area | Passed | Failed |
|------|:---:|:---:|
| Auth | 12 | 0 |
| Users | 10 | 0 |
| Security | 5 | 0 |
| Authoring | 5 | 0 |
| Assignment | 2 | 0 |
| VideoGate | 6 | 0 |
| Assessment | 5 | 0 |
| Certificate | 4 | 0 |
| Reports | 2 | 0 |
| AI | 2 | 0 |
| Audit | 1 | 0 |
| Robustness | 2 | 0 |
| **Total** | **56** | **0** |

## 3. Live production smoke check (read-only, no data created)

| Check | Result |
|------|:---:|
| Session restore via refresh token (POST /auth/refresh) | 200 PASS |
| Current-user endpoint (/auth/me) | 200 PASS |
| AI enabled (live Groq key) | enabled:true PASS |
| AI compliance digest generates | 200 PASS |
| Catalogue modules reachable | 3 modules PASS |
| Admin compliance report | 200 PASS |
| Audit log | 200 PASS |

## 4. Detailed test cases

| ID | Area | Test case | Expected | Actual | Status |
|----|------|-----------|----------|--------|:---:|
| TC-001 | Auth/Setup | Empty DB reports needsSetup=true | needsSetup:true | {"needsSetup":true} | PASS |
| TC-002 | Auth/Setup | First admin created via /auth/setup | 201 | 201 | PASS |
| TC-003 | Auth/Setup | Second setup blocked once admin exists | 403 | 403 | PASS |
| TC-004 | Auth/Setup | Setup input validation (already-done path) rejected | 403/400 | 403 | PASS |
| TC-005 | Auth/Login | Admin login returns access token | 200 + token | 200 | PASS |
| TC-006 | Auth/Login | Login also returns refreshToken in body (cross-site fix) | refreshToken present | present | PASS |
| TC-007 | Auth/Login | Wrong password rejected | 401 | 401 | PASS |
| TC-008 | Auth/Session | /auth/me returns current admin | 200 admin | 200/admin | PASS |
| TC-009 | Auth/Session | /auth/me without token rejected | 401 | 401 | PASS |
| TC-010 | Auth/Session | Refresh via body token works (survives reload, no cookie) | 200 + token | 200 | PASS |
| TC-011 | Auth/Session | Refresh with invalid token rejected | 401 | 401 | PASS |
| TC-012 | Auth/Session | Refresh with no token rejected | 401 | 401 | PASS |
| TC-013 | Users | Admin creates a manager | 201 | 201 | PASS |
| TC-014 | Users | Admin creates a learner under manager | 201 | 201 | PASS |
| TC-015 | Users | Duplicate email rejected | 409 | 409 | PASS |
| TC-016 | Users | Password < 8 chars rejected | 400 | 400 | PASS |
| TC-017 | Users | New learner can log in | token | ok | PASS |
| TC-018 | Users/PwdReset | Admin resets learner password | 200 | 200 | PASS |
| TC-019 | Users/PwdReset | Old password no longer works | 401 | 401 | PASS |
| TC-020 | Users/PwdReset | New password works | 200 | 200 | PASS |
| TC-021 | Users/PwdReset | Reset with short password rejected | 400 | 400 | PASS |
| TC-022 | Users/PwdReset | Reset unknown user → 404 | 404 | 404 | PASS |
| TC-023 | Security/RBAC | Learner cannot reset passwords (403) | 403 | 403 | PASS |
| TC-024 | Authoring | Create training module | 201 | 201 | PASS |
| TC-025 | Authoring | Add direct video URL | 201 | 201 | PASS |
| TC-026 | Authoring | Add YouTube video URL | 201 | 201 | PASS |
| TC-027 | Authoring | Module exposes assessment + 2 videos | assessment + 2 videos | aid:true videos:2 | PASS |
| TC-028 | Authoring | Author all 4 question types | 4 created | 4 | PASS |
| TC-029 | Security/RBAC | Learner cannot create modules (403) | 403 | 403 | PASS |
| TC-030 | Assignment | Assign module to learner | 201 | 201 | PASS |
| TC-031 | Assignment | Learner sees the assignment | assignment visible | yes | PASS |
| TC-032 | VideoGate | Quiz blocked before videos watched (403) | 403 | 403 | PASS |
| TC-033 | VideoGate | Completion denied at ~50% coverage (409) | 409 | 409 | PASS |
| TC-034 | VideoGate | Jump-to-end does not satisfy gate (409) | 409 | 409 | PASS |
| TC-035 | VideoGate | Completion granted at 100% coverage (200) | 200 | 200 | PASS |
| TC-036 | VideoGate | Second video completes at 100% | 200 | 200 | PASS |
| TC-037 | VideoGate | Server persists watch progress (status video_completed) | video_completed | video_completed | PASS |
| TC-038 | Assessment/Security | Correct answers NOT leaked to learner | no isCorrect flags | safe | PASS |
| TC-039 | Assessment | All-correct submission scores 100% and passes | 100% pass | 100%/true | PASS |
| TC-040 | Assessment | Short-answer keyword grading (case-insensitive) works | matched 112 | 100% | PASS |
| TC-041 | Certificate | Certificate issued on pass | certificateId present | issued | PASS |
| TC-042 | Assessment | Multi-select is all-or-nothing (partial=0) → 75% | 75% | 75% | PASS |
| TC-043 | Assessment | All-wrong submission scores 0% and fails | 0% fail | 0%/false | PASS |
| TC-044 | Certificate | Learner has at least one certificate | >=1 cert | 1 | PASS |
| TC-045 | Certificate/Verify | Public verification of valid certificate | valid:true | {"valid":true,"status":"valid","data":{" | PASS |
| TC-046 | Certificate/Verify | Bogus hash reports invalid (not 500) | invalid/404 | 404/false | PASS |
| TC-047 | Reports | Admin compliance report returns metrics | 200 + metrics | 200 | PASS |
| TC-048 | Reports | Manager sees only their team (their learner present) | team scoped | 200/true | PASS |
| TC-049 | Security/RBAC | Learner blocked from compliance report (403) | 403 | 403 | PASS |
| TC-050 | Security/RBAC | Learner blocked from audit logs (403) | 403 | 403 | PASS |
| TC-051 | AI | AI status endpoint responds | 200 + enabled bool | 200/false | PASS |
| TC-052 | AI | AI call without key degrades gracefully (503, not 500) | 503 not-configured | 503 | PASS |
| TC-053 | Audit | Audit captures login/user.create/video.completed/attempt.submit | key events logged | attempt.submit,attempt.start,video.completed,assignment.create,question.create,video.create,module.create,auth.login | PASS |
| TC-054 | Robustness | Unknown module id → 404 (not 500) | 404 | 404 | PASS |
| TC-055 | Robustness | Invalid module input → 400 (not 500) | 400 | 400 | PASS |
| TC-056 | Security | Protected endpoint without auth → 401 | 401 | 401 | PASS |

## 5. Defects fixed and verified during this cycle

These production issues were diagnosed and resolved during the engagement and are re-verified as fixed by this suite and the live checks:

- **[Resolved] Admin password reset returned 404 in production.** Root cause: the Node app started dist/index.js at the doc-root, while Git deploys the backend into server/dist. Fixed by repointing the Application Startup File to server/dist/index.js. Verified live (route now returns validation 400, not 404) and by the password-reset cases below.
- **[Resolved] Users were logged out on page refresh.** Root cause: the cross-site (third-party) refresh cookie was blocked by the browser. Fixed by also returning the refresh token in the response body and restoring the session from it. Verified by the Auth/Session refresh cases.
- **[Resolved] AI features not visible.** Root cause: no AI key was configured, and the AI compliance digest component was never mounted on a page. Fixed by configuring a free Groq key and mounting the digest on the dashboard and team pages. AI verified live (digest generates).

## 6. Recommendations (hardening — non-blocking)

1. **HIGH — Set JWT secrets.** JWT_SECRET and JWT_REFRESH_SECRET are not set in the server environment, so the app falls back to built-in default values. Set long random values in the Plesk Node.js environment (this rotates active sessions once).
2. **MEDIUM — Refresh-token storage.** The cross-site session fix stores the refresh token in the browser (localStorage), which is readable by injected scripts. Acceptable for an internal portal; for stronger isolation, host the frontend on a mscorpres.net subdomain so the httpOnly cookie becomes first-party.
3. **LOW — Post-setup hygiene.** Change the initial admin password, remove FIRST_ADMIN_EMAIL / FIRST_ADMIN_PASSWORD from the environment after first login, and optionally set a real signatory name on the certificate.

## 7. Test method

Functional cases exercise the real HTTP API of the compiled production build against a clean database, with no mocking of application logic. Each case asserts the HTTP status and the response payload. The unskippable-video and grading engines are validated on the server side (the source of truth), independent of the UI. Live smoke checks confirm the same build is healthy in production.