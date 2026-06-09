import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignInButtons from "@/components/auth/sign-in-buttons";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) redirect("/matches");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-muted">
      <h1 className="text-3xl font-bold text-primary">MM-Kisa</h1>
      <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 w-full max-w-sm">
        <h2 className="text-xl font-semibold">Sign in to continue</h2>
        <SignInButtons />
      </div>
    </div>
  );
}
