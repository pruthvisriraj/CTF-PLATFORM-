-- Tabletop CTF: core schema, RLS, learner-safe RPCs.
-- All tenant tables carry org_id. Flag hashes never leave the server.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete restrict,
  name text not null,
  join_code text not null unique,
  status text not null default 'draft' check (status in ('draft','live','paused','ended')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index events_join_code_idx on public.events (upper(join_code));

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  unique (event_id, name)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  role text not null default 'learner' check (role in ('learner','facilitator')),
  created_at timestamptz not null default now()
);
create index members_user_idx on public.members (user_id);
create index members_team_idx on public.members (team_id);
-- one facilitator row per org per user; one learner row per team per user
create unique index members_facilitator_unique on public.members (org_id, user_id) where role = 'facilitator';
create unique index members_team_unique on public.members (team_id, user_id) where team_id is not null;

create table public.injects (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  "order" integer not null,
  title text not null,
  body text not null,
  evidence_url text,
  type text not null default 'text' check (type in ('text','mcq')),
  options jsonb,
  flag_hash text not null,
  points integer not null default 100,
  hint text,
  hint_penalty integer not null default 0,
  explanation text,
  unique (scenario_id, "order")
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  inject_id uuid not null references public.injects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  answer_hash text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index submissions_team_idx on public.submissions (team_id, created_at desc);

create table public.team_progress (
  team_id uuid primary key references public.teams(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  current_inject_order integer not null default 1,
  hints_used jsonb not null default '[]'::jsonb,
  inject_started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Scoring ledger: every point change goes through here (future xAPI/LTI hook).
create table public.score_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  inject_id uuid references public.injects(id) on delete set null,
  kind text not null check (kind in ('correct','hint','adjustment')),
  delta integer not null,
  created_at timestamptz not null default now()
);
create index score_events_team_idx on public.score_events (team_id, created_at);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
create index announcements_event_idx on public.announcements (event_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can call them cheaply)
-- ---------------------------------------------------------------------------
create or replace function public.my_org_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select org_id from public.members where user_id = auth.uid()
$$;

create or replace function public.is_facilitator(p_org_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members
    where user_id = auth.uid() and org_id = p_org_id and role = 'facilitator'
  )
$$;

create or replace function public.my_team_ids()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select team_id from public.members where user_id = auth.uid() and team_id is not null
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.scenarios enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.members enable row level security;
alter table public.injects enable row level security;
alter table public.submissions enable row level security;
alter table public.team_progress enable row level security;
alter table public.score_events enable row level security;
alter table public.announcements enable row level security;

create policy "org members read org" on public.organizations
  for select to authenticated using (id in (select public.my_org_ids()));

create policy "org members read scenarios" on public.scenarios
  for select to authenticated using (org_id in (select public.my_org_ids()));

create policy "org members read events" on public.events
  for select to authenticated using (org_id in (select public.my_org_ids()));
create policy "facilitators update events" on public.events
  for update to authenticated using (public.is_facilitator(org_id)) with check (public.is_facilitator(org_id));

create policy "org members read teams" on public.teams
  for select to authenticated using (org_id in (select public.my_org_ids()));

create policy "members read own rows" on public.members
  for select to authenticated using (user_id = auth.uid() or public.is_facilitator(org_id));

-- injects: NO select policy for authenticated. Learners use get_my_injects();
-- facilitator and debrief pages read via the service role on the server.

create policy "teams read own submissions" on public.submissions
  for select to authenticated
  using (team_id in (select public.my_team_ids()) or public.is_facilitator(org_id));

create policy "org members read progress" on public.team_progress
  for select to authenticated using (org_id in (select public.my_org_ids()));

create policy "teams read own score events" on public.score_events
  for select to authenticated
  using (team_id in (select public.my_team_ids()) or public.is_facilitator(org_id));

create policy "org members read announcements" on public.announcements
  for select to authenticated using (org_id in (select public.my_org_ids()));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Event lookup by join code (no membership needed yet). Returns teams to join.
create or replace function public.lookup_event(p_code text)
returns table (event_id uuid, event_name text, status text, scenario_title text, teams jsonb)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, e.status, s.title,
    coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name)
              from public.teams t where t.event_id = e.id), '[]'::jsonb)
  from public.events e join public.scenarios s on s.id = e.scenario_id
  where upper(e.join_code) = upper(trim(p_code)) and e.status <> 'ended'
  limit 1
$$;

-- Join (or create) a team in the event identified by join code.
create or replace function public.join_event(p_code text, p_team_name text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_event public.events%rowtype;
  v_team_id uuid;
  v_existing uuid;
  v_name text := trim(p_team_name);
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_event from public.events
    where upper(join_code) = upper(trim(p_code)) and status <> 'ended';
  if not found then raise exception 'invalid join code'; end if;
  if v_name = '' or length(v_name) > 40 then raise exception 'team name must be 1-40 characters'; end if;

  -- already on a team in this event? return it
  select m.team_id into v_existing
    from public.members m join public.teams t on t.id = m.team_id
    where m.user_id = auth.uid() and t.event_id = v_event.id limit 1;
  if v_existing is not null then return v_event.id; end if;

  select id into v_team_id from public.teams where event_id = v_event.id and lower(name) = lower(v_name);
  if v_team_id is null then
    insert into public.teams (org_id, event_id, name) values (v_event.org_id, v_event.id, v_name)
      returning id into v_team_id;
    insert into public.team_progress (team_id, org_id) values (v_team_id, v_event.org_id);
  end if;

  insert into public.members (org_id, user_id, team_id, role)
    values (v_event.org_id, auth.uid(), v_team_id, 'learner');
  return v_event.id;
end $$;

-- Learner-safe inject feed: only unlocked injects, never flag_hash/explanation,
-- hint only when the team already paid for it.
create or replace function public.get_my_injects(p_event_id uuid)
returns table (
  id uuid, "order" integer, title text, body text, evidence_url text,
  type text, options jsonb, points integer, hint_penalty integer,
  hint text, solved boolean, is_current boolean
)
language sql stable security definer set search_path = public as $$
  with me as (
    select t.id as team_id, tp.current_inject_order, tp.hints_used
    from public.members m
    join public.teams t on t.id = m.team_id
    join public.team_progress tp on tp.team_id = t.id
    where m.user_id = auth.uid() and t.event_id = p_event_id
    limit 1
  )
  select i.id, i."order", i.title, i.body, i.evidence_url, i.type, i.options, i.points, i.hint_penalty,
    case when me.hints_used ? i.id::text then i.hint else null end as hint,
    i."order" < me.current_inject_order as solved,
    i."order" = me.current_inject_order as is_current
  from public.injects i
  join public.events e on e.scenario_id = i.scenario_id and e.id = p_event_id
  cross join me
  where i."order" <= me.current_inject_order
  order by i."order"
$$;

-- Count of injects in an event's scenario (for progress display).
create or replace function public.event_inject_count(p_event_id uuid)
returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.injects i
  join public.events e on e.scenario_id = i.scenario_id where e.id = p_event_id
$$;

revoke all on function public.lookup_event(text) from public;
revoke all on function public.join_event(text, text) from public;
revoke all on function public.get_my_injects(uuid) from public;
revoke all on function public.event_inject_count(uuid) from public;
grant execute on function public.lookup_event(text) to authenticated;
grant execute on function public.join_event(text, text) to authenticated;
grant execute on function public.get_my_injects(uuid) to authenticated;
grant execute on function public.event_inject_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_progress;
alter publication supabase_realtime add table public.announcements;
alter publication supabase_realtime add table public.events;
