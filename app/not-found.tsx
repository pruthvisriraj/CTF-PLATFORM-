import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container max-w-lg py-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted-foreground">That event or page does not exist, or you are not a member of it.</p>
      <Button asChild>
        <Link href="/join">Join an event</Link>
      </Button>
    </div>
  );
}
