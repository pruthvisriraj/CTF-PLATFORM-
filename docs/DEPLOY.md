# DEPLOY

## 1. Supabase (hosted)
1. Create a project at https://supabase.com/dashboard.
2. Settings -> API: copy Project URL, anon key, service_role key.
3. Apply the schema. Either:
   - CLI: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npm run db:push`, then run `supabase/seed.sql` in the SQL Editor; or
   - SQL Editor: paste `supabase/migrations/20261016000000_init.sql`, run it, then paste `supabase/seed.sql`, run it.
4. Authentication -> URL Configuration:
   - Site URL: `https://ctf.<your-domain>`
   - Redirect URLs: `https://ctf.<your-domain>/**`, `https://*.vercel.app/**`, `http://localhost:3000/**`
5. Authentication -> Providers -> Email: keep "Enable email provider" on. Magic links are used; passwords are not.

## 2. Make yourself a facilitator
Sign in once via magic link (so the user exists in auth.users), then run in the SQL Editor:

```sql
insert into public.members (org_id, user_id, role)
select '00000000-0000-0000-0000-000000000001', id, 'facilitator'
from auth.users where email = 'you@example.com';
```

## 3. Vercel
1. Import the GitHub repo into Vercel (framework: Next.js).
2. Project -> Settings -> Environment Variables (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only, never NEXT_PUBLIC)
   - `NEXT_PUBLIC_SITE_URL` = `https://ctf.<your-domain>` (Production). Leave unset on Preview; the app falls back to the request origin so magic links return to the preview URL.
3. Every push creates a preview URL. Record it in docs/PROGRESS.md.

## 4. Domain (Hostinger DNS -> Vercel)
1. Vercel -> Project -> Settings -> Domains -> add `ctf.<your-domain>`.
2. Hostinger hPanel -> Domains -> DNS / Name Servers -> add record:
   - Type `CNAME`, Name `ctf`, Target `cname.vercel-dns.com`, TTL default.
3. Wait for Vercel to show the domain as valid (usually minutes).
4. Main site on Hostinger is untouched.

## 5. Smoke test on the live domain
1. Open `https://ctf.<your-domain>/login`, request a magic link, confirm it returns to the live domain.
2. `/join` with code `DEMO2026`, create a team, answer inject 1 with the phishing sender.
3. Open `/leaderboard/<eventId>` in a second tab; the score updates without refresh.
4. As facilitator, open `/facilitator/<eventId>` and broadcast an announcement.

## Local dev
```
cp .env.example .env.local   # fill in values
npm install
npm run dev
```
