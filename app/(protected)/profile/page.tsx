import { headers } from "next/headers";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cloudStorageLoader } from "@/utils/imageUtils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = await prisma.user.findUnique({
    where: { email: session!.user.email },
  });

  if (!user) return <p>User not found.</p>;

  return (
    <div className="p-4 space-y-4 max-w-md">
      <Link href="/profile/edit">
        <Button>Edit profile</Button>
      </Link>
      {user.image && (
        <div className="w-48 h-48 overflow-hidden rounded-xl">
          <img
            src={cloudStorageLoader({ src: user.image })}
            alt="profile"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <p><span className="font-semibold">Name:</span> {user.name}</p>
      <p><span className="font-semibold">Email:</span> {user.email}</p>
    </div>
  );
}
