# Tabletop CTF

A tabletop incident-response exercise platform with CTF-style flag scoring.
Learners join an event by code, form teams, and work through staged injects
(scenario text + evidence + question). Correct flags unlock the next inject and
award points. A facilitator monitors live and broadcasts announcements. A
debrief summarizes performance.

## Stack
Next.js 14 (App Router), TypeScript strict, Tailwind + shadcn-style UI,
Supabase (Postgres, Auth, Realtime) via `@supabase/ssr`, Vitest, Vercel.

## Quick start
```
cp .env.example .env.local   # Supabase URL, anon key, service role key
npm install
npm run dev                  # http://localhost:3000
npm run lint
npm test
```
Apply the database with `npm run db:push` (Supabase CLI) or paste the SQL in
`supabase/migrations` and `supabase/seed.sql` into the Supabase SQL Editor.
See `docs/DEPLOY.md` for hosting and `docs/PROGRESS.md` for build status.

## Demo script (Midnight Ransomware)
1. Facilitator opens `/facilitator/<eventId>` and presses Start.
2. Two learners sign in with magic links, go to `/join`, enter `DEMO2026`, and create or join a team.
3. Teams work through four injects. Answers (for the facilitator only):
   - Patient Zero Email: `invoices@northw1nd-billing.com` (100 pts, hint -20)
   - First Foothold: `FIN-WS-042` (150 pts, hint -30)
   - First Move: `Isolate affected machines from the network` (100 pts)
   - What Did They Take: `customer_master_2026.xlsx` (200 pts, hint -40)
4. `/leaderboard/<eventId>` updates live as teams score.
5. Facilitator broadcasts an announcement; every team sees it immediately.
6. `/debrief/<eventId>` shows per-team scores, time per inject, hints, wrong attempts, and explanations.

## Security model
- Flag plaintext never leaves the seed. Only SHA-256 hashes of normalized flags are stored.
- Learners read injects through the `get_my_injects` RPC, which excludes `flag_hash` and `explanation` and returns the hint only after it was purchased.
- Flag checking is server-side in `/api/submit`: trim, lowercase, collapse whitespace, SHA-256, constant-time compare.
- Submissions are rate-limited to one per 3 seconds per team.
- RLS is enabled on every table. Facilitator routes verify the role server-side.
- The service role key is used only in server code.

## Roadmap (out of scope for the prototype)
Scenario builder, branching, AI hints, certificates, LTI 1.3, SAML/OIDC SSO,
LTI AGS grade passback, NRPS roster sync, xAPI/SCORM, payments. `org_id` is on
every tenant table, auth is isolated in `lib/auth.ts`, and all scoring flows
through `recordScoreEvent` in `lib/events.ts` to keep integration simple.
