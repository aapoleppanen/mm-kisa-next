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

export default function Header({ session }: { session: Session }) {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 hidden sm:flex items-center justify-between px-4 py-3 bg-white border-b border-border shadow-sm">
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => (
          <Link key={href} href={href}>
            <Button
              variant={pathname === href ? "default" : "ghost"}
              size="sm"
            >
              {label}
            </Button>
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {session.user.name} ({session.user.email})
        </span>
        <Button variant="ghost" size="sm" onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}>
          Log out
        </Button>
      </div>
    </header>
  );
}
