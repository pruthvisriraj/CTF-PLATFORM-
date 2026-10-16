"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Mail } from "lucide-react";
import { sendMagicLink, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initial: LoginState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      <Mail className="h-4 w-4" />
      {pending ? "Sending..." : "Send magic link"}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState(sendMagicLink, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>No password. We email you a one-time sign-in link.</CardDescription>
      </CardHeader>
      <CardContent>
        {state.ok ? (
          <Alert variant="success">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
            </div>
            {state.message && (
              <Alert variant="destructive">
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <SubmitButton />
          </form>
        )}
      </CardContent>
    </Card>
  );
}
