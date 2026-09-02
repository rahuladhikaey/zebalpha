import { NextResponse } from 'next/server';
import { supabaseServer } from "@/lib/supabaseServer";
import { Product } from "@/lib/types";

// Revalidate this feed every hour so it stays fresh without hammering the database
export const revalidate = 3600; 

export async function GET() {
  const { data: products } = await supabaseServer
    .from("products")
    .select("*");

  if (!products) {
    return new NextResponse('Error fetching products', { status: 500 });
  }

  const baseUrl = 'https://www.asaliswad.shop';

  let xml = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Asali Swad Products</title>
    <link>${baseUrl}</link>
    <description>Authentic Indian Sweets, Namkeen &amp; Dry Fruits from Asali Swad.</description>
`;

  products.forEach((product: Product) => {
    const productUrl = `${baseUrl}/products/${product.id}`;
    
    // Ensure image URL is absolute
    const rawImage = product.images?.[0] || product.image_url || '/og-image.jpg';
    const imageUrl = rawImage.startsWith('http') ? rawImage : `${baseUrl}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
    
    // Clean strings to prevent XML errors
    const cleanDescription = (product.description || 'Premium product from Asali Swad')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    const cleanTitle = product.name
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

    // Price must have 2 decimal places
    const formattedPrice = Number(product.price).toFixed(2);

    xml += `
    <item>
      <g:id>${product.id}</g:id>
      <g:title>${cleanTitle}</g:title>
      <g:description>${cleanDescription}</g:description>
      <g:link>${productUrl}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${formattedPrice} INR</g:price>
      <g:brand>Asali Swad</g:brand>
      <!-- We use identifier_exists: no because you likely do not have GTIN/UPC codes for homemade goods -->
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
  });

  xml += `
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
