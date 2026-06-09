"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { useSession } from "@/lib/auth-client";
import GifPicker from "./gif-picker";
import { cn } from "@/lib/utils";

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
        className="w-6 h-6 rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-primary/10 hover:text-primary hover:border-primary/20 text-xs flex items-center justify-center transition-all duration-200 leading-none shadow-sm cursor-pointer"
        title="Add reaction"
      >
        +
      </button>
      {open && (
        <div className="absolute bottom-7 left-0 z-30 bg-white border border-border/80 rounded-2xl shadow-xl p-2.5 flex gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(commentId, emoji); setOpen(false); }}
              className="text-lg hover:scale-130 active:scale-95 transition-transform p-1 cursor-pointer"
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
    <li className="flex gap-3 items-start group bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:border-slate-200/80 transition-all duration-200">
      <Avatar className="h-8 w-8 shrink-0 border border-slate-100 shadow-sm">
        {comment.user.image && (
          <AvatarImage src={cloudStorageLoader({ src: comment.user.image })} />
        )}
        <AvatarFallback className="text-xs bg-emerald-50 text-primary font-bold">
          {comment.user.name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-bold text-slate-800">{comment.user.name}</span>
            <span className="text-[10px] text-slate-400">
              {format(new Date(comment.createdAt), "d.M. HH:mm")}
            </span>
          </div>
          {currentUserId === comment.user.id && (
            <button
              onClick={() => onDelete(comment.id)}
              className="text-[10px] text-slate-400 hover:text-red-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all cursor-pointer font-bold px-1"
              title="Delete comment"
            >
              ✕
            </button>
          )}
        </div>
        {comment.content && comment.content !== "📎" && (
          <p className="text-sm text-slate-700 break-words mt-1 leading-relaxed">
            {comment.content}
          </p>
        )}
        {comment.gifUrl && (
          <div className="mt-2 rounded-xl overflow-hidden border border-slate-100 max-w-fit shadow-sm bg-slate-50">
            <img
              src={comment.gifUrl}
              alt="gif"
              className="max-h-36 max-w-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {comment.reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => onReact(comment.id, r.emoji)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border transition-all duration-200 cursor-pointer active:scale-95",
                r.userReacted
                  ? "bg-emerald-50 border-primary/30 text-primary font-bold"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100/80"
              )}
            >
              <span>{r.emoji}</span>
              <span className="text-[10px] font-bold">{r.count}</span>
            </button>
          ))}
          <EmojiPickerPopover commentId={comment.id} onReact={onReact} />
        </div>
      </div>
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
    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Discussions
        </p>
        <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">
          {comments.length}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground italic px-1">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">No talk yet. Start the buzz!</p>
      ) : (
        <ul className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
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
        <div className="flex flex-col gap-2 border-t border-slate-200/60 pt-3 mt-1">
          {/* GIF picker panel */}
          {showGifPicker && (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <GifPicker
                onSelect={(url) => { setGifUrl(url); setShowGifPicker(false); }}
                onClose={() => setShowGifPicker(false)}
              />
            </div>
          )}

          {/* GIF preview */}
          {gifUrl && (
            <div className="relative inline-block w-fit rounded-xl overflow-hidden border border-slate-200 shadow-sm ml-1">
              <img
                src={gifUrl}
                alt="gif preview"
                className="max-h-24 object-contain"
              />
              <button
                onClick={() => setGifUrl(null)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-800/80 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                placeholder="Join the discussion... (Ctrl+Enter to post)"
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/80 resize-none leading-relaxed transition-all duration-200 shadow-inner"
              />
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={() => setShowGifPicker((v) => !v)}
                className={cn(
                  "h-8 px-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm",
                  showGifPicker
                    ? "bg-primary text-white border-primary"
                    : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary bg-white"
                )}
              >
                GIF
              </button>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={posting || (!text.trim() && !gifUrl)}
                className="h-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white px-3 hover-lift active-press"
              >
                {posting ? "..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
