"use client";

import { ImageIcon } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { cn } from "@/lib/utils";

type GifResult = { id: string; preview: string; url: string };

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 280;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function GifPickerPanel({ onSelect }: { onSelect: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const swrKey = debouncedQuery
    ? `/api/gif-search?q=${encodeURIComponent(debouncedQuery)}`
    : "/api/gif-search";

  const { data, isLoading } = useSWR<{ results: GifResult[] }>(swrKey, fetcher);

  return (
    <div className="bg-white border border-border/80 rounded-xl shadow-lg overflow-hidden">
      <div className="p-2 border-b border-border/60">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search KLIPY"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-muted/60 rounded-lg px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/30"
        />
      </div>
      <div className="overflow-y-auto max-h-52">
        {isLoading ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-xs text-muted-foreground">Loading…</span>
          </div>
        ) : !data?.results.length ? (
          <div className="flex items-center justify-center h-16">
            <span className="text-xs text-muted-foreground">No results</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-px p-px bg-border/40">
            {data.results.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => onSelect(gif.url)}
                className="aspect-video overflow-hidden bg-muted hover:opacity-75 transition-opacity duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <img
                  src={gif.preview}
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function computePanelPosition(rect: DOMRect) {
  const margin = 8;
  const width = Math.min(PANEL_WIDTH, window.innerWidth - margin * 2);
  let left = rect.right - width;
  left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

  const spaceAbove = rect.top - margin;
  const spaceBelow = window.innerHeight - rect.bottom - margin;
  const openAbove = spaceAbove >= PANEL_HEIGHT || spaceAbove >= spaceBelow;

  const top = openAbove
    ? Math.max(margin, rect.top - PANEL_HEIGHT - 6)
    : rect.bottom + 6;

  return { top, left, width };
}

export default function GifPickerPopover({
  onSelect,
  active,
}: {
  onSelect: (url: string) => void;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    setPosition(computePanelPosition(buttonRef.current.getBoundingClientRect()));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function reposition() {
      if (!buttonRef.current) return;
      setPosition(computePanelPosition(buttonRef.current.getBoundingClientRect()));
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("mousedown", handleClick);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Add GIF"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "size-8 rounded-lg border flex items-center justify-center transition-colors duration-150",
          open || active
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border/80 text-muted-foreground hover:text-foreground hover:border-border bg-white"
        )}
      >
        <ImageIcon className="size-4" strokeWidth={1.75} />
      </button>
      {mounted && open && position && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[100]"
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          <GifPickerPanel
            onSelect={(url) => {
              onSelect(url);
              setOpen(false);
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
