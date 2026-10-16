import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { getEventMembership } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadStandings } from "@/lib/standings";
import type { Announcement, LearnerInject } from "@/lib/types";
import { InjectCard } from "@/components/play/inject-card";
import { LiveEvent } from "@/components/play/live-event";
import { Leaderboard } from "@/components/leaderboard/leaderboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PlayPage({ params }: { params: { eventId: string } }) {
  const m = await getEventMembership(params.eventId);
  if (!m) redirect("/join");
  if (m.role === "facilitator") redirect(`/facilitator/${params.eventId}`);

  const supabase = createClient();
  const { data: event } = await supabase.from("events").select("id, name, status, scenario_id").eq("id", params.eventId).maybeSingle();
  if (!event) notFound();
  const [{ data: scenario }, { data: injectsRaw }, { data: team }, { data: total }, standings, { data: ann }] =
    await Promise.all([
      supabase.from("scenarios").select("title, description").eq("id", event.scenario_id).maybeSingle(),
      supabase.rpc("get_my_injects", { p_event_id: params.eventId }),
      supabase.from("teams").select("id, name, score").eq("id", m.teamId!).maybeSingle(),
      supabase.rpc("event_inject_count", { p_event_id: params.eventId }),
      loadStandings(supabase, params.eventId),
      supabase
        .from("announcements")
        .select("id, message, created_at")
        .eq("event_id", params.eventId)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
  if (!team) notFound();

  const injects = (injectsRaw ?? []) as LearnerInject[];
  const totalInjects = Number(total ?? 0);
  const solvedCount = injects.filter((i) => i.solved).length;
  const completed = totalInjects > 0 && solvedCount >= totalInjects;
  const live = event.status === "live";

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{scenario?.title ?? "Scenario"}</p>
          <h1 className="text-2xl md:text-3xl font-bold">{event.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={live ? "default" : event.status === "ended" ? "destructive" : "secondary"}>{event.status}</Badge>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Team {team.name}</p>
            <p className="font-mono text-2xl font-bold tabular-nums">{team.score}</p>
          </div>
        </div>
      </div>

      <LiveEvent eventId={event.id} teamId={team.id} initialAnnouncements={(ann ?? []) as Announcement[]} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {event.status === "draft" && (
            <Card>
              <CardContent className="p-6 text-muted-foreground">Waiting for the facilitator to start the exercise.</CardContent>
            </Card>
          )}
          {scenario?.description && solvedCount === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Situation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed whitespace-pre-line">{scenario.description}</CardContent>
            </Card>
          )}
          {injects.map((inj) => (
            <InjectCard key={inj.id} eventId={event.id} inject={inj} live={live} />
          ))}
          {completed && (
            <Card className="border-primary">
              <CardContent className="p-6 flex items-center gap-3">
                <PartyPopper className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">All injects complete.</p>
                  <p className="text-sm text-muted-foreground">Watch the leaderboard and wait for the debrief.</p>
                </div>
              </CardContent>
            </Card>
          )}
          {event.status === "ended" && (
            <Button asChild variant="secondary">
              <Link href={`/debrief/${event.id}`}>View debrief</Link>
            </Button>
          )}
        </div>
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Leaderboard</h2>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href={`/leaderboard/${event.id}`}>Full view</Link>
            </Button>
          </div>
          <Leaderboard eventId={event.id} initial={standings} totalInjects={totalInjects} highlightTeamId={team.id} compact />
        </aside>
      </div>
    </div>
  );
}
