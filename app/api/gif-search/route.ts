import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "football";
  const key = process.env.TENOR_API_KEY;

  if (!key) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://tenor.googleapis.com/v2/search");
  url.searchParams.set("q", q);
  url.searchParams.set("key", key);
  url.searchParams.set("limit", "24");
  url.searchParams.set("media_filter", "gif,tinygif");
  url.searchParams.set("contentfilter", "medium");

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    return NextResponse.json({
      results: (data.results ?? []).map((r: {
        id: string;
        media_formats?: { tinygif?: { url: string }; gif?: { url: string } };
      }) => ({
        id: r.id,
        preview: r.media_formats?.tinygif?.url ?? "",
        url: r.media_formats?.gif?.url ?? "",
      })),
    });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
