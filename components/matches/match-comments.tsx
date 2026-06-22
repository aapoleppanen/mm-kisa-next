"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  UploadIcon,
  Loader2,
  MoreHorizontal,
  Plus,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cloudStorageLoader } from "@/utils/imageUtils";
import { useSession } from "@/lib/auth-client";
import GifPickerPopover from "./gif-picker";
import { storageUrl } from "@/utils/imageUtils";
import { cn } from "@/lib/utils";
import { tokenizeMentions, mentionToken } from "@/lib/mentions";

const REACTIONS = ["⚽", "👍", "😂", "🔥", "❤️", "😮", "🎉", "😢"];

type ReactionGroup = { emoji: string; count: number; userReacted: boolean };
type CommentUser = { id: string; name: string | null; image: string | null };

type MentionPick =
  | { locked: true }
  | { locked: false; none: true }
  | {
      locked: false;
      none: false;
      pickedResult: string | null;
      predHome: number | null;
      predAway: number | null;
      betAmount: number;
      awardedPoints: number;
    };
type MentionView = {
  userId: string;
  name: string | null;
  image: string | null;
  pick: MentionPick;
};
type MatchInfo = {
  locked: boolean;
  result: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  homeName: string;
  awayName: string;
  homeCrest: string;
  awayCrest: string;
};
type Comment = {
  id: string;
  content: string;
  gifUrl: string | null;
  createdAt: string;
  user: CommentUser;
  reactions: ReactionGroup[];
  mentions: MentionView[];
};
type SearchUser = { id: string; name: string | null; image: string | null };

function applyReactionToggle(
  comments: Comment[],
  commentId: string,
  emoji: string,
): Comment[] {
  return comments.map((c) => {
    if (c.id !== commentId) return c;
    const existing = c.reactions.find((r) => r.emoji === emoji);
    if (existing?.userReacted) {
      return {
        ...c,
        reactions: c.reactions
          .map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, userReacted: false }
              : r,
          )
          .filter((r) => r.count > 0),
      };
    }
    if (existing) {
      return {
        ...c,
        reactions: c.reactions.map((r) =>
          r.emoji === emoji
            ? { ...r, count: r.count + 1, userReacted: true }
            : r,
        ),
      };
    }
    return {
      ...c,
      reactions: [...c.reactions, { emoji, count: 1, userReacted: true }],
    };
  });
}

// Short team code, e.g. "Finland" → "FIN", "South Korea" → "SOU".
function teamAbbr(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, "");
  return (letters || name).slice(0, 3).toUpperCase();
}

function Flag({ crest, alt }: { crest: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={crest}
      alt={alt}
      className="inline-block h-3 w-[18px] object-contain align-text-bottom rounded-[2px]"
      loading="lazy"
      decoding="async"
    />
  );
}

// The bracketed pick shown inline after a tag: flag + code, a scoreline, or a
// lock/dash when not revealed.
function PickPill({ pick, match }: { pick: MentionPick; match: MatchInfo | null }) {
  if (pick.locked) return <span className="text-muted-foreground">🔒</span>;
  if (pick.none) return <span className="text-muted-foreground">—</span>;

  if (pick.predHome != null && pick.predAway != null) {
    return <span className="font-bold tabular-nums text-slate-700">{pick.predHome}–{pick.predAway}</span>;
  }

  if (pick.pickedResult === "DRAW") {
    return <span className="font-semibold text-slate-700">🤝 X</span>;
  }
  const isHome = pick.pickedResult === "HOME_TEAM";
  const crest = match ? (isHome ? match.homeCrest : match.awayCrest) : null;
  const name = match ? (isHome ? match.homeName : match.awayName) : "?";
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
      {crest && <Flag crest={crest} alt={name} />}
      {teamAbbr(name)}
    </span>
  );
}

// Mention rendered inline as "@name (pick)".
function MentionChip({ mention, match }: { mention: MentionView; match: MatchInfo | null }) {
  return (
    <span className="whitespace-nowrap">
      <span className="font-semibold text-primary">@{mention.name ?? "user"}</span>{" "}
      <span className="text-slate-500">(<PickPill pick={mention.pick} match={match} />)</span>
    </span>
  );
}

