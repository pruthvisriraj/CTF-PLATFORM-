"use client";

import { useEffect, useState } from "react";
import { Trophy, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rankTeams } from "@/lib/scoring";
import type { Standing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
  initial: Standing[];
  totalInjects: number;
  highlightTeamId?: string | null;
  compact?: boolean;
}

export function Leaderboard({ eventId, initial, totalInjects, highlightTeamId, compact }: Props) {
  const [rows, setRows] = useState<Standing[]>(initial);

  useEffect(() => {
    setRows(initial);
  }, [initial]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`leaderboard:${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const t = payload.new as { id: string; name: string; score: number };
          if (!t?.id) return;
          setRows((prev) => {
            const exists = prev.find((r) => r.teamId === t.id);
            const next = exists
              ? prev.map((r) => (r.teamId === t.id ? { ...r, name: t.name, score: t.score } : r))
              : [...prev, { teamId: t.id, name: t.name, score: t.score, currentInjectOrder: 1, completedAt: null }];
            return rankTeams(next);
          });
        }
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "team_progress" }, (payload) => {
        const p = payload.new as { team_id: string; current_inject_order: number; completed_at: string | null };
        if (!p?.team_id) return;
        setRows((prev) =>
          rankTeams(
            prev.map((r) =>
              r.teamId === p.team_id ? { ...r, currentInjectOrder: p.current_inject_order, completedAt: p.completed_at } : r
            )
          )
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No teams yet.</p>;
  }

  return (
    <ol className="space-y-2">
      {rows.map((r, i) => {
        const solved = Math.min(r.currentInjectOrder - 1, totalInjects);
        const pct = totalInjects > 0 ? Math.round((solved / totalInjects) * 100) : 0;
        const mine = r.teamId === highlightTeamId;
        return (
          <li
            key={r.teamId}
            className={cn(
              "rounded-md border bg-card px-3 py-2 transition-colors",
              mine && "border-primary",
              !compact && "px-4 py-3"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                  i === 0 ? "bg-amber-400 text-black" : i === 1 ? "bg-slate-300 text-black" : i === 2 ? "bg-amber-700 text-white" : "bg-secondary"
                )}
              >
                {i === 0 ? <Trophy className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("truncate font-medium", !compact && "text-lg")}>{r.name}</span>
                  <span className={cn("font-mono font-semibold tabular-nums", !compact && "text-xl")}>{r.score}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-1.5 flex-1 rounded bg-secondary overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="shrink-0 flex items-center gap-1">
                    {r.completedAt ? <CheckCircle2 className="h-3 w-3 text-primary" /> : null}
                    {solved}/{totalInjects}
                  </span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
