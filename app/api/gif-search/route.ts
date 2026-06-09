import { NextRequest, NextResponse } from "next/server";

type KlipyFormat = { url?: string; width?: number; height?: number; size?: number };
type KlipyFileTier = { gif?: KlipyFormat; webp?: KlipyFormat };
type KlipyFile = {
  hd?: KlipyFileTier;
  md?: KlipyFileTier;
  sm?: KlipyFileTier;
  xs?: KlipyFileTier;
  gif?: string | KlipyFormat;
  webp?: string | KlipyFormat;
};

type KlipyItem = {
  id?: number | string;
  slug?: string;
  type?: string;
  file?: KlipyFile;
  files?: KlipyFile;
};

function formatUrl(format?: string | KlipyFormat): string {
  if (!format) return "";
  return typeof format === "string" ? format : (format.url ?? "");
}

function mapKlipyItem(item: KlipyItem) {
  const file = item.file ?? item.files;
  if (!file) {
    return { id: String(item.id ?? item.slug ?? ""), preview: "", url: "" };
  }

  const preview =
    formatUrl(file.sm?.webp) ||
    formatUrl(file.xs?.webp) ||
    formatUrl(file.sm?.gif) ||
    formatUrl(file.webp);

  const url =
    formatUrl(file.md?.gif) ||
    formatUrl(file.hd?.gif) ||
    formatUrl(file.sm?.gif) ||
    formatUrl(file.gif);

  return {
    id: String(item.id ?? item.slug ?? ""),
    preview,
    url,
  };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const key = process.env.KLIPY_API_KEY;

  if (!key) {
    return NextResponse.json({ results: [] });
  }

  const useSearch = Boolean(q);
  const endpoint = useSearch
    ? `https://api.klipy.com/api/v1/${key}/gifs/search`
    : `https://api.klipy.com/api/v1/${key}/gifs/trending`;

  const url = new URL(endpoint);
  if (useSearch) url.searchParams.set("q", q!);
  url.searchParams.set("per_page", "24");
  url.searchParams.set("content_filter", "medium");
  url.searchParams.set("locale", "fi_FI");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    const items: KlipyItem[] = data.data?.data ?? [];
    const results = items
      .filter((item) => item.type !== "ad")
      .map(mapKlipyItem)
      .filter((item) => item.url);
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
