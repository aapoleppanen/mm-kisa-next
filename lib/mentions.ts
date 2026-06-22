// Mentions are stored inline in comment text as `@[Display Name](userId)`.
// This keeps the canonical text self-contained while letting us extract the
// tagged user ids server-side (authoritative) and render chips client-side.

// userId is a cuid (alphanumeric); name may contain anything except the closing
// bracket. Non-greedy name match.
const MENTION_RE = /@\[([^\]]+)\]\(([a-zA-Z0-9_-]+)\)/g;

export type MentionSegment =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; userId: string };

/** Extract unique mentioned user ids from comment content. */
export function parseMentionIds(content: string): string[] {
  const ids: string[] = [];
  const re = new RegExp(MENTION_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (!ids.includes(m[2])) ids.push(m[2]);
  }
  return ids;
}

/** Split content into plain-text and mention segments for rendering. */
export function tokenizeMentions(content: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  const re = new RegExp(MENTION_RE.source, "g");
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const start = m.index;
    if (start > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, start) });
    }
    segments.push({ type: "mention", name: m[1], userId: m[2] });
    lastIndex = start + m[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return segments;
}

/** Build a mention token for insertion into the composer. */
export function mentionToken(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}

/** Render mention tokens as plain `@Name` for previews / notifications. */
export function stripMentions(content: string): string {
  return content.replace(MENTION_RE, (_, name) => `@${name}`);
}
