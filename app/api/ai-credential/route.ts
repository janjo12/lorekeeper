import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiApiCredentialForTask } from "@/app/dataloader";
import { getSession } from "@/lib/session";

const requestSchema = z.object({ apiId: z.uuid().optional() });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid AI API." }, { status: 400 });
  }

  try {
    const credential = await getAiApiCredentialForTask(session.userId, parsed.data.apiId);
    if (!credential) {
      return NextResponse.json({ error: "Saved AI API not found." }, { status: 404 });
    }
    return NextResponse.json(
      {
        provider: credential.provider,
        baseUrl: credential.base_url,
        apiKey: credential.apiKey,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof Error && /authenticate data/i.test(error.message)
        ? "This saved key was encrypted with a different server secret. Remove it and add it again."
        : "Lorekeeper could not decrypt this saved API key.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
