"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { useSession } from "@/lib/auth-client";

type CommentUser = { id: string; name: string | null; image: string | null };
type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
};

export default function MatchComments({ matchId }: { matchId: number }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/comments/${matchId}`)
      .then((r) => r.json())
      .then(({ comments }) => setComments(comments ?? []))
      .finally(() => setLoading(false));
  }, [matchId]);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    const res = await fetch(`/api/comments/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    setPosting(false);

    if (!res.ok) {
      toast.error("Failed to post comment");
      return;
    }

    const { comment } = await res.json();
    setComments((prev) => [...prev, comment]);
    setText("");
  };

  const handleDelete = async (commentId: string) => {
    await fetch(`/api/comments/${matchId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="w-full bg-white/90 rounded-2xl p-3 flex flex-col gap-3">
      <p className="text-sm font-semibold text-foreground">Comments</p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-2 items-start">
              <Avatar className="h-7 w-7 shrink-0">
                {c.user.image && (
                  <AvatarImage src={cloudStorageLoader({ src: c.user.image })} />
                )}
                <AvatarFallback>{c.user.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-semibold truncate">{c.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.createdAt), "d.M HH:mm")}
                  </span>
                </div>
                <p className="text-sm break-words">{c.content}</p>
              </div>
              {session?.user.id === c.user.id && (
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-muted-foreground hover:text-red-500 shrink-0"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {session && (
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={2}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handlePost}
            disabled={posting || !text.trim()}
            className="self-end"
          >
            {posting ? "Posting…" : "Post"}
          </Button>
        </div>
      )}
    </div>
  );
}
