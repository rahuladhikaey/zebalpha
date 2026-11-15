"use client";

import { useParams } from "next/navigation";
import ProductDetailTemplate from "./ProductDetailTemplate";
import { ProductDetailsLoadingScreen } from "@/components/ProductDetailsLoadingScreen";
import { getCachedProductDetail } from "@/lib/productDetailCache";

export default function ProductDetailLoading() {
  const params = useParams<{ productId?: string | string[] }>();
  const rawId = Array.isArray(params?.productId) ? params.productId[0] : params?.productId;
  const cachedEntry = rawId ? getCachedProductDetail(decodeURIComponent(String(rawId))) : null;

  if (cachedEntry) {
    return (
      <ProductDetailTemplate
        product={cachedEntry.product}
        initialReviews={cachedEntry.reviews}
      />
    );
  }

  return <ProductDetailsLoadingScreen status="loading" />;
}
