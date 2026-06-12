import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";

// Per-request memoized session lookup. Several server components (layout + page)
// need the session in one render; cache() collapses them to a single DB query.
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
