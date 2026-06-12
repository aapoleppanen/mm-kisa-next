import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import EditProfileClient from "@/components/profile/edit-profile-client";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { email: session!.user.email },
  });

  if (!user) return <p>User not found.</p>;

  return <EditProfileClient user={JSON.parse(JSON.stringify(user))} />;
}
