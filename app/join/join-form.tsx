"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Users, ArrowRight } from "lucide-react";
import { lookupEvent, joinTeam, type LookupState, type JoinState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const initialLookup: LookupState = { code: "", error: "", event: null };
const initialJoin: JoinState = { error: "" };

function Pending({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}

export function JoinForm() {
  const [lookup, lookupAction] = useFormState(lookupEvent, initialLookup);
  const [join, joinAction] = useFormState(joinTeam, initialJoin);
  const [selected, setSelected] = useState<string>("");
  const [newTeam, setNewTeam] = useState("");

  if (!lookup.event) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Join an exercise</CardTitle>
          <CardDescription>Enter the join code from your facilitator.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={lookupAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Join code</Label>
              <Input
                id="code"
                name="code"
                defaultValue={lookup.code}
                placeholder="DEMO2026"
                autoCapitalize="characters"
                autoComplete="off"
                className="text-lg tracking-widest uppercase"
                required
              />
            </div>
            {lookup.error && (
              <Alert variant="destructive">
                <AlertDescription>{lookup.error}</AlertDescription>
              </Alert>
            )}
            <Pending label="Find event" pendingLabel="Looking up..." />
          </form>
        </CardContent>
      </Card>
    );
  }

  const ev = lookup.event;
  const teamValue = selected === "__new__" ? newTeam : selected;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{ev.name}</CardTitle>
          <Badge variant={ev.status === "live" ? "default" : "secondary"}>{ev.status}</Badge>
        </div>
        <CardDescription>Scenario: {ev.scenarioTitle}. Pick a team or create a new one.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={joinAction} className="space-y-4">
          <input type="hidden" name="code" value={lookup.code} />
          <input type="hidden" name="team" value={teamValue} />
          <div className="grid gap-2">
            {ev.teams.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setSelected(t.id === selected ? "" : t.name)}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors hover:bg-accent",
                  selected === t.name && "border-primary bg-accent"
                )}
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{t.name}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelected("__new__")}
              className={cn(
                "rounded-md border border-dashed px-4 py-3 text-left text-muted-foreground transition-colors hover:bg-accent",
                selected === "__new__" && "border-primary bg-accent text-foreground"
              )}
            >
              + Create a new team
            </button>
          </div>
          {selected === "__new__" && (
            <div className="space-y-2">
              <Label htmlFor="newTeam">Team name</Label>
              <Input id="newTeam" value={newTeam} onChange={(e) => setNewTeam(e.target.value)} maxLength={40} placeholder="Red Hawks" autoFocus />
            </div>
          )}
          {join.error && (
            <Alert variant="destructive">
              <AlertDescription>{join.error}</AlertDescription>
            </Alert>
          )}
          <Pending label="Join and play" pendingLabel="Joining..." />
        </form>
      </CardContent>
    </Card>
  );
}
