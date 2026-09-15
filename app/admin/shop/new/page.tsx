import type { Metadata } from "next";
import { createProduct } from "../../actions";
import { Denied } from "@/components/admin/Denied";
import { ProductForm } from "@/components/admin/ProductForm";
import { can, getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "محصول جدید" };

export default async function NewProductPage() {
  const user = await getSessionUser();
  if (!user || !can(user, "shop")) return <Denied />;
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black text-navy-900">افزودن محصول</h1>
      <ProductForm action={createProduct} submitLabel="انتشار محصول" />
    </div>
  );
}
