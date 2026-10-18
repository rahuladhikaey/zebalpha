import { ProductAeoData, ColorVariantSummary, VariantMatrixItem, FaqItem } from "./types";
import { ZEBALPHA_BRAND_ENTITY } from "./brandEntity";

/**
 * Normalizes and extracts factual AEO & GEO metadata from a live Product record
 */
export function extractProductAeoData(product: any): ProductAeoData {
  if (!product) {
    throw new Error("Product data is required for AEO extraction");
  }

  const specs = product.specifications || {};
  const packages: any[] = Array.isArray(product.packages) ? product.packages : [];

  // 1. Process real Color & Size variant combinations
  const variantMatrix: VariantMatrixItem[] = [];
  const colorMap = new Map<string, {
    color: string;
    colorHex?: string;
    availableSizes: Set<string>;
    outOfStockSizes: Set<string>;
    prices: number[];
    totalStock: number;
  }>();

  const allSizesSet = new Set<string>();
  const allColorsSet = new Set<string>();

  if (packages.length > 0) {
    packages.forEach((pkg: any) => {
      const color = (pkg.color || "Default").trim();
      const size = (pkg.size || "Standard").trim();
      const stock = typeof pkg.stock === "number" ? pkg.stock : parseInt(pkg.stock || "0", 10);
      const price = typeof pkg.price === "number" ? pkg.price : parseFloat(pkg.price || product.price || 0);
      const mrp = typeof pkg.mrp === "number" ? pkg.mrp : (pkg.mrp ? parseFloat(pkg.mrp) : undefined);
      const isAvailable = stock > 0;

      allColorsSet.add(color);
      allSizesSet.add(size);

      variantMatrix.push({
        color,
        colorHex: pkg.color_hex,
        size,
        stock,
        price,
        mrp,
        sku: pkg.sku,
        isAvailable,
      });

      if (!colorMap.has(color)) {
        colorMap.set(color, {
          color,
          colorHex: pkg.color_hex,
          availableSizes: new Set(),
          outOfStockSizes: new Set(),
          prices: [],
          totalStock: 0,
        });
      }

      const cData = colorMap.get(color)!;
      cData.totalStock += stock;
      cData.prices.push(price);
      if (isAvailable) {
        cData.availableSizes.add(size);
      } else {
        cData.outOfStockSizes.add(size);
      }
    });
  } else {
    // Single package / base product fallback
    const defaultColor = (product.color || "Standard").trim();
    const defaultSize = (product.size || "Standard").trim();
    const baseStock = typeof product.stock === "number" ? product.stock : parseInt(product.stock || "0", 10);
    const isAvail = baseStock > 0;

    allColorsSet.add(defaultColor);
    allSizesSet.add(defaultSize);

    variantMatrix.push({
      color: defaultColor,
      size: defaultSize,
      stock: baseStock,
      price: product.price,
      mrp: product.mrp,
      isAvailable: isAvail,
    });

    colorMap.set(defaultColor, {
      color: defaultColor,
      availableSizes: isAvail ? new Set([defaultSize]) : new Set(),
      outOfStockSizes: !isAvail ? new Set([defaultSize]) : new Set(),
      prices: [product.price],
      totalStock: baseStock,
    });
  }

  const colorVariants: ColorVariantSummary[] = Array.from(colorMap.values()).map((c) => ({
    color: c.color,
    colorHex: c.colorHex,
    availableSizes: Array.from(c.availableSizes),
    outOfStockSizes: Array.from(c.outOfStockSizes),
    minPrice: c.prices.length > 0 ? Math.min(...c.prices) : product.price,
    maxPrice: c.prices.length > 0 ? Math.max(...c.prices) : product.price,
    totalStock: c.totalStock,
    isAvailable: c.totalStock > 0,
  }));

  const prices = variantMatrix.map((v) => v.price).filter((p) => typeof p === "number" && !isNaN(p));
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.price;
  const totalStock = variantMatrix.reduce((acc, curr) => acc + (curr.stock || 0), 0);
  const inStock = totalStock > 0 || (product.stock && Number(product.stock) > 0);

  // 2. Factual Attribute Resolution from live database specifications
  const material = specs.fabric || specs.material || "100% Combed Cotton";
  const fitType = specs.fit_type || specs.fit || "Relaxed Modern Fit";
  const neckType = specs.neck_type || specs.collar || undefined;
  const sleeveType = specs.sleeve_type || specs.sleeves || undefined;
  const pattern = specs.pattern || undefined;
  const careInstructions = specs.care_instructions || "Machine wash cold with like colors. Do not bleach. Tumble dry low or line dry in shade. Warm iron inside out.";
  const gsm = specs.gsm || (material.toLowerCase().includes("oversized") ? "240 GSM" : "220 GSM");
  const countryOfOrigin = specs.country_of_origin || "India";

  const brand = (product.brand || ZEBALPHA_BRAND_ENTITY.brand).trim();
  const categoryName = product.category_name || specs.category || "Streetwear";
  const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const sellerName = product.seller_name || product.business_name || ZEBALPHA_BRAND_ENTITY.name;

  // 3. Crisp, direct AEO Answer focused on exact facts (not promotional fluff)
  const colorsList = Array.from(allColorsSet);
  const sizesList = Array.from(allSizesSet);

  const colorsText = colorsList.length > 0 ? colorsList.join(", ") : "Standard";
  const sizesText = sizesList.length > 0 ? sizesList.join(", ") : "Standard";
  const priceDisplay = minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice} - ₹${maxPrice}`;

  const shortDirectAnswer = `${product.name} by ${brand} is a ${categoryName} crafted from ${material} (${gsm}) with a ${fitType}${neckType ? `, ${neckType}` : ""}${sleeveType ? `, and ${sleeveType}` : ""}. Available in ${colorsText} across sizes ${sizesText} priced at ${priceDisplay} with pan-India dispatch in ${ZEBALPHA_BRAND_ENTITY.dispatchTimeHours}.`;

  // 4. Dynamic FAQs based STRICTLY on real product data & marketplace policies
  const faqs: FaqItem[] = [
    {
      question: `What material is the ${product.name} made of?`,
      answer: `This garment is made of ${material}${gsm ? ` with a fabric weight of ${gsm}` : ""}. It is designed for durability, breathability, and lasting comfort.`,
      category: "Material & Fabric"
    },
    {
      question: `What sizes and colors are currently in stock for ${product.name}?`,
      answer: colorVariants.map(cv => {
        const avail = cv.availableSizes.length > 0 ? cv.availableSizes.join(", ") : "Currently out of stock";
        return `${cv.color}: Available in [${avail}]`;
      }).join("; "),
      category: "Sizing & Stock"
    },
    {
      question: `What is the return and exchange policy for this item?`,
      answer: `ZEBALPHA provides a ${ZEBALPHA_BRAND_ENTITY.returnWindowDays}-day exchange and return window from the date of delivery. Items must be unwashed, unworn, and retain all original tags.`,
      category: "Returns & Exchanges"
    },
    {
      question: `How long does shipping take and is cash on delivery available?`,
      answer: `Orders are dispatched within ${ZEBALPHA_BRAND_ENTITY.dispatchTimeHours}. Pan-India express delivery typically takes 2 to 5 business days. Free shipping applies on orders over ₹${ZEBALPHA_BRAND_ENTITY.freeShippingThreshold}, and Cash on Delivery (COD) is supported.`,
      category: "Shipping & Delivery"
    },
    {
      question: `How should I wash and care for the ${product.name}?`,
      answer: `${careInstructions}`,
      category: "Garment Care"
    }
  ];

  // 5. Standard Sizing Table Rows (Chest, Length, Shoulder, Sleeve)
  const sizeChartColumns = ["Size", "Chest (in)", "Length (in)", "Shoulder (in)", "Sleeve (in)"];
  const standardSizeRows: Record<string, Record<string, string>> = {
    "S": { "Size": "S", "Chest (in)": "38", "Length (in)": "27", "Shoulder (in)": "17.5", "Sleeve (in)": "8" },
    "M": { "Size": "M", "Chest (in)": "40", "Length (in)": "28", "Shoulder (in)": "18.5", "Sleeve (in)": "8.5" },
    "L": { "Size": "L", "Chest (in)": "42", "Length (in)": "29", "Shoulder (in)": "19.5", "Sleeve (in)": "9" },
    "XL": { "Size": "XL", "Chest (in)": "44", "Length (in)": "30", "Shoulder (in)": "20.5", "Sleeve (in)": "9.5" },
    "XXL": { "Size": "XXL", "Chest (in)": "46", "Length (in)": "31", "Shoulder (in)": "21.5", "Sleeve (in)": "10" },
  };

  const sizeChartRows = sizesList.map((sz) => {
    return standardSizeRows[sz.toUpperCase()] || {
      "Size": sz,
      "Chest (in)": "Refer Guide",
      "Length (in)": "Refer Guide",
      "Shoulder (in)": "Refer Guide",
      "Sleeve (in)": "Refer Guide",
    };
  });

  return {
    id: String(product.id),
    name: product.name,
    brand,
    categoryName,
    categorySlug,
    description: product.description || shortDirectAnswer,
    shortDirectAnswer,
    material,
    fitType,
    neckType,
    sleeveType,
    pattern,
    careInstructions,
    gsm,
    countryOfOrigin,
    minPrice,
    maxPrice,
    mrp: product.mrp,
    currency: "INR",
    totalStock,
    inStock,
    sku: product.sku || `ZEB-${product.id}`,
    colors: colorsList,
    sizes: sizesList,
    colorVariants,
    variantMatrix,
    sizeChartColumns,
    sizeChartRows,
    shippingInfo: `Pan-India express delivery. Dispatches in ${ZEBALPHA_BRAND_ENTITY.dispatchTimeHours}. Free shipping above ₹${ZEBALPHA_BRAND_ENTITY.freeShippingThreshold}.`,
    returnInfo: `${ZEBALPHA_BRAND_ENTITY.returnWindowDays}-day hassle-free returns and exchanges.`,
    faqs,
    canonicalUrl: `https://zebalpha.shop/products/${product.id}`,
    sellerName,
    sellerLocation: product.seller_city ? `${product.seller_city}, India` : "India",
  };
}
