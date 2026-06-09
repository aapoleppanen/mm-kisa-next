"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

type GifResult = { id: string; preview: string; url: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("football");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query || "football"), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const { data, isLoading } = useSWR<{ results: GifResult[] }>(
    `/api/gif-search?q=${encodeURIComponent(debouncedQuery)}`,
    fetcher
  );

  return (
    <div
      ref={containerRef}
      className="bg-white border border-border rounded-2xl shadow-xl overflow-hidden"
      style={{ width: "100%", maxWidth: 380 }}
    >
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search GIFs…"
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
