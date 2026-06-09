"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

type GifResult = { id: string; preview: string; url: string };

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
    <div className="bg-white border border-border rounded-2xl shadow-xl overflow-hidden">
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search KLIPY"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-sm text-muted-foreground">Loading…</span>
          </div>
        ) : !data?.results.length ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-sm text-muted-foreground">No GIFs found</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {data.results.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="aspect-video overflow-hidden rounded-lg hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <img
                  src={gif.preview}
                  alt=""
                  className="w-full h-full object-cover"
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

export default function GifPickerPopover({
  onSelect,
}: {
  onSelect: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-8 px-3 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 shadow-sm ${
          open
            ? "bg-primary text-white border-primary"
            : "border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary bg-white"
        }`}
      >
        GIF
      </button>
      {open && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 w-[min(380px,calc(100vw-2rem))] animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ maxWidth: 380 }}
        >
          <GifPickerPanel
            onSelect={(url) => {
              onSelect(url);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
