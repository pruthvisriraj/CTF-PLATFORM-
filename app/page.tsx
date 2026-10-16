import Link from "next/link";
import { ShieldAlert, Users, Trophy, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  { icon: Users, title: "Join by code", text: "Learners sign in with a magic link, enter a join code, and form teams in seconds." },
  { icon: ShieldAlert, title: "Staged injects", text: "Scenario text, evidence files, and a question. A correct flag unlocks the next inject." },
  { icon: Trophy, title: "Live leaderboard", text: "Scores and progress update in real time for every team and for the facilitator." },
  { icon: Radio, title: "Facilitator control", text: "Start, pause, end, and push surprise announcements to all teams instantly." },
];

export default function Home() {
  return (
    <div className="container py-12 md:py-20">
      <section className="mx-auto max-w-3xl text-center space-y-6">
        <p className="text-sm font-medium text-primary uppercase tracking-wider">Incident response, as a game</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Tabletop exercises with CTF-style scoring</h1>
        <p className="text-lg text-muted-foreground">
          Run a ransomware tabletop where teams hunt through logs, decide under pressure, and see their score climb live.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link href="/join">Join with a code</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Facilitator sign in</Link>
          </Button>
        </div>
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="p-6 space-y-2">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.text}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
