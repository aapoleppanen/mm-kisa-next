"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import FootballLoader from "@/components/ui/football-loader";

type Mode = "signin" | "signup";

export default function SignInButtons() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mobilepayNumber, setMobilepayNumber] = useState<string | null>(null);
  const [showPayReminder, setShowPayReminder] = useState(false);

  useEffect(() => {
    fetch("/api/public/config")
      .then((r) => r.json())
      .then((d) => setMobilepayNumber(d.mobilepayNumber ?? null))
      .catch(() => {});
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const { error } = await signUp.email({
        email,
        password,
        name,
        callbackURL: "/matches",
      });
      if (error) {
        toast.error(error.message ?? "Sign up failed");
      } else {
        if (mobilepayNumber) {
          setShowPayReminder(true);
        } else {
          toast.success("Account created! Signing you in…");
          router.push("/matches");
          router.refresh();
        }
      }
    } else {
      const { error } = await signIn.email({
        email,
        password,
        callbackURL: "/matches",
      });
      if (error) {
        toast.error(error.message ?? "Invalid email or password");
      } else {
        router.push("/matches");
        router.refresh();
      }
    }

    setLoading(false);
  };

  if (showPayReminder && mobilepayNumber) {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm text-center">
        <div className="text-4xl">💸</div>
        <h3 className="text-lg font-bold text-slate-800">Remember to pay!</h3>
        <p className="text-sm text-slate-600">
          Send your entry fee via MobilePay to:
        </p>
        <div className="bg-primary/10 border border-primary/30 rounded-2xl px-6 py-3">
          <span className="text-2xl font-black text-primary tracking-widest">{mobilepayNumber}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Your account is created. You can start playing right away — payment is tracked separately by the admin.
        </p>
        <Button
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-11 hover-lift active-press"
          onClick={() => {
            router.push("/matches");
            router.refresh();
          }}
        >
          Got it, let&apos;s play!
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      {mode === "signup" && mobilepayNumber && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
          <span className="text-base leading-none mt-0.5">💳</span>
          <span>
            Entry fee via MobilePay to <strong>{mobilepayNumber}</strong> — you&apos;ll be reminded after sign-up.
          </span>
        </div>
      )}

      <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
        {mode === "signup" && (
          <Input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="rounded-xl border-border/80 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
          />
        )}
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="rounded-xl border-border/80 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
        />
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="pr-10 rounded-xl border-border/80 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-11 hover-lift active-press"
        >
          {loading ? (
            <FootballLoader size="sm" mode="inline" />
          ) : mode === "signin" ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-xs font-semibold text-primary hover:underline text-center transition-colors py-1"
      >
        {mode === "signin"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
