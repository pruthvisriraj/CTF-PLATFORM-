# PROGRESS

Autonomous build log. Resume from the first unchecked item.

## Stages
- [x] Stage 1 - Setup (Next.js 14, TS strict, Tailwind, shadcn-style UI, Supabase clients, Vitest, docs)
- [x] Stage 2 - Database + seed written (migration, RLS, learner-safe RPC, seed.sql, evidence files)
- [ ] Stage 2b - Migration + seed applied to hosted Supabase (needs project credentials)
- [x] Stage 3 - Auth + Join (code complete, pending end-to-end test against hosted Supabase)
- [x] Stage 4 - Gameplay (code complete, pending end-to-end test against hosted Supabase)
- [x] Stage 5 - Live leaderboard (code complete, pending end-to-end test against hosted Supabase)
- [x] Stage 6 - Facilitator dashboard (code complete, pending end-to-end test against hosted Supabase)
- [x] Stage 7 - Debrief (code complete, pending end-to-end test against hosted Supabase)
- [~] Stage 8 - Polish + security review (code review and local RLS test done; browser check on a preview URL still pending)
- [~] Stage 9 - Deploy + domain (DEPLOY.md written; Vercel link, env vars and DNS need the user's accounts)

## Preview URLs
- (none yet - Vercel project not linked)

## Notes
- shadcn registry (ui.shadcn.com) is blocked from the Claude Code web environment. Components in /components/ui are hand-written in shadcn style with the same deps (cva, radix, tailwind-merge).
- Vitest config is `vitest.config.mts` (ESM) with a plain `@` alias.
- Env vars are not present in this environment. Stage 2b and Stage 9 need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Until then, run the SQL from /supabase/migrations and /supabase/seed.sql in the Supabase SQL Editor (see DEPLOY.md).

## Verification log
- 2026-10-16: migration + seed applied to a throwaway local Postgres 16 with a stubbed `auth` schema. Verified under `set role authenticated`:
  lookup_event works before membership; direct `select from injects` returns 0 rows; get_my_injects returns only unlocked injects and never flag_hash/explanation; hint appears only once purchased; join_event is idempotent, creates teams + progress rows, rejects bad codes; submissions of other teams are hidden.
- Lint, typecheck, unit tests (14) and `next build` are green.

## Security review notes (Stage 8)
- Flag hashes: stored only in `injects.flag_hash`. No select policy on `injects`, so anon/authenticated REST cannot read it. Server reads use the service role and only `/api/submit` and the debrief page touch `flag_hash`; neither returns it.
- Client props: InjectCard receives the `get_my_injects` row shape (no hash). Facilitator dashboard receives counts and titles only.
- Realtime: `injects` is not in the `supabase_realtime` publication.
- Rate limit: enforced in `submitAnswer` from the last submission timestamp per team (3s).
- Facilitator API verifies the facilitator role from `members` on every call.

## Blockers
- Hosted Supabase and Vercel are not reachable from this session without credentials. Needed from the user: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (set in the Claude Code web environment and in Vercel), plus the Vercel project link.
