/**
 * Isomorphic Product Display Pricing Helper
 * Safe for use in both Server Components and Client Components.
 *
 * Resolves consistent display pricing, MRP, and discount percentage for product cards
 * prioritizing the default/primary variant package so the catalog card ALWAYS matches
 * what is displayed on the product details page.
 */
export function getProductDisplayPricing(product: {
  price: number;
  mrp?: number;
  packages?: any[];
  default_color?: string;
  main_color?: string;
  specifications?: any;
}) {
  const specs = product?.specifications || {};
  const defaultCol = (
    product?.default_color ||
    product?.main_color ||
    specs.default_color ||
    specs.main_color ||
    ""
  ).trim().toLowerCase();

  const pkgs = Array.isArray(product?.packages) ? product.packages : [];
  const primaryPkg = pkgs.length > 0
    ? (pkgs.find((p: any) => defaultCol && (p.color || "").trim().toLowerCase() === defaultCol) || pkgs[0])
    : null;

  const price = primaryPkg && primaryPkg.price != null && !isNaN(Number(primaryPkg.price)) && Number(primaryPkg.price) > 0
    ? Number(primaryPkg.price)
    : Number(product?.price) || 0;

  const mrp = primaryPkg && primaryPkg.mrp != null && !isNaN(Number(primaryPkg.mrp)) && Number(primaryPkg.mrp) > 0
    ? Number(primaryPkg.mrp)
    : (product?.mrp != null && !isNaN(Number(product.mrp)) && Number(product.mrp) > 0 ? Number(product.mrp) : price);

  const hasDiscount = mrp > price && mrp > 0;
  const discountAmount = hasDiscount ? mrp - price : 0;
  const discountPercent = hasDiscount ? Math.round((discountAmount / mrp) * 100) : 0;

  return { price, mrp, hasDiscount, discountAmount, discountPercent };
}
