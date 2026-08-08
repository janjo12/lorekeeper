import { z } from "zod";
import { completePasswordReset } from "@/app/dataloader";

const requestSchema = z.object({
  password: z.string().min(8).max(72),
});

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return Response.json({ error: "This reset link is invalid or expired." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Password must be between 8 and 72 characters." },
      { status: 400 },
    );
  }

  try {
    await completePasswordReset(accessToken, parsed.data.password);
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Password reset failed", error);
    const invalidSession =
      error instanceof Error && /session|jwt|token|user not found/i.test(error.message);
    return Response.json(
      {
        error: invalidSession
          ? "This reset link is invalid or expired."
          : "We could not update your password. Please try again.",
      },
      { status: invalidSession ? 401 : 422 },
    );
  }
}
