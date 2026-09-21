"use client";

import { useState } from "react";

export function FallbackImage({ src, alt, className, loading = "lazy" }: { src: string; alt: string; className?: string; loading?: "eager" | "lazy" }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  // eslint-disable-next-line @next/next/no-img-element -- supports CMS-managed local and remote media
  return <img src={src} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} />;
}
