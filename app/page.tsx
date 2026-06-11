import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import loginPic from "@/assets/login.jpg";
import SignInButtons from "@/components/auth/sign-in-buttons";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) redirect("/matches");

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background image overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={loginPic}
          alt="stadium background"
          fill
          className="object-cover object-center brightness-[0.85] contrast-[1.05]"
          priority
        />
        {/* Subtle turf green gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-emerald-900/40 to-slate-900/40" />
      </div>

      {/* Modern glass container */}
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-6 hover-lift">
        <div className="flex flex-col items-center gap-2">
          <span className="text-4xl">🏆</span>
          <h1 className="text-3xl font-black text-primary uppercase tracking-wider text-center drop-shadow-sm leading-none mt-2">
            {"MM-Kisa '26"}
          </h1>
        </div>

        <div className="w-full h-px bg-border/40" />

        <div className="w-full flex flex-col items-center">
          <SignInButtons />
        </div>
      </div>
    </div>
  );
}
