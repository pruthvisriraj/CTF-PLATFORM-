import { NextResponse } from "next/server";
import { getEventMembership } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { revealHint } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { eventId?: string; injectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { eventId, injectId } = body;
  if (!eventId || !injectId) return NextResponse.json({ error: "eventId and injectId are required" }, { status: 400 });

  const m = await getEventMembership(eventId);
  if (!m) return NextResponse.json({ error: "Not signed in or not in this event" }, { status: 401 });
  if (m.role !== "learner" || !m.teamId) return NextResponse.json({ error: "Only team members can use hints" }, { status: 403 });

  const result = await revealHint(createServiceClient(), { orgId: m.orgId, teamId: m.teamId, eventId, injectId });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
