"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Session } from "@/auth";

const NAV_LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/matches", label: "Matches" },
  { href: "/winner", label: "Winner" },
  { href: "/top-scorer", label: "Top Scorer" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Header({ session, isAdmin }: { session: Session; isAdmin?: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...NAV_LINKS, { href: "/admin", label: "Admin" }] : NAV_LINKS;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden sm:flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-md border-b border-border/60 shadow-sm">
      <div className="flex items-center gap-6">
        <Link href="/matches" className="flex items-center gap-2 font-black text-primary tracking-wider uppercase text-base hover:scale-105 transition-transform duration-200">
          <span className="text-xl leading-none">⚽</span>
          <span>MM-Kisa '26</span>
        </Link>
        <nav className="flex items-center gap-1.5">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "rounded-xl font-semibold transition-all duration-200 active-press",
                    active 
                      ? "bg-primary text-white shadow-sm hover:bg-primary/90" 
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  )}
                >
                  {label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-bold text-slate-800">
            {session.user.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {session.user.email}
          </span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl border-border/80 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 hover-lift active-press"
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
        >
          Log out
        </Button>
      </div>
    </header>
  );
}
