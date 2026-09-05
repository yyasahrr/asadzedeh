import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "سبد خرید" };

export default function CartPage() {
  return (
    <>
      <PageHero
        title="سبد خرید"
        crumbs={[{ href: "/", label: "خانه" }, { label: "سبد خرید" }]}
      />
      <div className="shell py-10 lg:py-12">
        <CartView />
      </div>
    </>
  );
}
