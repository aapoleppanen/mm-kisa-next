import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getConfig } from "@/lib/config";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";
import MaintenanceBanner from "@/components/layout/maintenance-banner";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/sign-in");

  const cfg = await getConfig();
  const isAdmin = (session.user as { role?: string }).role === "admin";

  return (
    <>
      {cfg.maintenanceMode && <MaintenanceBanner />}
      <Header session={session} isAdmin={isAdmin} />
      {/* Single render; responsive via CSS (was previously duplicated, mounting every page twice). */}
      <main className="pb-20 sm:pt-16 sm:pb-6 sm:w-[80vw] sm:mx-auto">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
