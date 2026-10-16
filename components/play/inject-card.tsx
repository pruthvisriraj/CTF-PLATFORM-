"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lightbulb, Lock, Send } from "lucide-react";
import type { LearnerInject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EvidenceViewer } from "./evidence-viewer";
import { cn } from "@/lib/utils";

interface Props {
  eventId: string;
  inject: LearnerInject;
  live: boolean;
}

type Feedback = { kind: "ok" | "wrong" | "error"; text: string } | null;

export function InjectCard({ eventId, inject, live }: Props) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [hint, setHint] = useState<string | null>(inject.hint);
  const [hintBusy, setHintBusy] = useState(false);
  const [open, setOpen] = useState(inject.is_current);

  async function submit(value: string) {
    if (!value.trim() || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, injectId: inject.id, answer: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ kind: "error", text: data.error ?? "Submission failed." });
      } else if (data.correct) {
        setFeedback({ kind: "ok", text: `Correct! +${data.points} points.` });
        router.refresh();
      } else {
        setFeedback({ kind: "wrong", text: "Not quite. Check the evidence again." });
      }
    } catch {
      setFeedback({ kind: "error", text: "Network error. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function revealHint() {
    if (hintBusy) return;
    const penalty = inject.hint_penalty;
    if (penalty > 0 && !window.confirm(`Reveal the hint for -${penalty} points? This is charged once per team.`)) return;
    setHintBusy(true);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, injectId: inject.id }),
      });
      const data = await res.json();
      if (!res.ok) setFeedback({ kind: "error", text: data.error ?? "Could not reveal hint." });
      else setHint(data.hint);
    } finally {
      setHintBusy(false);
    }
  }

  return (
    <Card className={cn(inject.is_current && "border-primary/60", inject.solved && "opacity-90")}>
      <CardHeader className="cursor-pointer select-none" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {inject.solved ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {inject.order}
              </span>
            )}
            <CardTitle className="truncate text-lg">{inject.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={inject.solved ? "secondary" : "default"}>{inject.points} pts</Badge>
          </div>
        </div>
        <CardDescription>{inject.solved ? "Solved" : inject.is_current ? "Current inject" : ""}</CardDescription>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <p className="whitespace-pre-line leading-relaxed">{inject.body}</p>
          {inject.evidence_url && <EvidenceViewer url={inject.evidence_url} />}

          {hint && (
            <Alert variant="warning">
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>{hint}</AlertDescription>
            </Alert>
          )}

          {inject.solved ? null : !live ? (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>The event is not live. Submissions are paused.</AlertDescription>
            </Alert>
          ) : inject.type === "mcq" && inject.options ? (
            <div className="grid gap-2">
              {inject.options.map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  variant="outline"
                  className="h-auto justify-start whitespace-normal py-3 text-left"
                  disabled={busy}
                  onClick={() => submit(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          ) : (
            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submit(answer);
              }}
            >
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Enter your answer"
                autoComplete="off"
                maxLength={500}
                className="font-mono"
              />
              <Button type="submit" disabled={busy || !answer.trim()}>
                <Send className="h-4 w-4" />
                {busy ? "Checking..." : "Submit"}
              </Button>
            </form>
          )}

          {feedback && (
            <Alert variant={feedback.kind === "ok" ? "success" : feedback.kind === "wrong" ? "destructive" : "default"}>
              <AlertDescription>{feedback.text}</AlertDescription>
            </Alert>
          )}

          {!inject.solved && live && inject.hint_penalty >= 0 && !hint && inject.type !== "mcq" && (
            <Button type="button" variant="ghost" size="sm" onClick={revealHint} disabled={hintBusy}>
              <Lightbulb className="h-4 w-4" />
              {hintBusy ? "Revealing..." : `Reveal hint (-${inject.hint_penalty} pts)`}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
