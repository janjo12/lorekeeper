import { getSession, getSupabaseAuthTokens, setSupabaseAuthTokens } from "@/lib/session";
import { refreshAuthSession } from "@/app/dataloader";

export async function GET() {
  const session = await getSession();
  const tokens = await getSupabaseAuthTokens();
  if (!session || !tokens) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  if (!url || !publishableKey) {
    return Response.json({ error: "Realtime is not configured." }, { status: 503 });
  }

  try {
    const refreshed = await refreshAuthSession(tokens.accessToken, tokens.refreshToken);
    await setSupabaseAuthTokens(refreshed);
    return Response.json(
      { accessToken: refreshed.accessToken, url, publishableKey },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Realtime authentication expired." }, { status: 401 });
  }
}
