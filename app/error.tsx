"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const configMissing = /SUPABASE|supabaseUrl|supabaseKey/i.test(error.message);
  return (
    <div className="container max-w-lg py-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        {configMissing
          ? "Supabase environment variables are missing. See docs/DEPLOY.md."
          : error.message || "An unexpected error occurred."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
