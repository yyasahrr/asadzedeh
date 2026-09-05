import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateProduct } from "../../../actions";
import { Denied } from "@/components/admin/Denied";
import { ProductForm } from "@/components/admin/ProductForm";
import { can, getSessionUser } from "@/lib/auth";
import { getProduct } from "@/lib/store";

export const metadata: Metadata = { title: "ویرایش محصول" };

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user || !can(user, "shop")) return <Denied />;
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">ویرایش: {p.title}</h1>
      <ProductForm action={updateProduct} initial={p} submitLabel="ذخیره تغییرات" />
    </div>
  );
}
