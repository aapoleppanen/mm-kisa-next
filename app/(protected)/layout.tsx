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
      <main className="hidden sm:block pt-16 pb-6 w-[80vw] mx-auto">
        {children}
      </main>
      <main className="block sm:hidden pb-20">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </>
  );
}
