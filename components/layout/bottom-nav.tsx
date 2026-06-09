"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Trophy, Swords, Star, List, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/matches", label: "Matches", Icon: Swords },
  { href: "/winner", label: "Winner", Icon: Trophy },
  { href: "/top-scorer", label: "Scorer", Icon: Star },
  { href: "/leaderboard", label: "Board", Icon: List },
];

export default function BottomNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", Icon: Shield }]
    : NAV_ITEMS;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:hidden">
      <nav className="flex items-center justify-around py-2 px-1 bg-white/90 backdrop-blur-md border border-border/60 rounded-2xl shadow-xl">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 flex-1 relative rounded-xl transition-all duration-300 active:scale-90",
                active ? "text-primary" : "text-muted-foreground hover:text-slate-700"
              )}
            >
              {/* Highlight background pill for active state */}
              {active && (
                <span className="absolute inset-0 bg-primary/10 rounded-xl -z-10 scale-90 animate-pulse" />
              )}
              
              <Icon 
                size={20} 
                strokeWidth={active ? 2.5 : 1.75} 
                className={cn(
                  "transition-transform duration-300",
                  active ? "-translate-y-0.5 scale-110" : ""
                )}
              />
              <span className={cn(
                "text-[10px] tracking-wide mt-0.5 font-medium transition-all duration-300",
                active ? "font-bold scale-105" : "opacity-80"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
