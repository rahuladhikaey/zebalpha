import { NextResponse } from 'next/server';
import { supabaseServer } from "@/lib/supabaseServer";
import { Product } from "@/lib/types";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { data: products } = await supabaseServer
    .from("products")
    .select("id, name, description, price, mrp, stock, status, images, image_url, brand, category_name")
    .or("is_active.is.null,is_active.eq.true")
    .neq("status", "DELETED")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!products) {
    return new NextResponse('Error fetching products', { status: 500 });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zebalpha.shop').replace(/\/$/, '');

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>ZebAlpha Official Product Feed</title>
    <link>${baseUrl}</link>
    <description>Heavyweight Oversized T-Shirts, Zip Polos, Hoodies, Streetwear &amp; Custom Print Studio by ZebAlpha India.</description>
`;

  (products as Product[]).forEach((product) => {
    const productUrl = `${baseUrl}/products/${product.id}`;
    const rawImage = product.images?.[0] || product.image_url || '/official-logo.png';
    const imageUrl = rawImage.startsWith('http')
      ? rawImage
      : `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

    const cleanDescription = escapeXml(
      (product.description || `${product.name} crafted for everyday streetwear comfort on ZebAlpha India. Pan-India delivery with Cash on Delivery and UPI.`).slice(0, 4800)
    );
    const cleanTitle = escapeXml(String(product.name || "ZebAlpha Apparel").slice(0, 150));

    const sellingPrice = Number(product.price) || 0;
    const mrp = Number(product.mrp) || 0;
    const hasSale = mrp > sellingPrice && sellingPrice > 0;
    const regularPrice = (hasSale ? mrp : sellingPrice).toFixed(2);
    const salePrice = sellingPrice.toFixed(2);
    const brandName = escapeXml((product.brand || 'ZebAlpha').trim());
    const inStock =
      product.status !== "OUT_OF_STOCK" &&
      (product.stock === undefined || product.stock === null || Number(product.stock) > 0);
    const shippingCost = sellingPrice >= 999 ? "0.00" : "40.00";

    xml += `
    <item>
      <g:id>${escapeXml(String(product.id))}</g:id>
      <g:title>${cleanTitle}</g:title>
      <g:description>${cleanDescription}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${regularPrice} INR</g:price>${hasSale ? `\n      <g:sale_price>${salePrice} INR</g:sale_price>` : ""}
      <g:brand>${brandName}</g:brand>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing</g:google_product_category>
      <g:shipping>
        <g:country>IN</g:country>
        <g:service>Standard Pan-India Shipping</g:service>
        <g:price>${shippingCost} INR</g:price>
      </g:shipping>
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
  });

  xml += `
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
