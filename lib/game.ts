/**
 * Server-side game logic. Every function here runs with the service role and
 * must be called only after the caller's identity has been verified.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkFlag, hashFlag } from "./flags";
import { canSubmit, hintPenalty, pointsForCorrect } from "./scoring";
import { recordScoreEvent } from "./events";

export type EventStatus = "draft" | "live" | "paused" | "ended";

export interface EventRow {
  id: string;
  org_id: string;
  scenario_id: string;
  name: string;
  join_code: string;
  status: EventStatus;
  started_at: string | null;
  ended_at: string | null;
}

export interface TeamRow {
  id: string;
  org_id: string;
  event_id: string;
  name: string;
  score: number;
  created_at: string;
}

export interface ProgressRow {
  team_id: string;
  current_inject_order: number;
  hints_used: string[];
  inject_started_at: string;
  completed_at: string | null;
}

export type SubmitResult =
  | { ok: true; correct: true; points: number; newScore: number; completed: boolean }
  | { ok: true; correct: false }
  | { ok: false; error: string; status: number };

export async function getEvent(db: SupabaseClient, eventId: string): Promise<EventRow | null> {
  const { data } = await db.from("events").select("*").eq("id", eventId).maybeSingle();
  return (data as EventRow | null) ?? null;
}

export async function getTeamAndProgress(db: SupabaseClient, teamId: string) {
  const [{ data: team }, { data: progress }] = await Promise.all([
    db.from("teams").select("*").eq("id", teamId).single(),
    db.from("team_progress").select("*").eq("team_id", teamId).single(),
  ]);
  return { team: team as TeamRow | null, progress: progress as ProgressRow | null };
}

export async function submitAnswer(
  db: SupabaseClient,
  input: { userId: string; orgId: string; teamId: string; eventId: string; injectId: string; answer: string }
): Promise<SubmitResult> {
  const answer = input.answer ?? "";
  if (answer.trim().length === 0 || answer.length > 500) {
    return { ok: false, error: "Answer must be 1-500 characters.", status: 400 };
  }

  const event = await getEvent(db, input.eventId);
  if (!event) return { ok: false, error: "Event not found.", status: 404 };
  if (event.status !== "live") return { ok: false, error: `Event is ${event.status}. Submissions are closed.`, status: 409 };

  const { team, progress } = await getTeamAndProgress(db, input.teamId);
  if (!team || !progress) return { ok: false, error: "Team not found.", status: 404 };

  const { data: inject } = await db
    .from("injects")
    .select('id, order, flag_hash, points, scenario_id')
    .eq("id", input.injectId)
    .eq("scenario_id", event.scenario_id)
    .maybeSingle();
  if (!inject) return { ok: false, error: "Inject not found.", status: 404 };
  if (inject.order < progress.current_inject_order) return { ok: false, error: "Already solved.", status: 409 };
  if (inject.order > progress.current_inject_order) return { ok: false, error: "Inject is locked.", status: 403 };

  // Rate limit: one submission per 3 seconds per team.
  const { data: last } = await db
    .from("submissions")
    .select("created_at")
    .eq("team_id", input.teamId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!canSubmit(last ? new Date(last.created_at) : null, new Date())) {
    return { ok: false, error: "Slow down. One answer every 3 seconds per team.", status: 429 };
  }

  const correct = checkFlag(answer, inject.flag_hash);
  const { error: subErr } = await db.from("submissions").insert({
    org_id: input.orgId,
    team_id: input.teamId,
    inject_id: inject.id,
    user_id: input.userId,
    answer_hash: hashFlag(answer),
    correct,
  });
  if (subErr) return { ok: false, error: subErr.message, status: 500 };

  if (!correct) return { ok: true, correct: false };

  const points = pointsForCorrect(inject.points);
  const { newScore } = await recordScoreEvent(db, {
    orgId: input.orgId,
    teamId: input.teamId,
    injectId: inject.id,
    kind: "correct",
    delta: points,
  });

  const { count } = await db
    .from("injects")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", event.scenario_id);
  const completed = (count ?? 0) <= inject.order;

  const { error: progErr } = await db
    .from("team_progress")
    .update({
      current_inject_order: inject.order + 1,
      inject_started_at: new Date().toISOString(),
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("team_id", input.teamId)
    .eq("current_inject_order", progress.current_inject_order); // optimistic: ignore if a teammate advanced first
  if (progErr) return { ok: false, error: progErr.message, status: 500 };

  return { ok: true, correct: true, points, newScore, completed };
}

export type HintResult =
  | { ok: true; hint: string; penalty: number; newScore: number | null }
  | { ok: false; error: string; status: number };

export async function revealHint(
  db: SupabaseClient,
  input: { orgId: string; teamId: string; eventId: string; injectId: string }
): Promise<HintResult> {
  const event = await getEvent(db, input.eventId);
  if (!event) return { ok: false, error: "Event not found.", status: 404 };
  if (event.status !== "live") return { ok: false, error: `Event is ${event.status}.`, status: 409 };

  const { progress } = await getTeamAndProgress(db, input.teamId);
  if (!progress) return { ok: false, error: "Team not found.", status: 404 };

  const { data: inject } = await db
    .from("injects")
    .select('id, order, hint, hint_penalty')
    .eq("id", input.injectId)
    .eq("scenario_id", event.scenario_id)
    .maybeSingle();
  if (!inject || !inject.hint) return { ok: false, error: "No hint for this inject.", status: 404 };
  if (inject.order > progress.current_inject_order) return { ok: false, error: "Inject is locked.", status: 403 };

  const used = Array.isArray(progress.hints_used) ? (progress.hints_used as string[]) : [];
  const penalty = hintPenalty(inject.id, inject.hint_penalty, used);
  if (penalty === 0) return { ok: true, hint: inject.hint, penalty: 0, newScore: null };

  // Mark the hint used, then charge once.
  const { error: updErr } = await db
    .from("team_progress")
    .update({ hints_used: [...used, inject.id], updated_at: new Date().toISOString() })
    .eq("team_id", input.teamId);
  if (updErr) return { ok: false, error: updErr.message, status: 500 };

  const { newScore } = await recordScoreEvent(db, {
    orgId: input.orgId,
    teamId: input.teamId,
    injectId: inject.id,
    kind: "hint",
    delta: penalty,
  });
  return { ok: true, hint: inject.hint, penalty, newScore };
}

export async function setEventStatus(db: SupabaseClient, eventId: string, status: EventStatus) {
  const patch: Partial<EventRow> = { status };
  if (status === "live") {
    const ev = await getEvent(db, eventId);
    if (ev && !ev.started_at) patch.started_at = new Date().toISOString();
  }
  if (status === "ended") patch.ended_at = new Date().toISOString();
  const { error } = await db.from("events").update(patch).eq("id", eventId);
  if (error) throw new Error(error.message);
}

export async function announce(db: SupabaseClient, orgId: string, eventId: string, message: string) {
  const msg = message.trim();
  if (!msg || msg.length > 500) throw new Error("Announcement must be 1-500 characters.");
  const { error } = await db.from("announcements").insert({ org_id: orgId, event_id: eventId, message: msg });
  if (error) throw new Error(error.message);
}
