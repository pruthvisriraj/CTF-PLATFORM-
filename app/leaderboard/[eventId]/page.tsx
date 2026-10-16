import { notFound, redirect } from "next/navigation";
import { getEventMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadStandings } from "@/lib/standings";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({ params }: { params: { eventId: string } }) {
  const m = await getEventMembership(params.eventId);
  if (!m) redirect("/join");
  const supabase = createClient();
  const [{ data: event }, standings, { data: total }] = await Promise.all([
    supabase.from("events").select("id, name, status").eq("id", params.eventId).maybeSingle(),
    loadStandings(supabase, params.eventId),
    supabase.rpc("event_inject_count", { p_event_id: params.eventId }),
  ]);
  if (!event) notFound();

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Leaderboard</p>
          <h1 className="text-2xl md:text-3xl font-bold">{event.name}</h1>
        </div>
        <Badge variant={event.status === "live" ? "default" : "secondary"}>{event.status}</Badge>
      </div>
      <Leaderboard eventId={event.id} initial={standings} totalInjects={Number(total ?? 0)} highlightTeamId={m.teamId} />
    </div>
  );
}
