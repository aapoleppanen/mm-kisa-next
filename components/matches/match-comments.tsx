"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { useSession } from "@/lib/auth-client";
import GifPicker from "./gif-picker";

const EMOJIS = ["⚽", "🔥", "❤️", "😂", "😮", "👍", "🎉", "😢"];

type ReactionGroup = { emoji: string; count: number; userReacted: boolean };
type CommentUser = { id: string; name: string | null; image: string | null };
type Comment = {
  id: string;
  content: string;
  gifUrl: string | null;
  createdAt: string;
  user: CommentUser;
  reactions: ReactionGroup[];
};

function EmojiPickerPopover({
  commentId,
  onReact,
}: {
  commentId: string;
  onReact: (id: string, emoji: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-5 h-5 rounded-full border border-border bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary text-xs flex items-center justify-center transition-colors leading-none"
        title="Add reaction"
      >
        +
      </button>
      {open && (
        <div className="absolute bottom-6 left-0 z-30 bg-white border border-border rounded-2xl shadow-xl p-2 flex gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(commentId, emoji); setOpen(false); }}
              className="text-base hover:scale-125 transition-transform p-0.5"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onReact,
  onDelete,
  currentUserId,
}: {
  comment: Comment;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}) {
  return (
    <li className="flex gap-2.5 items-start group">
      <Avatar className="h-7 w-7 shrink-0">
        {comment.user.image && (
          <AvatarImage src={cloudStorageLoader({ src: comment.user.image })} />
        )}
        <AvatarFallback className="text-xs bg-muted">
          {comment.user.name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-semibold text-foreground">{comment.user.name}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(comment.createdAt), "d.M HH:mm")}
          </span>
        </div>
        {comment.content && comment.content !== "📎" && (
          <p className="text-sm text-foreground break-words mt-0.5 leading-snug">
            {comment.content}
          </p>
        )}
        {comment.gifUrl && (
          <img
            src={comment.gifUrl}
            alt="gif"
            className="mt-1.5 rounded-xl max-h-36 max-w-full object-contain border border-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {comment.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(comment.id, r.emoji)}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-all ${
                r.userReacted
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-border text-foreground hover:border-primary/30"
              }`}
            >
              {r.emoji} <span className="font-medium ml-0.5">{r.count}</span>
            </button>
          ))}
          <EmojiPickerPopover commentId={comment.id} onReact={onReact} />
        </div>
      </div>
      {currentUserId === comment.user.id && (
        <button
          onClick={() => onDelete(comment.id)}
          className="text-xs text-muted-foreground hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
          title="Delete"
        >
          ✕
        </button>
      )}
    </li>
  );
}

export default function MatchComments({ matchId }: { matchId: number }) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/comments/${matchId}`)
      .then((r) => r.json())
      .then(({ comments }) => setComments(comments ?? []))
      .finally(() => setLoading(false));
  }, [matchId]);

  const handlePost = async () => {
    if (!text.trim() && !gifUrl) return;
    setPosting(true);
    const res = await fetch(`/api/comments/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() || "📎", gifUrl }),
    });
    setPosting(false);
    if (!res.ok) { toast.error("Failed to post comment"); return; }
    const { comment } = await res.json();
    setComments((prev) => [...prev, comment]);
    setText("");
    setGifUrl(null);
    setShowGifPicker(false);
  };

  const handleDelete = async (commentId: string) => {
    await fetch(`/api/comments/${matchId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!session) { toast.error("Sign in to react"); return; }
    const res = await fetch(`/api/reactions/${commentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) return;
    const { added } = await res.json();
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const existing = c.reactions.find((r) => r.emoji === emoji);
        if (existing) {
          return {
            ...c,
            reactions: c.reactions
              .map((r) =>
                r.emoji === emoji
                  ? { ...r, count: added ? r.count + 1 : r.count - 1, userReacted: added }
                  : r
              )
              .filter((r) => r.count > 0),
          };
        }
        if (!added) return c;
        return { ...c, reactions: [...c.reactions, { emoji, count: 1, userReacted: true }] };
      })
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-border p-3 flex flex-col gap-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Comments
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
      ) : (
        <ul className="flex flex-col gap-3 max-h-72 overflow-y-auto">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onReact={handleReaction}
              onDelete={handleDelete}
              currentUserId={session?.user.id}
            />
          ))}
        </ul>
      )}

      {session && (
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          {/* GIF picker panel */}
          {showGifPicker && (
            <GifPicker
              onSelect={(url) => { setGifUrl(url); setShowGifPicker(false); }}
              onClose={() => setShowGifPicker(false)}
            />
          )}

          {/* GIF preview */}
          {gifUrl && (
            <div className="relative inline-block w-fit">
              <img
                src={gifUrl}
                alt="gif"
                className="rounded-xl max-h-24 border border-border"
              />
              <button
                onClick={() => setGifUrl(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                placeholder="Write a comment…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handlePost();
                  }
                }}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-white placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary resize-none leading-snug"
              />
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => setShowGifPicker((v) => !v)}
                className={`h-8 px-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  showGifPicker
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-white"
                }`}
              >
                GIF
              </button>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={posting || (!text.trim() && !gifUrl)}
                className="h-8"
              >
                {posting ? "…" : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
