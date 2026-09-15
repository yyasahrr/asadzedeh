import { appUrl } from "@/lib/env";
import { getProducts, getSettings } from "@/lib/store";
import {
  FEED_CHANNELS,
  buildFeedItems,
  renderProductFeedXml,
  type FeedChannel,
} from "@/lib/channels/feed";

/**
 * Product feed endpoint.
 *
 * Torob and Emalls are given this URL and re-fetch it on their own schedule, so
 * it is deliberately unauthenticated (a crawler cannot log in) and cheap: it
 * reads the product table once and renders. Caching is kept short so a price
 * change in the shop reaches the engine within minutes rather than hours — a
 * stale price is the failure mode that gets a listing suspended.
 *
 * The channel is an allowlist, not a passthrough: an unknown segment is a 404
 * rather than an echo of whatever was requested.
 */

export const dynamic = "force-dynamic";

function isChannel(value: string): value is FeedChannel {
  return (FEED_CHANNELS as readonly string[]).includes(value);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const { channel } = await params;
  if (!isChannel(channel)) {
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const settings = getSettings();
  const channels = settings.channels;
  // An engine the shop has not enabled must not be able to enumerate the
  // catalogue, even though the route itself is public.
  if (!channels[channel].enabled) {
    return new Response("not found", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  }

  const items = buildFeedItems(getProducts(), appUrl(), channel, {
    brand: channels.brand || settings.site.siteName,
  });
  const xml = renderProductFeedXml(items);

  return new Response(xml, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      // Long enough to survive a crawler burst, short enough that a price edit
      // is not contradicted for an hour.
      "cache-control": "public, max-age=300, s-maxage=300",
      "x-feed-channel": channel,
      "x-feed-items": String(items.length),
    },
  });
}
