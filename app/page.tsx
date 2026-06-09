import { headers } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import loginPic from "@/assets/login.jpg";
import SignInButtons from "@/components/auth/sign-in-buttons";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) redirect("/matches");

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-end pb-32">
      <Image
        src={loginPic}
        alt="background"
        fill
        className="object-cover object-center"
        priority
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <h1 className="text-4xl font-bold text-[#26413c] uppercase tracking-widest text-center drop-shadow-md">
          EM-kisa veikkaus app!
        </h1>
        <SignInButtons />
      </div>
    </div>
  );
}
