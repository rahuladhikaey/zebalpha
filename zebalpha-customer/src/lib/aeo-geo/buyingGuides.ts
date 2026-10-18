import { BuyingGuideArticle } from "./types";

/**
 * Editorial Buying Guides & Sizing Manuals for AEO & Generative Engine Optimization.
 * These are fully crawlable, informative, factual, and helpful resources for customers and search engines.
 */
export const BUYING_GUIDES: Record<string, BuyingGuideArticle> = {
  "t-shirt-size-guide": {
    slug: "t-shirt-size-guide",
    title: "T-Shirt Size Guide: How to Measure for Regular & Oversized Fits | ZEBALPHA",
    h1: "The Complete T-Shirt Size & Fit Measurement Guide",
    metaDescription: "Learn how to accurately measure your chest, shoulder, and torso length for standard and oversized t-shirts. View complete inch and cm sizing charts.",
    publishedAt: "2026-01-15T08:00:00Z",
    modifiedAt: "2026-10-15T12:00:00Z",
    author: "ZEBALPHA Editorial Team",
    shortDirectAnswer: "To find your accurate t-shirt size, measure the fullest part of your chest flat across armpit-to-armpit and multiply by 2. For regular fits, choose 2-3 inches of chest ease (e.g., 38\" body chest = Size S 40\" t-shirt). For oversized streetwear fits, choose 4-6 inches of ease.",
    readingTime: "5 min read",
    sections: [
      {
        heading: "1. Step-by-Step Garment Measuring Technique",
        content: "Take your best-fitting existing t-shirt, lay it completely flat on a smooth surface, and smooth out any wrinkles. Measure three key points: (1) Chest width from lowest point of armhole to armhole, (2) Body length from highest shoulder point down to bottom hem, and (3) Shoulder width straight across from shoulder seam to shoulder seam."
      },
      {
        heading: "2. Standard Apparel Sizing Matrix (Garment Dimensions in Inches)",
        content: "Below are the exact garment dimensions engineered for ZEBALPHA core collections:",
        table: {
          headers: ["Size", "Chest (in)", "Length (in)", "Shoulder (in)", "Recommended Body Chest (in)"],
          rows: [
            ["S", "38 - 40", "27.5", "17.5", "36 - 38"],
            ["M", "40 - 42", "28.5", "18.5", "38 - 40"],
            ["L", "42 - 44", "29.5", "19.5", "40 - 42"],
            ["XL", "44 - 46", "30.5", "20.5", "42 - 44"],
            ["XXL", "46 - 48", "31.5", "21.5", "44 - 46"]
          ]
        }
      },
      {
        heading: "3. Oversized Fit vs Regular Fit Guidelines",
        content: "An oversized fit is not just a larger size of a regular shirt. Our oversized patterns feature specifically dropped shoulder seams (by 2 to 3 inches), widened armholes, and extended sleeve lengths that terminate near the elbow. If you order your true size, you will achieve the intentional boxy streetwear drape without neck gaping."
      }
    ],
    faqs: [
      {
        question: "Should I size up for an oversized t-shirt?",
        answer: "No. ZEBALPHA oversized garments are pre-calculated with generous boxy ease in your standard size. Only size up if you want an ultra-exaggerated runway drape."
      },
      {
        question: "Will cotton t-shirts shrink after machine washing?",
        answer: "Our combed cotton t-shirts are pre-shrunk and bio-washed during manufacturing, keeping shrinkage below 2% when washed in cold water and air-dried."
      }
    ],
    relatedCategorySlugs: ["t-shirts", "oversized-t-shirts", "polos"],
    canonicalUrl: "https://zebalpha.shop/guides/t-shirt-size-guide"
  },

  "oversized-t-shirt-guide": {
    slug: "oversized-t-shirt-guide",
    title: "What is an Oversized T-Shirt? Fabric, GSM & Styling Guide | ZEBALPHA",
    h1: "The Definitive Guide to Oversized Streetwear T-Shirts",
    metaDescription: "Understand what defines an authentic oversized t-shirt: 240+ GSM heavyweight combed cotton, dropped shoulders, boxy drape, and proper styling proportions.",
    publishedAt: "2026-02-10T10:00:00Z",
    modifiedAt: "2026-10-12T14:30:00Z",
    author: "ZEBALPHA Editorial Team",
    shortDirectAnswer: "An oversized T-shirt has a looser fit than a regular T-shirt and is designed for a relaxed silhouette with dropped shoulders, wider chest proportions, and longer sleeves. True streetwear oversized tees use heavyweight fabrics (240-280 GSM) so the fabric holds structural form rather than clinging.",
    readingTime: "6 min read",
    sections: [
      {
        heading: "1. The Anatomy of an Authentic Oversized T-Shirt",
        content: "Many commercial brands simply take a standard t-shirt pattern and label size XL as 'Oversized M'. In contrast, true oversized engineering modifies three structural axes: (1) The shoulder seam drops 2 to 3 inches down the bicep, (2) The chest width increases by 4 to 6 inches, and (3) The neckline remains firm with Lycra-ribbing to prevent collar stretching."
      },
      {
        heading: "2. Why Fabric Weight (GSM) Dictates the Drape",
        content: "Lightweight fabrics (140-180 GSM) collapse against the body and look sloppy when cut oversized. Heavyweight 240+ GSM combed cotton has the tensile density required to create an architectural, clean silhouette that stands away from the body, offering maximum breathability and airflow in warm climates."
      },
      {
        heading: "3. How to Style Oversized T-Shirts for Everyday Wear",
        content: "The rule of thumb for streetwear silhouettes is proportional balance. Pair an oversized boxy top with straight-leg denim, relaxed cargos, or tailored pleated trousers. Finish with clean minimalist sneakers to anchor the relaxed silhouette."
      }
    ],
    faqs: [
      {
        question: "What does GSM mean in t-shirts?",
        answer: "GSM stands for Grams per Square Meter. It measures the density and weight of the fabric. Standard tees range from 160-180 GSM, while premium heavyweight streetwear tees range from 240 to 280 GSM."
      },
      {
        question: "Can shorter men wear oversized t-shirts without looking overwhelmed?",
        answer: "Yes. Look for boxy cropped or mid-hip cuts rather than excessively long hemlines. Tucking the front hem into higher-waisted trousers also lengthens the leg line."
      }
    ],
    relatedCategorySlugs: ["oversized-t-shirts", "t-shirts", "hoodies"],
    canonicalUrl: "https://zebalpha.shop/guides/oversized-t-shirt-guide"
  },

  "regular-vs-oversized-tshirt": {
    slug: "regular-vs-oversized-tshirt",
    title: "Regular Fit vs Oversized Fit T-Shirts: Differences Explained | ZEBALPHA",
    h1: "Regular Fit vs Oversized Fit: Key Differences & When to Wear Each",
    metaDescription: "Compare regular fit and oversized t-shirts side-by-side. Learn the differences in shoulder seam placement, fabric weight, drape, and occasion suitability.",
    publishedAt: "2026-03-01T09:00:00Z",
    modifiedAt: "2026-10-10T11:00:00Z",
    author: "ZEBALPHA Editorial Team",
    shortDirectAnswer: "Regular fit t-shirts sit directly on the shoulder bone with 2-3 inches of chest ease for a clean, classic profile. Oversized t-shirts feature dropped shoulders, 4-6 inches of chest ease, and heavyweight 240+ GSM fabric for a bold, relaxed streetwear silhouette.",
    readingTime: "4 min read",
    sections: [
      {
        heading: "1. Direct Comparison: Regular vs Oversized Architecture",
        content: "Understanding the technical distinctions ensures you always select the right cut for your wardrobe and occasion:",
        table: {
          headers: ["Attribute", "Regular Fit T-Shirt", "Oversized Streetwear T-Shirt"],
          rows: [
            ["Shoulder Seam", "Sits on natural shoulder bone", "Dropped 2 - 3 inches below bone"],
            ["Fabric Weight", "180 - 220 GSM", "240 - 280 GSM (Heavyweight)"],
            ["Chest Ease", "+2 to +3 inches over body", "+4 to +6 inches over body"],
            ["Sleeve Length", "Mid-bicep", "Near the elbow crease"],
            ["Best Occasion", "Casual office, layering under jackets", "Streetwear, weekend lounge, concerts"]
          ]
        }
      },
      {
        heading: "2. Layering Versatility",
        content: "Regular fit tees serve as the ultimate base layer beneath chore coats, zip polos, and unbuttoned overshirts because they do not bunch up at the armpits. Oversized tees excel as standalone statement hero garments."
      }
    ],
    faqs: [
      {
        question: "Is oversized the same as wearing one size larger?",
        answer: "No. Wearing a regular t-shirt one size up makes the collar gap, sleeves excessively narrow for the length, and the torso too long. An authentic oversized tee is proportionally designed with wide shoulders and a structured neck."
      }
    ],
    relatedCategorySlugs: ["t-shirts", "oversized-t-shirts", "polos"],
    canonicalUrl: "https://zebalpha.shop/guides/regular-vs-oversized-tshirt"
  },

  "printed-tshirt-care-guide": {
    slug: "printed-tshirt-care-guide",
    title: "How to Wash & Care for Printed Graphic Streetwear T-Shirts | ZEBALPHA",
    h1: "How to Wash and Care for Printed Streetwear Apparel",
    metaDescription: "Prevent cracking, fading, and peeling on printed t-shirts with our master garment care guide. Temperature, washing, drying, and ironing best practices.",
    publishedAt: "2026-03-15T08:00:00Z",
    modifiedAt: "2026-10-08T15:00:00Z",
    author: "ZEBALPHA Garment Technicians",
    shortDirectAnswer: "To keep graphic prints vibrant and crack-free: always turn the shirt inside out before washing, use cold water (below 30°C), avoid harsh bleach or fabric softeners, line dry in the shade, and never iron directly on top of the print.",
    readingTime: "4 min read",
    sections: [
      {
        heading: "1. The 5 Golden Rules of Streetwear Laundry",
        content: "(1) Turn inside out to prevent surface friction during the spin cycle. (2) Wash on delicate with cold water. High heat degrades screen prints and DTF adhesives. (3) Use mild liquid detergents. Avoid chlorine bleach. (4) Air dry away from direct scorching sunlight. (5) Iron inside out or place a baking paper sheet over the graphic."
      },
      {
        heading: "2. How to Fix Stretched Collar Ribbing",
        content: "If a collar ever stretches from improper hanger storage, soak the collar in ice-cold water, shape it flat with your hands, and let it dry flat. Our thick Lycra-ribbed collars are designed with memory tension to rebound to their original contour."
      }
    ],
    faqs: [
      {
        question: "Can I put graphic printed t-shirts in the dryer?",
        answer: "It is strongly advised to avoid high-heat tumble dryers. The intense heat breaks down print polymers causing cracking and accelerated color fading. Line drying in natural shade preserves print life."
      }
    ],
    relatedCategorySlugs: ["oversized-t-shirts", "t-shirts", "hoodies"],
    canonicalUrl: "https://zebalpha.shop/guides/printed-tshirt-care-guide"
  },

  "cotton-fabric-gsm-guide": {
    slug: "cotton-fabric-gsm-guide",
    title: "T-Shirt Fabrics & GSM Explained: Combed vs Supima vs Polyester | ZEBALPHA",
    h1: "The Complete Guide to Cotton Fabrics, Weaves & GSM Weights",
    metaDescription: "Understand t-shirt fabrics: combed cotton vs carded vs Supima cotton. Learn how GSM (Grams per Square Meter) affects drape, softness, and durability.",
    publishedAt: "2026-04-01T10:00:00Z",
    modifiedAt: "2026-10-05T09:00:00Z",
    author: "ZEBALPHA Fabric Engineers",
    shortDirectAnswer: "Combed cotton is superior to regular cotton because mechanical combing removes short impurities and aligns long fibers for a softer, stronger yarn. Supima is ultra-long staple cotton prized for premium luster. Fabric weight is measured in GSM: 180 GSM is lightweight, 220 GSM is midweight, and 240+ GSM is heavyweight luxury streetwear.",
    readingTime: "5 min read",
    sections: [
      {
        heading: "1. Carded Cotton vs Combed Cotton vs Supima Cotton",
        content: "Regular carded cotton retains short broken fibers that cause fuzzing, pilling, and rough skin friction. Combed cotton discards short fibers, retaining only long silky fibers that are spun into smooth, resilient yarns. Supima cotton is grown exclusively in the USA with 45% stronger fibers for luxury apparel."
      },
      {
        heading: "2. GSM Weight Breakdown Table",
        content: "Choose your fabric weight according to climate and styling requirements:",
        table: {
          headers: ["GSM Range", "Weight Category", "Feel & Thickness", "Best Applications"],
          rows: [
            ["140 - 180", "Lightweight", "Thin, breezy, prone to clinging", "Undergarments, running vests"],
            ["180 - 220", "Midweight", "Soft, durable, daily casual", "Classic crewnecks, polo shirts"],
            ["240 - 280", "Heavyweight", "Structured, substantial, boxy drape", "Streetwear oversized tees, graphic drops"],
            ["350 - 450", "Ultra-Heavyweight", "Dense, thermal, brushed fleece", "Winter hoodies, thick sweatshirts"]
          ]
        }
      }
    ],
    faqs: [
      {
        question: "Is higher GSM always better for t-shirts?",
        answer: "Not necessarily. Higher GSM provides structural drape and durability for streetwear, while midweight (200-220 GSM) offers lighter breathability for hot humid summer days. Fabric quality and yarn count matter just as much as weight."
      }
    ],
    relatedCategorySlugs: ["polos", "oversized-t-shirts", "t-shirts", "hoodies"],
    canonicalUrl: "https://zebalpha.shop/guides/cotton-fabric-gsm-guide"
  }
};
