# PROGRESS

Autonomous build log. Resume from the first unchecked item.

## Stages
- [x] Stage 1 - Setup (Next.js 14, TS strict, Tailwind, shadcn-style UI, Supabase clients, Vitest, docs)
- [x] Stage 2 - Database + seed written (migration, RLS, learner-safe RPC, seed.sql, evidence files)
- [ ] Stage 2b - Migration + seed applied to hosted Supabase (needs project credentials)
- [ ] Stage 3 - Auth + Join
- [ ] Stage 4 - Gameplay
- [ ] Stage 5 - Live leaderboard
- [ ] Stage 6 - Facilitator dashboard
- [ ] Stage 7 - Debrief
- [ ] Stage 8 - Polish + security review
- [ ] Stage 9 - Deploy + domain

## Preview URLs
- (none yet - Vercel project not linked)

## Notes
- shadcn registry (ui.shadcn.com) is blocked from the Claude Code web environment. Components in /components/ui are hand-written in shadcn style with the same deps (cva, radix, tailwind-merge).
- Vitest config is `vitest.config.mts` (ESM) with a plain `@` alias.
- Env vars are not present in this environment. Stage 2b and Stage 9 need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Until then, run the SQL from /supabase/migrations and /supabase/seed.sql in the Supabase SQL Editor (see DEPLOY.md).

## Blockers
- (none)
