"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Trophy, Swords, Star, List } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/matches", label: "Matches", Icon: Swords },
  { href: "/winner", label: "Winner", Icon: Trophy },
  { href: "/top-scorer", label: "Scorer", Icon: Star },
  { href: "/leaderboard", label: "Board", Icon: List },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden border-t border-border bg-white">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors",
              active ? "text-primary font-semibold" : "text-muted-foreground"
            )}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
