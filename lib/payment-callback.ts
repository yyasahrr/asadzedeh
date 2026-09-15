export interface PaymentCallback {
  authority: string;
  successful: boolean;
}

/** Normalize each PSP's browser callback without ever treating it as proof of payment. */
export function parsePaymentCallback(params: URLSearchParams, provider: string | undefined): PaymentCallback {
  if (provider === "zibal") {
    const success = params.get("success");
    const status = params.get("status");
    return {
      authority: params.get("trackId") ?? "",
      // Zibal integrations in the wild use success=1/2; older callbacks expose
      // status=2. This flag only decides whether to call server-side verify.
      successful: success ? success === "1" || success === "2" : status === "2",
    };
  }

  if (provider === "idpay") {
    return {
      authority: params.get("id") ?? "",
      successful: ["100", "101", "200"].includes(params.get("status") ?? ""),
    };
  }

  if (provider === "payping") {
    return {
      authority: params.get("refid") ?? params.get("refId") ?? "",
      successful: Boolean(params.get("refid") ?? params.get("refId")),
    };
  }

  return {
    authority: params.get("Authority") ?? "",
    successful: params.get("Status") === "OK",
  };
}
