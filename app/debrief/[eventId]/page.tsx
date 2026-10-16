import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trophy, Lightbulb, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { getEventMembership } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { hashFlag } from "@/lib/flags";
import { formatDuration } from "@/lib/scoring";
import { loadStandings } from "@/lib/standings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DebriefPage({ params }: { params: { eventId: string } }) {
  const m = await getEventMembership(params.eventId);
  if (!m) redirect("/join");

  const db = createServiceClient();
  const { data: event } = await db
    .from("events")
    .select("id, name, status, started_at, ended_at, scenario_id")
    .eq("id", params.eventId)
    .maybeSingle();
  if (!event) notFound();

  const isFacilitator = m.role === "facilitator";
  if (!isFacilitator && event.status !== "ended") {
    return (
      <div className="container max-w-xl py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold">Debrief not available yet</h1>
        <p className="text-muted-foreground">The debrief opens when the facilitator ends the event.</p>
        <Button asChild>
          <Link href={`/play/${event.id}`}>Back to the exercise</Link>
        </Button>
      </div>
    );
  }

  const [{ data: scenario }, { data: injects }, standings, { data: teams }, { data: progress }, { data: scoreEvents }, { data: subs }] =
    await Promise.all([
      db.from("scenarios").select("title").eq("id", event.scenario_id).maybeSingle(),
      db
        .from("injects")
        .select('id, order, title, points, type, options, flag_hash, hint_penalty, explanation')
        .eq("scenario_id", event.scenario_id)
        .order("order"),
      loadStandings(db, event.id),
      db.from("teams").select("id, name, created_at").eq("event_id", event.id),
      db.from("team_progress").select("team_id, hints_used, completed_at"),
      db.from("score_events").select("team_id, inject_id, kind, delta, created_at").eq("org_id", m.orgId).order("created_at"),
      db.from("submissions").select("team_id, inject_id, correct").eq("org_id", m.orgId),
    ]);

  const eventStartedAt = event.started_at as string | null;
  const teamIds = new Set((teams ?? []).map((t) => t.id));
  const teamCreated = new Map((teams ?? []).map((t) => [t.id, t.created_at]));
  const progressByTeam = new Map((progress ?? []).filter((p) => teamIds.has(p.team_id)).map((p) => [p.team_id, p]));
  const correctEvents = (scoreEvents ?? []).filter((e) => e.kind === "correct" && teamIds.has(e.team_id));
  const injectList = (injects ?? []).map((i) => ({
    ...i,
    order: i.order as number,
    options: (i.options ?? null) as string[] | null,
  }));

  // Correct MCQ option is derived server-side by hashing each option; the hash never leaves this function.
  const correctOption = (inj: (typeof injectList)[number]) =>
    inj.type === "mcq" && inj.options ? inj.options.find((o) => hashFlag(o) === inj.flag_hash) ?? null : null;

  function solveTime(teamId: string, injectId: string, order: number): number | null {
    const solved = correctEvents.find((e) => e.team_id === teamId && e.inject_id === injectId);
    if (!solved) return null;
    const prevInject = injectList.find((i) => i.order === order - 1);
    const prev = prevInject ? correctEvents.find((e) => e.team_id === teamId && e.inject_id === prevInject.id) : null;
    const startCandidates = [eventStartedAt, teamCreated.get(teamId)].filter(Boolean) as string[];
    const start = prev ? new Date(prev.created_at).getTime() : Math.max(...startCandidates.map((s) => new Date(s).getTime()));
    return Math.max(0, new Date(solved.created_at).getTime() - start);
  }

  const summary = standings.map((s, i) => {
    const p = progressByTeam.get(s.teamId);
    const hints = Array.isArray(p?.hints_used) ? (p!.hints_used as string[]).length : 0;
    const wrong = (subs ?? []).filter((x) => x.team_id === s.teamId && !x.correct).length;
    const solvedCount = correctEvents.filter((e) => e.team_id === s.teamId).length;
    const total = injectList.reduce((acc, inj) => acc + (solveTime(s.teamId, inj.id, inj.order) ?? 0), 0);
    return { rank: i + 1, ...s, hints, wrong, solvedCount, total, finished: !!p?.completed_at };
  });

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Debrief · {scenario?.title}</p>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          {event.started_at && event.ended_at && (
            <p className="text-sm text-muted-foreground mt-1">
              Duration {formatDuration(new Date(event.ended_at).getTime() - new Date(event.started_at).getTime())}
            </p>
          )}
        </div>
        <Badge variant={event.status === "ended" ? "destructive" : "secondary"}>{event.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" /> Final standings
          </CardTitle>
          <CardDescription>Score, total solve time, hints used and wrong attempts per team.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Team</th>
                  <th className="px-4 py-2 text-right">Score</th>
                  <th className="px-4 py-2 text-right">Solved</th>
                  <th className="px-4 py-2 text-right">Time</th>
                  <th className="px-4 py-2 text-right">Hints</th>
                  <th className="px-4 py-2 text-right">Wrong</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((t) => (
                  <tr key={t.teamId} className="border-b last:border-0">
                    <td className="px-4 py-3 font-bold">{t.rank}</td>
                    <td className="px-4 py-3 font-medium">
                      {t.name} {t.finished && <CheckCircle2 className="inline h-4 w-4 text-primary" />}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-lg font-semibold tabular-nums">{t.score}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {t.solvedCount}/{injectList.length}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatDuration(t.total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.hints}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{t.wrong}</td>
                  </tr>
                ))}
                {summary.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      No teams took part.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Inject by inject</h2>
        {injectList.map((inj) => {
          const answer = correctOption(inj);
          return (
            <Card key={inj.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    {inj.order}. {inj.title}
                  </CardTitle>
                  <Badge variant="secondary">{inj.points} pts</Badge>
                </div>
                {answer && (
                  <CardDescription>
                    Correct answer: <span className="font-medium text-foreground">{answer}</span>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {inj.explanation && (
                  <div className="rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm leading-relaxed">{inj.explanation}</div>
                )}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {standings.map((s) => {
                    const t = solveTime(s.teamId, inj.id, inj.order);
                    const wrong = (subs ?? []).filter((x) => x.team_id === s.teamId && x.inject_id === inj.id && !x.correct).length;
                    const p = progressByTeam.get(s.teamId);
                    const usedHint = Array.isArray(p?.hints_used) && (p!.hints_used as string[]).includes(inj.id);
                    return (
                      <div key={s.teamId} className="rounded-md border px-3 py-2 text-sm">
                        <p className="font-medium">{s.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t === null ? "not solved" : formatDuration(t)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-destructive" /> {wrong}
                          </span>
                          {usedHint && (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <Lightbulb className="h-3 w-3" /> hint (-{inj.hint_penalty})
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
