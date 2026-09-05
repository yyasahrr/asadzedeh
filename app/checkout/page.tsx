import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/store";

export const metadata: Metadata = { title: "تسویه حساب" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getSessionUser();
  const { error } = await searchParams;
  const shop = getSettings().shop;
  return (
    <>
      <PageHero
        title="تسویه حساب"
        crumbs={[{ href: "/", label: "خانه" }, { href: "/cart", label: "سبد خرید" }, { label: "تسویه حساب" }]}
      />
      <div className="shell py-10 lg:py-12">
        <CheckoutForm
          userName={user?.name ?? ""}
          userPhone={user?.phone ?? ""}
          shippingMethods={shop.shippingMethods.filter((m) => m.active)}
          freeShippingOver={shop.freeShippingOver}
          error={error}
        />
      </div>
    </>
  );
}
