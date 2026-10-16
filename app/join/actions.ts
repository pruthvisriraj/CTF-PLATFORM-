"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LookupState {
  code: string;
  error: string;
  event: { id: string; name: string; status: string; scenarioTitle: string; teams: { id: string; name: string }[] } | null;
}

export async function lookupEvent(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { code, error: "Enter a join code.", event: null };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("lookup_event", { p_code: code });
  if (error) return { code, error: error.message, event: null };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { code, error: "No active event with that code.", event: null };
  return {
    code,
    error: "",
    event: {
      id: row.event_id,
      name: row.event_name,
      status: row.status,
      scenarioTitle: row.scenario_title,
      teams: (row.teams ?? []) as { id: string; name: string }[],
    },
  };
}

export interface JoinState {
  error: string;
}

export async function joinTeam(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const code = String(formData.get("code") ?? "").trim();
  const teamName = String(formData.get("team") ?? "").trim();
  if (!teamName) return { error: "Pick a team or enter a new team name." };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("join_event", { p_code: code, p_team_name: teamName });
  if (error) return { error: error.message };
  redirect(`/play/${data as string}`);
}
