import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { roundNumber } from "@/utils/numberUtils";
import { Trophy, Settings, Star, Coins } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { email: session!.user.email },
    include: {
      winnerPick: true,
      topScorerPick: true,
    }
  });

  if (!user) return <p className="text-center p-8">User not found.</p>;

  return (
    <div className="py-6 max-w-md mx-auto px-4 space-y-6">
      {/* FIFA Player Card Style Profile */}
      <div className="relative bg-white/95 border border-border/80 rounded-3xl shadow-xl overflow-hidden hover-lift flex flex-col items-center p-6 text-center">
        {/* Golden trophy overlay background shape */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-slate-900">
          <Trophy size={200} />
        </div>
        
        {/* Avatar container with gold crown border */}
        <div className="relative mt-2 mb-4">
          <div className="w-28 h-28 rounded-full border-4 border-amber-400 p-1 bg-white shadow-md overflow-hidden flex items-center justify-center">
            {user.image ? (
              <img
                src={cloudStorageLoader({ src: user.image })}
                alt="profile photo"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="text-4xl text-slate-300">👤</div>
            )}
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-1 text-[10px] leading-none font-bold border-2 border-white shadow">
            PRO
          </span>
        </div>

        {/* User identification */}
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-wide leading-tight">{user.name}</h2>
          <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
        </div>

        <div className="w-full h-px bg-slate-100 my-4" />

        {/* Player Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 w-full mb-5">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-1">
            <Trophy className="h-4 w-4 text-emerald-600" />
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Score</span>
            <span className="text-lg font-black text-slate-800 font-mono leading-none mt-0.5">
              {roundNumber(user.points)}
            </span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-1">
            <Coins className="h-4 w-4 text-amber-500" />
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider leading-none">Remaining</span>
            <span className="text-lg font-black text-slate-800 font-mono leading-none mt-0.5">
              {roundNumber(user.remainingCredits)}
            </span>
          </div>
        </div>

        {/* Outright Bets summary */}
        <div className="w-full space-y-2 mb-6 text-left">
          <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-100/50 rounded-xl text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              🏆 Champion Pick:
            </span>
            <span className="font-black text-slate-700">
              {user.winnerPick?.name ?? "Not picked"}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50/70 border border-slate-100/50 rounded-xl text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1">
              ⭐ Golden Boot Pick:
            </span>
            <span className="font-black text-slate-700">
              {user.topScorerPick?.name ?? "Not picked"}
            </span>
          </div>
        </div>

        {/* Actions */}
        <Link href="/profile/edit" className="w-full">
          <Button variant="outline" className="w-full rounded-2xl border-primary/30 text-primary font-bold hover:bg-primary/5 active-press">
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile Details
          </Button>
        </Link>
      </div>
    </div>
  );
}