function CommentBody({ comment, match }: { comment: Comment; match: MatchInfo | null }) {
  const segments = tokenizeMentions(comment.content);
  const mentionByText = new Map(comment.mentions.map((m) => [m.userId, m]));
  return (
    <p className="text-sm text-foreground/90 break-words mt-0.5 leading-snug text-pretty">
      {segments.map((seg, i) => {
        if (seg.type === "text") return <span key={i}>{seg.value}</span>;
        const mention = mentionByText.get(seg.userId);
        if (!mention) return <span key={i} className="font-semibold text-primary">@{seg.name}</span>;
        return <MentionChip key={i} mention={mention} match={match} />;
      })}
    </p>
  );
}

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
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Add reaction"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "size-6 rounded-full border flex items-center justify-center transition-colors duration-150",
          open
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border/80 bg-white text-muted-foreground hover:text-foreground hover:border-border",
        )}
      >
        <Plus className="size-3" strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute bottom-7 left-0 z-30 bg-white border border-border/80 rounded-xl shadow-md p-1.5 flex gap-0.5">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(commentId, emoji);
                setOpen(false);
              }}
              className="size-8 rounded-lg text-base hover:bg-muted transition-colors duration-150"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentMenu({ onDelete }: { onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto shrink-0">
      <button
        type="button"
        aria-label="Comment options"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.75} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-28 bg-white border border-border/80 rounded-lg shadow-md py-1">
          <button
            type="button"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="w-full px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/5 transition-colors duration-150"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  match,
  onReact,
  onDelete,
  currentUserId,
}: {
  comment: Comment;
  match: MatchInfo | null;
  onReact: (id: string, emoji: string) => void;
  onDelete: (id: string) => void;
  currentUserId?: string;
}) {
  const hasText = Boolean(comment.content?.trim()) && comment.content !== "📎";

  return (
    <li className="flex gap-2.5 items-start py-2.5 border-b border-border/50 last:border-0">
      <Avatar className="size-7 shrink-0">
        {comment.user.image && (
          <AvatarImage src={cloudStorageLoader({ src: comment.user.image })} />
        )}
        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
          {comment.user.name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {comment.user.name}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {format(new Date(comment.createdAt), "d.M. HH:mm")}
          </span>
          {currentUserId === comment.user.id && (
            <CommentMenu onDelete={() => onDelete(comment.id)} />
          )}
        </div>
        {hasText && <CommentBody comment={comment} match={match} />}
        {comment.gifUrl && (
          <div className="mt-1.5 rounded-lg overflow-hidden border border-border/60 max-w-fit bg-muted/30">
            <img
              src={comment.gifUrl}
              alt=""
              className="max-h-32 max-w-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1 mt-1.5">
          {comment.reactions.map((r) => (
            <button
              key={r.emoji}
              type="button"
              onClick={() => onReact(comment.id, r.emoji)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors duration-150",
                r.userReacted
                  ? "bg-primary/10 border-primary/25 text-primary"
                  : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted",
              )}
            >
              <span>{r.emoji}</span>
              <span className="tabular-nums text-[10px] font-medium">
                {r.count}
              </span>
            </button>
          ))}
          <EmojiPickerPopover commentId={comment.id} onReact={onReact} />
        </div>
      </div>
    </li>
  );
}

export default function MatchComments({
  matchId,
  onCountChange,
}: {
  matchId: number;
  onCountChange?: (count: number) => void;
}) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [text, setText] = useState("");
  // Mentions the user picked from the autocomplete; converted to tokens on post.
  const [mentions, setMentions] = useState<{ name: string; userId: string }[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [results, setResults] = useState<SearchUser[]>([]);

  useEffect(() => {
    fetch(`/api/comments/${matchId}`)
      .then((r) => r.json())
      .then(({ comments, match }) => {
        setComments(comments ?? []);
        setMatch(match ?? null);
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    onCountChange?.(comments.length);
  }, [comments.length, onCountChange]);

  // Debounced user search when an @token is active.
  useEffect(() => {
    if (mentionQuery == null) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`)
        .then((r) => r.json())
        .then(({ users }) => setResults(users ?? []))
        .catch(() => setResults([]));
    }, 180);
    return () => clearTimeout(t);
  }, [mentionQuery]);

  // Detect an in-progress @token immediately before the caret.
  const syncMentionTrigger = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@(\w*)$/);
    if (m) {
      setMentionQuery(m[1]);
      setMentionStart(caret - m[1].length - 1); // index of the '@'
    } else {
      setMentionQuery(null);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    syncMentionTrigger(value, e.target.selectionStart ?? value.length);
  };

  const selectMention = (user: SearchUser) => {
    const name = user.name ?? "user";
    const caret = textareaRef.current?.selectionStart ?? text.length;
    const next = `${text.slice(0, mentionStart)}@${name} ${text.slice(caret)}`;
    setText(next);
    setMentions((prev) => [...prev, { name, userId: user.id }]);
    setMentionQuery(null);
    setResults([]);
    textareaRef.current?.focus();
  };

  // Replace each visible "@Name" with its stored token. Tokens (@[Name](id))
  // don't contain a bare "@Name", so sequential first-match replacement is safe.
  const toStoredContent = () => {
    let out = text.trim();
    // Longest names first so "@Sammy" converts before "@Sam" can match its prefix.
    const ordered = [...mentions].sort((a, b) => b.name.length - a.name.length);
    for (const m of ordered) {
      const needle = `@${m.name}`;
      const idx = out.indexOf(needle);
      if (idx === -1) continue;
      out = out.slice(0, idx) + mentionToken(m.name, m.userId) + out.slice(idx + needle.length);
    }
    return out;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          folder: "comments",
        }),
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
      setImageKey(key);
      setImagePreview(URL.createObjectURL(file));
      setGifUrl(null);
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    setImageKey(null);
    setImagePreview(null);
  };

  const handlePost = async () => {
    if (!text.trim() && !gifUrl && !imageKey) return;
    setPosting(true);
    const res = await fetch(`/api/comments/${matchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: toStoredContent(),
        gifUrl: gifUrl ?? (imageKey ? storageUrl(imageKey) : null),
      }),
    });
    setPosting(false);
    if (!res.ok) {
      toast.error("Couldn't post comment");
      return;
    }
    const { comment } = await res.json();
    setComments((prev) => [...prev, comment]);
    setText("");
    setMentions([]);
    setGifUrl(null);
    clearImage();
  };

  const handleDelete = async (commentId: string) => {
    const prev = comments;
    setComments((c) => c.filter((x) => x.id !== commentId));
    const res = await fetch(`/api/comments/${matchId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    if (!res.ok) {
      setComments(prev);
      toast.error("Couldn't delete comment");
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!session) {
      toast.error("Sign in to react");
      return;
    }

    const prev = comments;
    setComments((c) => applyReactionToggle(c, commentId, emoji));

    const res = await fetch(`/api/reactions/${commentId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (!res.ok) {
      setComments(prev);
      toast.error("Couldn't react");
    }
  };

  return (
    <div className="w-full bg-white border border-border/60 rounded-xl">
      <div className="px-3">
        {loading ? (
          <p className="text-xs text-muted-foreground py-3">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No comments yet.</p>
        ) : (
          <ul className="max-h-64 overflow-y-auto -mx-3 px-3">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                match={match}
                onReact={handleReaction}
                onDelete={handleDelete}
                currentUserId={session?.user.id}
              />
            ))}
          </ul>
        )}
      </div>

      {session && (
        <div className="border-t border-border/50 p-3 space-y-2">
          {(gifUrl || imagePreview) && (
            <div className="relative inline-block rounded-lg overflow-hidden border border-border/60">
              <img
                src={imagePreview ?? gifUrl!}
                alt=""
                className="max-h-20 object-contain bg-muted/30"
              />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => {
                  setGifUrl(null);
                  clearImage();
                }}
                className="absolute top-1 right-1 size-5 rounded-full bg-foreground/70 hover:bg-destructive text-white flex items-center justify-center transition-colors duration-150"
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              {/* @mention autocomplete dropdown */}
              {mentionQuery != null && results.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 z-40 w-56 bg-white border border-border/80 rounded-xl shadow-lg overflow-hidden">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectMention(u)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors duration-150"
                    >
                      <Avatar className="size-6 shrink-0">
                        {u.image && <AvatarImage src={cloudStorageLoader({ src: u.image })} />}
                        <AvatarFallback className="text-[9px] bg-muted text-muted-foreground font-medium">
                          {u.name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-700 truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                ref={textareaRef}
                placeholder="Add a comment… use @ to tag someone"
                value={text}
                onChange={handleTextChange}
                onKeyUp={(e) =>
                  syncMentionTrigger(
                    (e.target as HTMLTextAreaElement).value,
                    (e.target as HTMLTextAreaElement).selectionStart ?? 0
                  )
                }
                maxLength={500}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handlePost();
                  }
                }}
                className="w-full border border-border/60 rounded-lg px-3 py-2 text-sm bg-white placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 resize-none leading-snug"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                type="button"
                aria-label="Upload image"
                disabled={uploading || Boolean(gifUrl)}
                onClick={() => imageInputRef.current?.click()}
                className={cn(
                  "size-8 rounded-lg border flex items-center justify-center transition-colors duration-150",
                  imageKey
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border/80 bg-white text-muted-foreground hover:text-foreground hover:border-border",
                  (uploading || Boolean(gifUrl)) &&
                    "opacity-40 cursor-not-allowed",
                )}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UploadIcon className="size-4" strokeWidth={1.75} />
                )}
              </button>
              <GifPickerPopover
                onSelect={(url) => {
                  setGifUrl(url);
                  clearImage();
                }}
                active={Boolean(gifUrl)}
              />
              <Button
                size="icon"
                aria-label="Post comment"
                onClick={handlePost}
                disabled={posting || (!text.trim() && !gifUrl && !imageKey)}
                className="size-8 rounded-lg"
              >
                {posting ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2} />
                ) : (
                  <Send className="size-4" strokeWidth={1.75} />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
