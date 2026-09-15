import { describe, expect, it } from "vitest";
import { parsePaymentCallback } from "@/lib/payment-callback";

describe("payment callback normalization", () => {
  it("understands Zibal's trackId and success callback", () => {
    expect(parsePaymentCallback(new URLSearchParams("trackId=77&success=1&status=2"), "zibal"))
      .toEqual({ authority: "77", successful: true });
  });

  it("does not trust a failed Zibal browser callback", () => {
    expect(parsePaymentCallback(new URLSearchParams("trackId=77&success=0&status=3"), "zibal").successful)
      .toBe(false);
  });

  it("keeps the Zarinpal callback contract", () => {
    expect(parsePaymentCallback(new URLSearchParams("Authority=A1&Status=OK"), "zarinpal"))
      .toEqual({ authority: "A1", successful: true });
  });
});
