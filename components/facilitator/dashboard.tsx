"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Pause, Square, Megaphone, Lightbulb, XCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDuration } from "@/lib/scoring";
import type { Announcement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface TeamStatus {
  teamId: string;
  name: string;
  score: number;
  currentOrder: number;
  currentTitle: string;
  injectStartedAt: string | null;
  completedAt: string | null;
  wrongAttempts: number;
  wrongOnCurrent: number;
  hintsUsed: number;
}

interface Props {
  event: { id: string; name: string; status: string; joinCode: string; startedAt: string | null };
  totalInjects: number;
  teams: TeamStatus[];
  announcements: Announcement[];
}

export function Dashboard({ event, totalInjects, teams, announcements }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const bump = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel(`facilitator:${event.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter: `event_id=eq.${event.id}` }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_progress" }, bump)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions" }, bump)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${event.id}` }, bump)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [event.id, router]);

  async function call(body: Record<string, string>, key: string) {
    setBusy(key);
    setError(null);
    try {
      const res = await fetch(`/api/facilitator/${event.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Request failed");
      else {
        if (key === "announce") setMessage("");
        router.refresh();
      }
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  }

  const live = event.status === "live";
  const ended = event.status === "ended";

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Facilitator</p>
          <h1 className="text-2xl md:text-3xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Join code <span className="font-mono font-semibold text-foreground">{event.joinCode}</span>
            {event.startedAt && <> · running {formatDuration(now - new Date(event.startedAt).getTime())}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={live ? "default" : ended ? "destructive" : "secondary"}>{event.status}</Badge>
          {!live && !ended && (
            <Button size="sm" onClick={() => call({ action: "status", status: "live" }, "live")} disabled={busy !== null}>
              <Play className="h-4 w-4" /> {event.status === "paused" ? "Resume" : "Start"}
            </Button>
          )}
          {live && (
            <Button size="sm" variant="secondary" onClick={() => call({ action: "status", status: "paused" }, "paused")} disabled={busy !== null}>
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {!ended && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => window.confirm("End the event? Teams will no longer be able to submit.") && call({ action: "status", status: "ended" }, "ended")}
              disabled={busy !== null}
            >
              <Square className="h-4 w-4" /> End
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/leaderboard/${event.id}`}>Leaderboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/debrief/${event.id}`}>Debrief</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Teams ({teams.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {teams.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No teams have joined yet. Share the join code.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="px-4 py-2">Team</th>
                      <th className="px-4 py-2 text-right">Score</th>
                      <th className="px-4 py-2">Current inject</th>
                      <th className="px-4 py-2 text-right">Time on inject</th>
                      <th className="px-4 py-2 text-right">Wrong</th>
                      <th className="px-4 py-2 text-right">Hints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((t) => {
                      const onInject = t.injectStartedAt && !t.completedAt ? now - new Date(t.injectStartedAt).getTime() : 0;
                      const slow = onInject > 10 * 60 * 1000;
                      return (
                        <tr key={t.teamId} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{t.name}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{t.score}</td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground mr-1">{t.completedAt ? "" : `${Math.min(t.currentOrder, totalInjects)}/${totalInjects}`}</span>
                            {t.currentTitle}
                          </td>
                          <td className={"px-4 py-3 text-right font-mono tabular-nums " + (slow ? "text-amber-400" : "")}>
                            {t.completedAt ? "-" : (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatDuration(onInject)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-destructive" />
                              {t.wrongAttempts}
                              {t.wrongOnCurrent > 0 && <span className="text-xs text-muted-foreground">({t.wrongOnCurrent} here)</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="inline-flex items-center gap-1">
                              <Lightbulb className="h-3 w-3 text-amber-400" />
                              {t.hintsUsed}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Announce to all teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (message.trim()) call({ action: "announce", message }, "announce");
                }}
              >
                <Input value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} placeholder="The CEO wants an update in 5 minutes." />
                <Button type="submit" className="w-full" disabled={busy !== null || !message.trim()}>
                  {busy === "announce" ? "Sending..." : "Broadcast"}
                </Button>
              </form>
              {announcements.length > 0 && (
                <ul className="space-y-2 text-sm">
                  {announcements.map((a) => (
                    <li key={a.id} className="rounded border px-3 py-2">
                      <p>{a.message}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleTimeString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
