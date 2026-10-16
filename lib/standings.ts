import type { SupabaseClient } from "@supabase/supabase-js";
import { rankTeams } from "./scoring";
import type { Standing } from "./types";

/** Teams with progress for an event, ranked. Works with any client that can read teams + team_progress. */
export async function loadStandings(db: SupabaseClient, eventId: string): Promise<Standing[]> {
  const { data: teams } = await db.from("teams").select("id, name, score").eq("event_id", eventId);
  if (!teams || teams.length === 0) return [];
  const ids = teams.map((t) => t.id);
  const { data: progress } = await db
    .from("team_progress")
    .select("team_id, current_inject_order, completed_at")
    .in("team_id", ids);
  const byTeam = new Map((progress ?? []).map((p) => [p.team_id, p]));
  return rankTeams(
    teams.map((t) => {
      const p = byTeam.get(t.id);
      return {
        teamId: t.id,
        name: t.name,
        score: t.score,
        currentInjectOrder: p?.current_inject_order ?? 1,
        completedAt: p?.completed_at ?? null,
      };
    })
  );
}
