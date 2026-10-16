/**
 * Scoring event sink. Every point change in the platform goes through
 * recordScoreEvent so a future xAPI / LTI AGS adapter has a single hook.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyDelta, type ScoreKind } from "./scoring";

export interface ScoreEventInput {
  orgId: string;
  teamId: string;
  injectId: string | null;
  kind: ScoreKind;
  delta: number;
}

export interface ScoreEventResult {
  newScore: number;
}

/**
 * Records a score event and applies it to the team's score.
 * `db` must be a service-role client (server-only).
 */
export async function recordScoreEvent(db: SupabaseClient, input: ScoreEventInput): Promise<ScoreEventResult> {
  const { data: team, error: teamErr } = await db
    .from("teams")
    .select("score")
    .eq("id", input.teamId)
    .single();
  if (teamErr || !team) throw new Error(teamErr?.message ?? "team not found");

  const newScore = applyDelta(team.score, input.delta);

  const { error: insErr } = await db.from("score_events").insert({
    org_id: input.orgId,
    team_id: input.teamId,
    inject_id: input.injectId,
    kind: input.kind,
    delta: input.delta,
  });
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await db.from("teams").update({ score: newScore }).eq("id", input.teamId);
  if (updErr) throw new Error(updErr.message);

  // Future: emit xAPI statement / LTI AGS score here.
  return { newScore };
}
