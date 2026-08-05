import { NextRequest, NextResponse } from "next/server";
import { getCampaignSearchCorpus } from "@/app/dataloader";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const campaignId = request.nextUrl.searchParams.get("campaign");
  if (!campaignId) return NextResponse.json({ error: "Campaign is required" }, { status: 400 });
  const corpus = await getCampaignSearchCorpus(campaignId, session.userId);
  if (!corpus) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json(corpus, { headers: { "Cache-Control": "private, no-store" } });
}
