"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { storageUrl } from "@/utils/imageUtils";
import { Upload, Loader2 } from "lucide-react";

export default function EditProfileClient({ user }: { user: User }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.image);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });

      if (!presignRes.ok) {
        const { error } = await presignRes.json();
        toast.error(error ?? "Failed to get upload URL");
        return;
      }

      const { uploadUrl, key } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        toast.error("Upload failed");
        return;
      }

      setAvatarUrl(key);
      toast.success("Photo uploaded!");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newName: name, avatar_url: avatarUrl }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Profile updated!");
      router.push("/profile");
      router.refresh();
    } else {
      toast.error("Failed to update profile");
    }
  };

  return (
    <div className="p-4 space-y-5 max-w-md">
      <h1 className="text-xl font-bold">Edit Profile</h1>

      <div className="flex flex-col items-start gap-2">
        <label className="text-sm font-medium">Profile photo</label>
        {avatarUrl && (
          <img
            src={storageUrl(avatarUrl)}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border-2 border-border"
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarUpload}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? "Uploading…" : "Upload photo"}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <p className="text-sm">
        <span className="font-medium">Email:</span> {user.email}
      </p>

      <div className="flex gap-2">
        <Link href="/profile">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
