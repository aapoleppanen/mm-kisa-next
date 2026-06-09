import { NextRequest, NextResponse } from "next/server";

type KlipyItem = {
  id?: number | string;
  slug?: string;
  type?: string;
  file?: { gif?: string; webp?: string };
  files?: { gif?: string; webp?: string };
};

function mapKlipyItem(item: KlipyItem) {
  const file = item.file ?? item.files;
  return {
    id: String(item.id ?? item.slug ?? ""),
    preview: file?.webp ?? file?.gif ?? "",
    url: file?.gif ?? file?.webp ?? "",
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
