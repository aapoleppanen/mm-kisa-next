"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { storageUrl } from "@/utils/imageUtils";
import { Upload, Loader2, User as UserIcon } from "lucide-react";
import FootballLoader from "@/components/ui/football-loader";

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
    <div className="py-6 max-w-md mx-auto px-4 space-y-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <UserIcon className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider">Edit Profile</h1>
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Update your avatar & username</p>
      </div>

      <div className="bg-white/95 border border-border/80 rounded-3xl p-6 shadow-xl space-y-5 hover-lift">
        {/* Avatar Upload block */}
        <div className="flex flex-col items-center gap-3">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Profile Photo</label>
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-2 border-border/80 p-0.5 bg-slate-50 flex items-center justify-center overflow-hidden shadow-inner">
              {avatarUrl ? (
                <img
                  src={storageUrl(avatarUrl)}
                  alt="avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="text-3xl text-slate-300">👤</div>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
          </div>
          
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
            className="rounded-xl border-slate-200 hover:bg-slate-50 shadow-sm active-press text-xs font-bold"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Upload Photo
          </Button>
        </div>

        <div className="w-full h-px bg-slate-100" />

        {/* Input Details */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Display Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-xl border-border/80 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200 font-semibold"
            />
          </div>

          <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Registered Email</span>
            <p className="text-sm font-semibold text-slate-700 truncate">{user.email}</p>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-2.5 pt-2">
          <Link href="/profile" className="flex-1">
            <Button variant="outline" className="w-full rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold active-press">
              Cancel
            </Button>
          </Link>
          <Button 
            onClick={handleSave} 
            disabled={saving || uploading}
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold hover-lift active-press"
          >
            {saving ? (
              <FootballLoader size="sm" mode="inline" />
            ) : (
              "Save Details"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
