import { ZEBALPHA_BRAND_ENTITY, ENTITY_DISAMBIGUATION } from "./brandEntity";
import { ProductAeoData, FaqItem, BuyingGuideArticle } from "./types";

/**
 * Builds canonical Organization schema for ZebAlpha
 */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${ZEBALPHA_BRAND_ENTITY.url}/#organization`,
    "name": "ZebAlpha",
    "alternateName": ["ZebAlpha E-Commerce", "ZebAlpha Marketplace"],
    "legalName": "ZebAlpha",
    "url": ZEBALPHA_BRAND_ENTITY.url,
    "logo": {
      "@type": "ImageObject",
      "url": ZEBALPHA_BRAND_ENTITY.logoUrl,
      "caption": "ZebAlpha Brand Logo"
    },
    "description": ZEBALPHA_BRAND_ENTITY.description,
    "disambiguatingDescription": ENTITY_DISAMBIGUATION.clarification,
    "foundingLocation": {
      "@type": "Place",
      "name": "Kolkata, West Bengal, India",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Kolkata",
        "addressRegion": "West Bengal",
        "addressCountry": "IN"
      }
    },
    "founder": [
      {
        "@type": "Person",
        "name": "Rahul Adhikary",
        "jobTitle": "Founder"
      },
      {
        "@type": "Person",
        "name": "Alakesh Biswas",
        "jobTitle": "Co-founder / Partner"
      }
    ],
    "sameAs": ZEBALPHA_BRAND_ENTITY.sameAs,
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "email": ZEBALPHA_BRAND_ENTITY.supportEmail,
        "contactType": "customer service",
        "areaServed": "IN",
        "availableLanguage": ["English", "Hindi", "Bengali"]
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Kolkata",
      "addressRegion": "West Bengal",
      "addressCountry": "IN"
    }
  };
}

/**
 * Builds canonical WebSite schema with internal search potential
 */
export function buildWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${ZEBALPHA_BRAND_ENTITY.url}/#website`,
    "url": ZEBALPHA_BRAND_ENTITY.url,
    "name": "ZebAlpha",
    "alternateName": "ZebAlpha E-Commerce",
    "description": "Official ZebAlpha e-commerce marketplace website.",
    "publisher": {
      "@id": `${ZEBALPHA_BRAND_ENTITY.url}/#organization`
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${ZEBALPHA_BRAND_ENTITY.url}/products?search={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };
}

/**
 * Builds BreadcrumbList schema matching visible breadcrumbs
 */
export function buildBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

/**
 * Builds accurate Product structured data reflecting actual color/size variants & stock
 */
export function buildProductSchema(productAeo: ProductAeoData, images: string[] = []) {
  const primaryImage = images.length > 0 ? images[0] : `${ZEBALPHA_BRAND_ENTITY.url}/official-logo.png`;
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const priceValidUntil = nextYear.toISOString().split("T")[0];

  // Additional factual properties
  const additionalProperties: Array<{ "@type": string; name: string; value: string }> = [];
  if (productAeo.material) additionalProperties.push({ "@type": "PropertyValue", name: "Material", value: productAeo.material });
  if (productAeo.fitType) additionalProperties.push({ "@type": "PropertyValue", name: "Fit Type", value: productAeo.fitType });
  if (productAeo.neckType) additionalProperties.push({ "@type": "PropertyValue", name: "Neck Type", value: productAeo.neckType });
  if (productAeo.sleeveType) additionalProperties.push({ "@type": "PropertyValue", name: "Sleeve Length", value: productAeo.sleeveType });
  if (productAeo.pattern) additionalProperties.push({ "@type": "PropertyValue", name: "Pattern", value: productAeo.pattern });
  if (productAeo.gsm) additionalProperties.push({ "@type": "PropertyValue", name: "Fabric Weight", value: String(productAeo.gsm) });
  if (productAeo.countryOfOrigin) additionalProperties.push({ "@type": "PropertyValue", name: "Country of Origin", value: productAeo.countryOfOrigin });

  // Generate offers based on true variant matrix
  const offers = productAeo.variantMatrix.map((variant) => {
    return {
      "@type": "Offer",
      "name": `${productAeo.name} - ${variant.color} / ${variant.size}`,
      "sku": variant.sku || `${productAeo.sku}-${variant.color}-${variant.size}`,
      "price": variant.price,
      "priceCurrency": "INR",
      "priceValidUntil": priceValidUntil,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": variant.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "url": `${productAeo.canonicalUrl}?color=${encodeURIComponent(variant.color)}&size=${encodeURIComponent(variant.size)}`,
      "seller": {
        "@type": "Organization",
        "name": productAeo.sellerName
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": variant.price >= ZEBALPHA_BRAND_ENTITY.freeShippingThreshold ? 0 : 40,
          "currency": "INR"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 2,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 2,
            "maxValue": 5,
            "unitCode": "DAY"
          }
        }
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "IN",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": ZEBALPHA_BRAND_ENTITY.returnWindowDays,
        "returnMethod": "https://schema.org/ReturnByMail",
        "returnFees": "https://schema.org/FreeReturn"
      }
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productAeo.canonicalUrl}/#product`,
    "name": productAeo.name,
    "image": images.length > 0 ? images : [primaryImage],
    "description": productAeo.shortDirectAnswer || productAeo.description,
    "sku": productAeo.sku,
    "brand": {
      "@type": "Brand",
      "name": productAeo.brand
    },
    "category": productAeo.categoryName,
    "offers": offers.length > 0 ? offers : {
      "@type": "Offer",
      "price": productAeo.minPrice,
      "priceCurrency": "INR",
      "priceValidUntil": priceValidUntil,
      "itemCondition": "https://schema.org/NewCondition",
      "availability": productAeo.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": productAeo.canonicalUrl,
      "seller": {
        "@type": "Organization",
        "name": productAeo.sellerName
      }
    },
    "additionalProperty": additionalProperties
  };
}

/**
 * Builds FAQPage schema for crawlable FAQ sections
 */
export function buildFaqSchema(faqs: FaqItem[]) {
  if (!faqs || faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Builds Article schema for helpful buying guides and tutorials
 */
export function buildArticleSchema(article: BuyingGuideArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${article.canonicalUrl}/#article`,
    "headline": article.h1 || article.title,
    "description": article.metaDescription,
    "image": article.heroImage || `${ZEBALPHA_BRAND_ENTITY.url}/official-logo.png`,
    "datePublished": article.publishedAt,
    "dateModified": article.modifiedAt,
    "author": {
      "@type": "Organization",
      "name": article.author || ZEBALPHA_BRAND_ENTITY.name,
      "url": ZEBALPHA_BRAND_ENTITY.url
    },
    "publisher": {
      "@type": "Organization",
      "name": ZEBALPHA_BRAND_ENTITY.name,
      "logo": {
        "@type": "ImageObject",
        "url": ZEBALPHA_BRAND_ENTITY.logoUrl
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.canonicalUrl
    }
  };
}
