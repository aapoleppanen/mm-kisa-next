import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Header from "@/components/layout/header";
import BottomNav from "@/components/layout/bottom-nav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/sign-in");

  return (
    <>
      <Header session={session} />
      <main className="hidden sm:block pt-16 pb-6 w-[80vw] mx-auto">
        {children}
      </main>
      <main className="block sm:hidden pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
