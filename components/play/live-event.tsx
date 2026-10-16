"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Props {
  eventId: string;
  teamId: string | null;
  initialAnnouncements: Announcement[];
}

/**
 * Subscribes to realtime changes that should re-render the play page:
 * announcements (shown as banners), event status changes and the
 * team's own progress (a teammate solving an inject).
 */
export function LiveEvent({ eventId, teamId, initialAnnouncements }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>(initialAnnouncements);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setItems(initialAnnouncements);
  }, [initialAnnouncements]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event:${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements", filter: `event_id=eq.${eventId}` },
        (payload) => {
          const a = payload.new as Announcement;
          setItems((prev) => [a, ...prev].slice(0, 5));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "events", filter: `id=eq.${eventId}` },
        () => router.refresh()
      );
    if (teamId) {
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "team_progress", filter: `team_id=eq.${teamId}` },
        () => router.refresh()
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, teamId, router]);

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((a) => (
        <Alert key={a.id} variant="warning" className="pr-10">
          <Megaphone className="h-4 w-4" />
          <AlertTitle>Facilitator announcement</AlertTitle>
          <AlertDescription>{a.message}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-8 w-8"
            onClick={() => setDismissed((d) => new Set(d).add(a.id))}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
