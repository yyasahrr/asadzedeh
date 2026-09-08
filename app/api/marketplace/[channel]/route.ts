import { NextResponse } from "next/server";
import {
  buildFeed,
  channelEnabled,
  feedKeyOk,
  feedToCsv,
} from "@/lib/marketplaces";
import type { MarketplaceId } from "@/lib/types";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const CHANNELS: MarketplaceId[] = ["torob", "emalls", "basalam", "digikala", "custom"];

/**
 * Product feed for an Iranian marketplace / comparison engine.
 *
 *   GET /api/marketplace/torob?key=…            → JSON
 *   GET /api/marketplace/emalls?key=…&format=csv → CSV
 *
 * A disabled channel answers 404 rather than an empty feed, so turning a
 * channel off actually removes it instead of publishing a catalogue of zero
 * products that the marketplace would interpret as "everything is gone".
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;
  if (!CHANNELS.includes(channel as MarketplaceId)) {
    return NextResponse.json({ error: "unknown channel" }, { status: 404 });
  }
  const id = channel as MarketplaceId;

  if (!channelEnabled(id)) {
    return NextResponse.json({ error: "channel disabled" }, { status: 404 });
  }

  const url = new URL(request.url);
  if (!feedKeyOk(url.searchParams.get("key"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const items = buildFeed(id);
  logger.info({ event: "marketplace.feed", channel: id, count: items.length });

  if (url.searchParams.get("format") === "csv") {
    return new NextResponse(feedToCsv(items), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "cache-control": "public, max-age=900",
      },
    });
  }

  return NextResponse.json(
    { count: items.length, currency: "TOMAN", products: items },
    { headers: { "cache-control": "public, max-age=900" } },
  );
}
