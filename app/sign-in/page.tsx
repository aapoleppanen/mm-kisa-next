import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SignInButtons from "@/components/auth/sign-in-buttons";

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) redirect("/matches");

  return (
    <div className="min-h-screen soccer-pitch-bg flex flex-col items-center justify-center p-4 gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl">⚽</span>
        <h1 className="text-3xl font-black text-primary uppercase tracking-wider">MM-Kisa</h1>
      </div>
      
      <div className="bg-white border border-border/60 rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 w-full max-w-md hover-lift">
        <h2 className="text-xl font-bold text-slate-800">Sign in to continue</h2>
        <p className="text-xs text-muted-foreground -mt-2 mb-2 text-center">
          Place your predictions and follow the leaderboards
        </p>
        <SignInButtons />
      </div>
    </div>
  );
}
