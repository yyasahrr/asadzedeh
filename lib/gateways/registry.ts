import { idpay } from "./idpay";
import { payping } from "./payping";
import { zarinpal } from "./zarinpal";
import { zibal } from "./zibal";
import type { PaymentDriver, PaymentProviderId } from "./types";

/**
 * Gateway registry.
 *
 * Adding a PSP is: write a driver, register it here, add the id to
 * `PAYMENT_PROVIDERS`. Nothing else in the codebase needs to know it exists.
 * `demo` is deliberately absent — it is not a gateway, it is the absence of one,
 * and `lib/payment.ts` handles it before consulting this map.
 */
const DRIVERS: Record<string, PaymentDriver> = {
  zarinpal,
  idpay,
  zibal,
  payping,
};

export function getDriver(provider: PaymentProviderId): PaymentDriver | undefined {
  return DRIVERS[provider];
}

/** Every registered real gateway, for the admin picker. */
export function listDrivers(): PaymentDriver[] {
  return Object.values(DRIVERS);
}
