import { redirect } from "next/navigation";
import { getIdentity } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const id = await getIdentity();
  if (id) redirect(searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/join");
  return (
    <div className="container max-w-md py-12">
      <LoginForm next={searchParams.next ?? "/join"} />
    </div>
  );
}
