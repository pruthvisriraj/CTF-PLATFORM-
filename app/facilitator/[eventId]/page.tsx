import { notFound, redirect } from "next/navigation";
import { getEventMembership } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { loadStandings } from "@/lib/standings";
import type { Announcement } from "@/lib/types";
import { Dashboard, type TeamStatus } from "@/components/facilitator/dashboard";

export const dynamic = "force-dynamic";

export default async function FacilitatorPage({ params }: { params: { eventId: string } }) {
  const m = await getEventMembership(params.eventId);
  if (!m) redirect("/login?next=" + encodeURIComponent(`/facilitator/${params.eventId}`));
  if (m.role !== "facilitator") redirect(`/play/${params.eventId}`);

  const db = createServiceClient();
  const { data: event } = await db.from("events").select("id, name, status, join_code, started_at, scenario_id").eq("id", params.eventId).maybeSingle();
  if (!event) notFound();

  const [{ data: injects }, { data: teams }, { data: progress }, { data: subs }, { data: ann }, standings] = await Promise.all([
    db.from("injects").select('id, order, title, points').eq("scenario_id", event.scenario_id).order("order"),
    db.from("teams").select("id, name, score, created_at").eq("event_id", event.id),
    db.from("team_progress").select("team_id, current_inject_order, hints_used, inject_started_at, completed_at"),
    db.from("submissions").select("team_id, inject_id, correct").eq("org_id", m.orgId),
    db.from("announcements").select("id, message, created_at").eq("event_id", event.id).order("created_at", { ascending: false }).limit(5),
    loadStandings(db, event.id),
  ]);

  const teamIds = new Set((teams ?? []).map((t) => t.id));
  const byTeam = new Map((progress ?? []).filter((p) => teamIds.has(p.team_id)).map((p) => [p.team_id, p]));
  const injectList = (injects ?? []).map((i) => ({ id: i.id, order: i.order as number, title: i.title, points: i.points }));
  const byOrder = new Map(injectList.map((i) => [i.order, i]));

  const rows: TeamStatus[] = standings.map((s) => {
    const p = byTeam.get(s.teamId);
    const teamSubs = (subs ?? []).filter((x) => x.team_id === s.teamId);
    const current = p ? byOrder.get(p.current_inject_order) : undefined;
    const wrongOnCurrent = current ? teamSubs.filter((x) => x.inject_id === current.id && !x.correct).length : 0;
    return {
      teamId: s.teamId,
      name: s.name,
      score: s.score,
      currentOrder: p?.current_inject_order ?? 1,
      currentTitle: p?.completed_at ? "Finished" : current?.title ?? "-",
      injectStartedAt: p?.inject_started_at ?? null,
      completedAt: p?.completed_at ?? null,
      wrongAttempts: teamSubs.filter((x) => !x.correct).length,
      wrongOnCurrent,
      hintsUsed: Array.isArray(p?.hints_used) ? (p!.hints_used as string[]).length : 0,
    };
  });

  return (
    <Dashboard
      event={{ id: event.id, name: event.name, status: event.status, joinCode: event.join_code, startedAt: event.started_at }}
      totalInjects={injectList.length}
      teams={rows}
      announcements={(ann ?? []) as Announcement[]}
    />
  );
}
