import { NextResponse } from "next/server";
import { getEventMembership } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { announce, setEventStatus, type EventStatus } from "@/lib/game";

export const dynamic = "force-dynamic";

const STATUSES: EventStatus[] = ["draft", "live", "paused", "ended"];

export async function POST(request: Request, { params }: { params: { eventId: string } }) {
  const m = await getEventMembership(params.eventId);
  if (!m) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (m.role !== "facilitator") return NextResponse.json({ error: "Facilitator role required" }, { status: 403 });

  let body: { action?: string; status?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = createServiceClient();
  try {
    if (body.action === "status") {
      const status = body.status as EventStatus;
      if (!STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      await setEventStatus(db, params.eventId, status);
      return NextResponse.json({ ok: true, status });
    }
    if (body.action === "announce") {
      await announce(db, m.orgId, params.eventId, body.message ?? "");
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
