import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getIdentity } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const id = await getIdentity();
  return (
    <header className="border-b bg-card/60 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <span>Tabletop CTF</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {id ? (
            <>
              <span className="hidden sm:inline text-muted-foreground truncate max-w-[200px]">{id.email}</span>
              <Button asChild variant="secondary" size="sm">
                <Link href="/join">Join</Link>
              </Button>
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
