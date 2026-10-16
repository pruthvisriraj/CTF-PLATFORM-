/**
 * Auth helpers. All identity lookups live here so SSO / LTI launch can be
 * added later without touching pages or API routes.
 */
import { createClient, createServiceClient } from "./supabase/server";

export type Role = "learner" | "facilitator";

export interface Identity {
  userId: string;
  email: string | null;
}

export interface EventMembership extends Identity {
  orgId: string;
  teamId: string | null;
  role: Role;
}

export async function getIdentity(): Promise<Identity | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { userId: user.id, email: user.email ?? null };
}

export async function requireIdentity(): Promise<Identity> {
  const id = await getIdentity();
  if (!id) throw new Error("UNAUTHENTICATED");
  return id;
}

/**
 * Resolves the caller's membership for an event: their team (learner) or a
 * facilitator row on the event's org. Uses the service role so the lookup
 * is not subject to the caller's RLS view, but still keyed on the verified
 * auth user id.
 */
export async function getEventMembership(eventId: string): Promise<EventMembership | null> {
  const id = await getIdentity();
  if (!id) return null;
  const db = createServiceClient();

  const { data: event } = await db.from("events").select("id, org_id").eq("id", eventId).maybeSingle();
  if (!event) return null;

  const { data: rows } = await db
    .from("members")
    .select("team_id, role, teams(event_id)")
    .eq("user_id", id.userId)
    .eq("org_id", event.org_id);

  if (!rows) return null;
  const facilitator = rows.find((r) => r.role === "facilitator");
  if (facilitator) return { ...id, orgId: event.org_id, teamId: null, role: "facilitator" };

  const learner = rows.find((r) => {
    const t = r.teams as unknown as { event_id: string } | { event_id: string }[] | null;
    const ev = Array.isArray(t) ? t[0]?.event_id : t?.event_id;
    return r.role === "learner" && ev === eventId;
  });
  if (learner) return { ...id, orgId: event.org_id, teamId: learner.team_id, role: "learner" };
  return null;
}

export async function requireFacilitator(eventId: string): Promise<EventMembership> {
  const m = await getEventMembership(eventId);
  if (!m || m.role !== "facilitator") throw new Error("FORBIDDEN");
  return m;
}
