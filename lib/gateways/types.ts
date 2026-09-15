import type { Order, PaymentProviderId } from "@/lib/types";

export type { PaymentProviderId };
export { PAYMENT_PROVIDERS } from "@/lib/types";

/**
 * Payment gateway driver contract.
 *
 * Every Iranian gateway we support differs in the details — base URL, whether
 * the credential is a merchant id or an API key, whether amounts are Rial or
 * Toman, which status code means "paid" — but the shape of the conversation is
 * always the same: create a transaction, redirect the buyer, then confirm it
 * server-to-server. This interface pins that shape so `lib/payment.ts` can stay
 * a thin dispatcher and a new PSP is one file.
 */

export interface PaymentRequestInput {
  order: Order;
  /** Absolute callback URL, without the order query string. */
  callbackUrl: string;
}

export interface PaymentRequestResult {
  ok: boolean;
  /** Where to send the buyer's browser. */
  payUrl?: string;
  /**
   * Gateway token for this transaction. Stored on the order so the callback can
   * be matched to it.
   */
  authority?: string;
  error?: string;
}

export interface PaymentVerifyResult {
  ok: boolean;
  /** Gateway reference number to record against the payment. */
  refId?: string;
  /** True when the gateway reports the transaction was already confirmed. */
  alreadyVerified?: boolean;
  error?: string;
}

export interface PaymentDriver {
  id: PaymentProviderId;
  /** Persian label shown in the admin gateway picker. */
  label: string;
  /** What the primary credential field is called for this gateway. */
  credentialLabel: string;
  /** True when the gateway also needs a second credential (PayPing's secret). */
  needsSecret: boolean;
  request(input: PaymentRequestInput, settings: GatewayCredentials): Promise<PaymentRequestResult>;
  verify(order: Order, authority: string, settings: GatewayCredentials): Promise<PaymentVerifyResult>;
}

/** Credentials resolved from settings for a single driver. */
export interface GatewayCredentials {
  merchantId: string;
  secret: string;
  sandbox: boolean;
}


