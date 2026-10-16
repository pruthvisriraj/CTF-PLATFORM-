import { NextResponse } from "next/server";
import { getEventMembership } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { submitAnswer } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { eventId?: string; injectId?: string; answer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { eventId, injectId, answer } = body;
  if (!eventId || !injectId || typeof answer !== "string") {
    return NextResponse.json({ error: "eventId, injectId and answer are required" }, { status: 400 });
  }

  const m = await getEventMembership(eventId);
  if (!m) return NextResponse.json({ error: "Not signed in or not in this event" }, { status: 401 });
  if (m.role !== "learner" || !m.teamId) return NextResponse.json({ error: "Only team members can submit" }, { status: 403 });

  const result = await submitAnswer(createServiceClient(), {
    userId: m.userId,
    orgId: m.orgId,
    teamId: m.teamId,
    eventId,
    injectId,
    answer,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
