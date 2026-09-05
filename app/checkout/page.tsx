import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "تسویه حساب" };

export default async function CheckoutPage() {
  const user = await getSessionUser();
  return (
    <>
      <PageHero
        title="تسویه حساب"
        crumbs={[{ href: "/", label: "خانه" }, { href: "/cart", label: "سبد خرید" }, { label: "تسویه حساب" }]}
      />
      <div className="shell py-10 lg:py-12">
        <CheckoutForm userName={user?.name ?? ""} userPhone={user?.phone ?? ""} />
      </div>
    </>
  );
}
