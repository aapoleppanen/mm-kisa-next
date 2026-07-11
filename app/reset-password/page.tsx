"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import FootballLoader from "@/components/ui/football-loader";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Missing or invalid reset link");
      return;
    }
    setLoading(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Couldn't reset your password");
    } else {
      setDone(true);
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-slate-600 text-center">
        This reset link is missing or invalid. Request a new one from the
        sign-in page.
      </p>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">✅</div>
        <p className="text-sm text-slate-600">
          Your password has been reset.
        </p>
        <Button
          className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-bold h-11 hover-lift active-press"
          onClick={() => {
            router.push("/sign-in");
            router.refresh();
          }}
        >
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
      <div className="relative">
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
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
        {loading ? <FootballLoader size="sm" mode="inline" /> : "Reset password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen soccer-pitch-bg flex flex-col items-center justify-center p-4 gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl">⚽</span>
        <h1 className="text-3xl font-black text-primary uppercase tracking-wider">MM-Kisa</h1>
      </div>

      <div className="bg-white border border-border/60 rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 w-full max-w-md hover-lift">
        <h2 className="text-xl font-bold text-slate-800">Set a new password</h2>
        <Suspense fallback={<FootballLoader size="sm" mode="inline" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
