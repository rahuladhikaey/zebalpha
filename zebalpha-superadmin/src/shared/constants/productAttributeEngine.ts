/**
 * ZEBALPHA — SMART DYNAMIC CATEGORY & ATTRIBUTE ENGINE (MEESHO-STYLE)
 * Central configuration defining main categories, subcategories, product types,
 * dynamic descriptive attributes, and purchasable variant configurations.
 */

export type AttributeInputType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "color"
  | "measurement";

export interface DynamicAttributeDefinition {
  id: string;
  name: string;
  label: string;
  type: AttributeInputType;
  required?: boolean;
  options?: string[];
  unit?: string;
  placeholder?: string;
  helpText?: string;
  isVariantGenerating?: boolean; // If true, can generate purchasable packages
  defaultValue?: string;
}

export type SizingSystemType =
  | "none"
  | "standard_apparel" // XS, S, M, L, XL, XXL, etc.
  | "waist_numeric"    // 28, 30, 32, 34, etc.
  | "kids_apparel"     // 0-6M, 1-2Y, etc.
  | "footwear"         // UK/IND 6, 7, 8, 9, 10
  | "bed_dimensions"   // Single, Double, Queen, King
  | "capacity_volume"; // 500ml, 750ml, 1L

export interface ProductTypeConfig {
  id: string;
  name: string;
  label: string;
  sizingSystem: SizingSystemType;
  supportsColor: boolean;
  defaultHasVariants: boolean;
  sizeChartColumns?: string[];
  sizeChartNotes?: string;
  attributes: DynamicAttributeDefinition[];
}

export interface SubcategoryConfig {
  id: string;
  name: string;
  label: string;
  productTypes: ProductTypeConfig[];
}

export interface MainCategoryConfig {
  id: string;
  name: string;
  label: string;
  icon?: string;
  subcategories: SubcategoryConfig[];
}

export type CategoryConfig = MainCategoryConfig;

// -------------------------------------------------------------
// SIZE PRESETS
// -------------------------------------------------------------
export const PRESET_SIZES = {
  standard_apparel: ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"],
  waist_numeric: ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44"],
  kids_apparel: ["0-6M", "6-12M", "1-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y", "9-10Y", "11-12Y", "13-14Y"],
  footwear: ["UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"],
  bed_dimensions: ["Single (60x90 in)", "Double (90x100 in)", "Queen (90x108 in)", "King (108x108 in)"],
  capacity_volume: ["250 ml", "500 ml", "750 ml", "1000 ml (1 L)", "1500 ml (1.5 L)", "2000 ml (2 L)"],
};

// -------------------------------------------------------------
// CENTRAL CATEGORY & ATTRIBUTE MATRIX
// -------------------------------------------------------------
export const DYNAMIC_CATEGORY_CATALOG: MainCategoryConfig[] = [
  {
    id: "men",
    name: "Men's Fashion",
    label: "Men's Fashion",
    icon: "👔",
    subcategories: [
      {
        id: "men_topwear",
        name: "Topwear",
        label: "Topwear",
        productTypes: [
          {
            id: "t_shirts",
            name: "T-Shirts & Polos",
            label: "T-Shirts & Polos",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Chest", "Length", "Shoulder", "Sleeve"],
            sizeChartNotes: "All measurements are garment dimensions in inches. Measure flat across chest.",
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric / Material", type: "select", required: true, options: ["100% Pure Cotton", "Cotton Blend", "Polyester", "Linen", "Modal", "Dry-Fit Polyester"] },
              { id: "fit_type", name: "fit_type", label: "Fit Type", type: "select", required: true, options: ["Regular Fit", "Oversized Fit", "Slim Fit", "Relaxed Fit", "Boxy Fit"] },
              { id: "pattern", name: "pattern", label: "Pattern", type: "select", required: true, options: ["Solid / Plain", "Graphic Printed", "Striped", "Color Block", "Tie-Dye", "Typography"] },
              { id: "neck_type", name: "neck_type", label: "Neck Type", type: "select", required: true, options: ["Round Neck", "Polo Collar", "V-Neck", "Henley Neck", "Hooded"] },
              { id: "sleeve_type", name: "sleeve_type", label: "Sleeve Length", type: "select", required: true, options: ["Short Sleeve", "Long Sleeve", "Sleeveless", "Half Sleeve"] },
              { id: "care_instructions", name: "care_instructions", label: "Care Instructions", type: "select", options: ["Machine Wash Cold", "Hand Wash", "Do Not Bleach", "Dry Clean Only"] },
            ],
          },
          {
            id: "shirts",
            name: "Shirts",
            label: "Casual & Formal Shirts",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Chest", "Length", "Shoulder", "Sleeve", "Collar"],
            sizeChartNotes: "Measure flat across chest armhole-to-armhole.",
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["100% Cotton", "Linen", "Oxford Cotton", "Cotton Blend", "Denim", "Poplin"] },
              { id: "fit_type", name: "fit_type", label: "Fit Type", type: "select", required: true, options: ["Slim Fit", "Regular Fit", "Relaxed Fit"] },
              { id: "pattern", name: "pattern", label: "Pattern", type: "select", required: true, options: ["Solid / Plain", "Checked", "Striped", "Printed", "Floral"] },
              { id: "sleeve_type", name: "sleeve_type", label: "Sleeve Length", type: "select", required: true, options: ["Full Sleeve", "Short Sleeve", "Roll-up Sleeve"] },
              { id: "neck_type", name: "neck_type", label: "Collar Type", type: "select", options: ["Spread Collar", "Mandarin / Band Collar", "Button-Down Collar", "Cuban Collar"] },
            ],
          },
          {
            id: "hoodies",
            name: "Hoodies & Sweatshirts",
            label: "Hoodies & Sweatshirts",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Chest", "Length", "Shoulder", "Sleeve"],
            sizeChartNotes: "Streetwear relaxed silhouette.",
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Cotton Fleece (350+ GSM)", "Cotton Blend", "French Terry", "Polyester Fleece"] },
              { id: "fit_type", name: "fit_type", label: "Fit Type", type: "select", required: true, options: ["Oversized Street Fit", "Regular Fit", "Drop Shoulder"] },
              { id: "neck_type", name: "neck_type", label: "Hood / Closure", type: "select", options: ["Pullover with Drawstring Hood", "Zip-Up Hooded", "Crewneck / Sweatshirt"] },
              { id: "pocket", name: "pocket", label: "Pocket Type", type: "select", options: ["Kangaroo Pocket", "Side Slit Pockets", "No Pockets"] },
            ],
          },
          {
            id: "kurtas_men",
            name: "Kurtas & Ethnic",
            label: "Ethnic Kurtas",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Chest", "Length", "Shoulder", "Sleeve"],
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Pure Cotton", "Cotton Silk", "Khadi", "Linen", "Chikankari Cotton"] },
              { id: "pattern", name: "pattern", label: "Work / Pattern", type: "select", options: ["Embroidered", "Solid", "Handblock Printed", "Chikankari"] },
              { id: "neck_type", name: "neck_type", label: "Neckline", type: "select", options: ["Mandarin Collar", "Round Neck with Placket", "Angrakha Style"] },
            ],
          },
        ],
      },
      {
        id: "men_bottomwear",
        name: "Bottomwear",
        label: "Bottomwear",
        productTypes: [
          {
            id: "jeans_men",
            name: "Jeans",
            label: "Denim Jeans",
            sizingSystem: "waist_numeric",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Waist", "Hip", "Length", "Inseam", "Thigh"],
            sizeChartNotes: "Waist measured in inches.",
            attributes: [
              { id: "fabric", name: "fabric", label: "Denim Fabric / Stretch", type: "select", required: true, options: ["100% Rigid Cotton", "Stretch Denim (2% Elastane)", "Power Stretch"] },
              { id: "fit_type", name: "fit_type", label: "Fit Type", type: "select", required: true, options: ["Slim Fit", "Straight Fit", "Baggy / Wide Leg", "Skinny Fit", "Tapered Fit"] },
              { id: "rise", name: "rise", label: "Rise", type: "select", options: ["Mid Rise", "High Rise", "Low Rise"] },
              { id: "wash", name: "wash", label: "Wash Type", type: "select", options: ["Dark Wash", "Light Wash", "Acid Wash", "Raw Indigo", "Distressed / Ripped"] },
            ],
          },
          {
            id: "trousers_men",
            name: "Trousers & Chinos",
            label: "Trousers & Chinos",
            sizingSystem: "waist_numeric",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Waist", "Length", "Hip", "Inseam"],
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Cotton Twill Chino", "Polyester Viscose Blend", "Linen Blend"] },
              { id: "fit_type", name: "fit_type", label: "Fit Type", type: "select", required: true, options: ["Slim Fit", "Regular Fit", "Relaxed Pleated"] },
            ],
          },
          {
            id: "shorts_men",
            name: "Shorts & Cargo",
            label: "Shorts & Cargo Pants",
            sizingSystem: "waist_numeric",
            supportsColor: true,
            defaultHasVariants: true,
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Heavy Cotton Twill", "French Terry Cotton", "Ripstop Nylon"] },
              { id: "pocket_count", name: "pocket_count", label: "Cargo Pockets", type: "select", options: ["6 Pockets", "4 Pockets", "2 Pockets"] },
            ],
          },
        ],
      },
      {
        id: "men_footwear",
        name: "Footwear",
        label: "Footwear",
        productTypes: [
          {
            id: "shoes_men",
            name: "Shoes & Sneakers",
            label: "Shoes & Sneakers",
            sizingSystem: "footwear",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["UK/IND Size", "EU Size", "Foot Length (cm)"],
            sizeChartNotes: "Follow standard Indian / UK shoe measurement scale.",
            attributes: [
              { id: "upper_material", name: "upper_material", label: "Upper Material", type: "select", required: true, options: ["Genuine Leather", "Synthetic Leather (PU)", "Breathable Mesh", "Canvas", "Suede"] },
              { id: "sole_material", name: "sole_material", label: "Sole Material", type: "select", required: true, options: ["Rubber Sole", "EVA Foam", "Air Cushion TPR", "Phylon"] },
              { id: "closure_type", name: "closure_type", label: "Closure", type: "select", options: ["Lace-Up", "Slip-On", "Velcro Straps"] },
              { id: "water_resistant", name: "water_resistant", label: "Water Resistance", type: "select", options: ["No", "Water Resistant", "Fully Waterproof"] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "women",
    name: "Women's Fashion",
    label: "Women's Fashion",
    icon: "👗",
    subcategories: [
      {
        id: "women_ethnic",
        name: "Ethnic & Traditional",
        label: "Ethnic & Traditional",
        productTypes: [
          {
            id: "sarees",
            name: "Sarees",
            label: "Sarees & Silk",
            sizingSystem: "none", // Sarees are Free Size / 5.5m or 6.3m with blouse piece
            supportsColor: true,
            defaultHasVariants: false, // Often sold with color options, but no clothing size
            attributes: [
              { id: "fabric", name: "fabric", label: "Saree Fabric", type: "select", required: true, options: ["Banarasi Silk", "Kanjivaram Silk", "Georgette", "Chiffon", "Organza", "Cotton Silk", "Pure Linen"] },
              { id: "saree_length", name: "saree_length", label: "Saree Length (Metres)", type: "select", required: true, options: ["5.5 Metres", "6.0 Metres", "6.3 Metres (with Blouse)"] },
              { id: "blouse_piece", name: "blouse_piece", label: "Blouse Piece Included?", type: "select", required: true, options: ["Unstitched Blouse Piece Included (0.8m)", "Separate Stitched Blouse", "No Blouse Piece"] },
              { id: "embroidery_work", name: "embroidery_work", label: "Zari / Border Work", type: "select", options: ["Gold Zari Woven Border", "Resham Thread Embroidery", "Mirror Work", "Printed Digital Pattern"] },
              { id: "occasion", name: "occasion", label: "Occasion", type: "select", options: ["Wedding / Bridal", "Festival & Puja", "Party Wear", "Daily Casual Wear"] },
            ],
          },
          {
            id: "kurtis",
            name: "Kurtis & Suits",
            label: "Kurtis & Suit Sets",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Bust", "Waist", "Hip", "Kurti Length", "Shoulder"],
            sizeChartNotes: "All garment measurements in inches.",
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Pure Cotton 60x60", "Rayon (140 GSM)", "Chanderi Silk", "Georgette", "Linen"] },
              { id: "set_type", name: "set_type", label: "Product Set Type", type: "select", required: true, options: ["Kurti with Pant & Dupatta (3-Piece)", "Kurti with Palazzo (2-Piece)", "Only Kurti (1-Piece)", "Anarkali Gown"] },
              { id: "sleeve_type", name: "sleeve_type", label: "Sleeve Type", type: "select", options: ["3/4th Sleeve", "Full Sleeve", "Sleeveless", "Short Sleeve"] },
              { id: "neck_type", name: "neck_type", label: "Neck Design", type: "select", options: ["Round Neck with V-Slit", "Sweetheart Neck", "Mandarin Neck", "Square Neck"] },
            ],
          },
          {
            id: "blouses",
            name: "Blouses",
            label: "Stitched Saree Blouses",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Bust (Inches)", "Waist (Inches)", "Armhole"],
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Phantom Silk", "Velvet", "Brocade / Jacquard", "Cotton Blend"] },
              { id: "padding", name: "padding", label: "Padded / Non-Padded", type: "select", options: ["Padded Cups Included", "Non-Padded"] },
              { id: "opening", name: "opening", label: "Hook Opening", type: "select", options: ["Back Hook", "Front Hook", "Side Zipper"] },
            ],
          },
        ],
      },
      {
        id: "women_western",
        name: "Western Wear",
        label: "Western Wear",
        productTypes: [
          {
            id: "dresses_women",
            name: "Dresses & Gowns",
            label: "Dresses & Jumpsuits",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Bust", "Waist", "Hip", "Length"],
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Georgette", "Cotton", "Crepe", "Satin Silk", "Rayon", "Polyester Blend"] },
              { id: "dress_length", name: "dress_length", label: "Dress Length", type: "select", options: ["Maxi (Full Length)", "Midi (Calf Length)", "Mini (Above Knee)"] },
              { id: "fit_type", name: "fit_type", label: "Silhouette / Fit", type: "select", options: ["A-Line", "Fit & Flare", "Bodycon", "Tiered Ruffled", "Wrap Dress"] },
            ],
          },
          {
            id: "tops_women",
            name: "Tops & Tunics",
            label: "Tops & Tunics",
            sizingSystem: "standard_apparel",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Bust", "Length", "Shoulder"],
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric", type: "select", required: true, options: ["Cotton", "Georgette", "Rayon", "Satin", "Viscose"] },
              { id: "pattern", name: "pattern", label: "Pattern", type: "select", options: ["Floral Print", "Solid", "Striped", "Schiffli Embroidery"] },
            ],
          },
          {
            id: "jeans_women",
            name: "Jeans & Leggings",
            label: "Women's Jeans & Leggings",
            sizingSystem: "waist_numeric",
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Waist", "Hip", "Length", "Inseam"],
            attributes: [
              { id: "fabric", name: "fabric", label: "Material", type: "select", required: true, options: ["Stretch Denim", "Cotton Lycra", "Ribbed Knit"] },
              { id: "fit_type", name: "fit_type", label: "Fit Type", type: "select", options: ["High-Waisted Mom Fit", "Skinny Fit", "Flared / Bell Bottom", "Wide Leg"] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "home",
    name: "Home & Kitchen",
    label: "Home & Kitchen",
    icon: "🏠",
    subcategories: [
      {
        id: "kitchen_dining",
        name: "Kitchen & Dining",
        label: "Kitchen & Dining",
        productTypes: [
          {
            id: "water_bottles",
            name: "Water Bottles",
            label: "Bottles, Flasks & Tumblers",
            sizingSystem: "capacity_volume", // Variant is capacity (500ml, 750ml, 1L), NOT clothing size!
            supportsColor: true,
            defaultHasVariants: true,
            attributes: [
              { id: "material", name: "material", label: "Bottle Material", type: "select", required: true, options: ["Stainless Steel (Food Grade 304)", "Copper", "BPA-Free Tritan Plastic", "Borosilicate Glass"] },
              { id: "insulation", name: "insulation", label: "Thermal Insulation", type: "select", required: true, options: ["Double-Wall Vacuum Insulated (24Hr Cold / 12Hr Hot)", "Single-Wall (Not Insulated)"] },
              { id: "leakproof", name: "leakproof", label: "Leak-Proof Cap?", type: "select", options: ["100% Leak-Proof Airtight", "Spill-Resistant Sipper"] },
              { id: "dishwasher_safe", name: "dishwasher_safe", label: "Dishwasher Safe", type: "select", options: ["Hand Wash Recommended", "Dishwasher Safe"] },
            ],
          },
          {
            id: "storage_containers",
            name: "Storage Containers",
            label: "Airtight Containers & Boxes",
            sizingSystem: "capacity_volume",
            supportsColor: false,
            defaultHasVariants: false,
            attributes: [
              { id: "material", name: "material", label: "Container Material", type: "select", required: true, options: ["BPA-Free Food Grade Plastic", "Borosilicate Glass", "Stainless Steel"] },
              { id: "pieces_count", name: "pieces_count", label: "Set Pack Count", type: "select", required: true, options: ["Set of 1", "Set of 3", "Set of 4", "Set of 6", "Set of 12"] },
              { id: "airtight", name: "airtight", label: "Airtight Locking Lid", type: "select", options: ["Yes (Silicone Gasket Clip-Lock)", "Standard Snap Lid"] },
              { id: "microwave_safe", name: "microwave_safe", label: "Microwave Safe", type: "select", options: ["Yes (Without Lid)", "No"] },
            ],
          },
          {
            id: "cookware",
            name: "Cookware & Pans",
            label: "Pans, Kadhai & Cookers",
            sizingSystem: "none",
            supportsColor: false,
            defaultHasVariants: false,
            attributes: [
              { id: "material", name: "material", label: "Cookware Material", type: "select", required: true, options: ["Tri-Ply Stainless Steel", "Cast Iron", "Die-Cast Non-Stick Aluminium", "Hard Anodised"] },
              { id: "coating", name: "coating", label: "Coating Type", type: "select", options: ["Granite Non-Stick (PFOA Free)", "Pre-Seasoned Cast Iron", "No Coating (Bare Steel)"] },
              { id: "induction_compatible", name: "induction_compatible", label: "Induction Base Compatible", type: "select", required: true, options: ["Gas & Induction Friendly", "Gas Stove Only"] },
              { id: "diameter_cm", name: "diameter_cm", label: "Diameter / Size (cm)", type: "text", placeholder: "e.g. 24 cm / 2.5 Litre" },
            ],
          },
        ],
      },
      {
        id: "bedding_furnishing",
        name: "Bedding & Decor",
        label: "Bedding & Furnishing",
        productTypes: [
          {
            id: "bedsheets",
            name: "Bedsheets",
            label: "Bedsheets & Covers",
            sizingSystem: "bed_dimensions", // Variant is Single, Double, Queen, King
            supportsColor: true,
            defaultHasVariants: true,
            sizeChartColumns: ["Bed Size", "Bedsheet Dimensions (Inches)", "Pillow Cover (Inches)"],
            sizeChartNotes: "Includes matching pillow covers.",
            attributes: [
              { id: "fabric", name: "fabric", label: "Fabric Material", type: "select", required: true, options: ["100% Pure Glace Cotton", "TC 210 Percale Cotton", "Microfiber (140 GSM)", "Linen Blend"] },
              { id: "thread_count", name: "thread_count", label: "Thread Count (TC)", type: "select", options: ["180 TC", "210 TC", "300 TC Premium", "400 TC Luxury"] },
              { id: "pattern", name: "pattern", label: "Design & Pattern", type: "select", options: ["Geometric Prints", "Floral Prints", "Solid Pastel", "Traditional Rajasthani Sanganeri"] },
              { id: "pillow_covers_count", name: "pillow_covers_count", label: "Pillow Covers Included", type: "select", options: ["2 Pillow Covers", "1 Pillow Cover", "None"] },
            ],
          },
          {
            id: "curtains",
            name: "Curtains",
            label: "Window & Door Curtains",
            sizingSystem: "none",
            supportsColor: true,
            defaultHasVariants: true,
            attributes: [
              { id: "curtain_length", name: "curtain_length", label: "Curtain Length", type: "select", required: true, options: ["Window (5 Feet / 152 cm)", "Door (7 Feet / 213 cm)", "Long Door (9 Feet / 274 cm)"] },
              { id: "fabric", name: "fabric", label: "Fabric Material", type: "select", required: true, options: ["Blackout Polyester (Blocks 90% Light)", "Semi-Sheer Net", "Heavy Cotton Jute"] },
              { id: "eyelet_type", name: "eyelet_type", label: "Hanging Style", type: "select", options: ["Steel Grommet / Eyelet Rings", "Rod Pocket", "Pleated"] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "electronics",
    name: "Electronics & Accessories",
    label: "Electronics & Gadgets",
    icon: "🔌",
    subcategories: [
      {
        id: "mobile_accessories",
        name: "Audio & Power",
        label: "Mobile Accessories & Audio",
        productTypes: [
          {
            id: "earphones",
            name: "Earphones & Audio",
            label: "TWS Earbuds & Headphones",
            sizingSystem: "none", // NO SIZES!
            supportsColor: true,
            defaultHasVariants: false, // Color variants only if seller enables
            attributes: [
              { id: "connectivity", name: "connectivity", label: "Connectivity", type: "select", required: true, options: ["Bluetooth 5.3 Wireless", "Bluetooth 5.2", "3.5mm Wired Jack", "Type-C Wired"] },
              { id: "battery_life", name: "battery_life", label: "Playtime / Battery Life", type: "text", required: true, placeholder: "e.g. 40 Hours Total Playtime with Case" },
              { id: "anc", name: "anc", label: "Noise Cancellation", type: "select", options: ["Active Noise Cancellation (ANC)", "Environmental Noise Cancellation (ENC)", "Passive Isolation"] },
              { id: "water_resistance", name: "water_resistance", label: "IPX Rating", type: "select", options: ["IPX4 Sweat Resistant", "IPX5 Splash Proof", "IPX7 Waterproof", "None"] },
              { id: "warranty", name: "warranty", label: "Brand Warranty", type: "select", options: ["1 Year Brand Replacement", "6 Months Warranty", "No Warranty"] },
            ],
          },
          {
            id: "phone_cases",
            name: "Phone Cases",
            label: "Cases & Covers",
            sizingSystem: "none",
            supportsColor: true,
            defaultHasVariants: true, // Phone models or colors
            attributes: [
              { id: "compatible_models", name: "compatible_models", label: "Compatible Phone Model(s)", type: "text", required: true, placeholder: "e.g. iPhone 15 Pro, iPhone 14, Galaxy S24" },
              { id: "material", name: "material", label: "Case Material", type: "select", required: true, options: ["Shockproof TPU Silicon", "Hard Polycarbonate (PC)", "Liquid Silicone with Microfiber", "PU Leather Flip"] },
              { id: "magsafe", name: "magsafe", label: "MagSafe Compatible?", type: "select", options: ["Built-in MagSafe Ring", "Not MagSafe"] },
            ],
          },
          {
            id: "chargers_cables",
            name: "Chargers & Cables",
            label: "Chargers & Cables",
            sizingSystem: "none",
            supportsColor: false,
            defaultHasVariants: false,
            attributes: [
              { id: "connector_type", name: "connector_type", label: "Connector Type", type: "select", required: true, options: ["USB Type-C to Type-C", "USB-A to Type-C", "Lightning to Type-C", "3-in-1 Multi Cable"] },
              { id: "charging_wattage", name: "charging_wattage", label: "Max Wattage Output", type: "select", required: true, options: ["20W Fast PD", "33W Dash", "65W GaN Fast Charger", "100W PD Cable", "120W Ultra Fast"] },
              { id: "cable_length", name: "cable_length", label: "Cable Length", type: "select", options: ["1 Metre (3.3 ft)", "1.5 Metres", "2 Metres (6.6 ft)"] },
            ],
          },
          {
            id: "smartwatches",
            name: "Smartwatches",
            label: "Smartwatches & Bands",
            sizingSystem: "none",
            supportsColor: true,
            defaultHasVariants: false,
            attributes: [
              { id: "display_size", name: "display_size", label: "Screen Display", type: "text", required: true, placeholder: "e.g. 1.96-inch AMOLED Display" },
              { id: "calling_feature", name: "calling_feature", label: "Bluetooth Calling", type: "select", required: true, options: ["Yes (Mic & Speaker Inbuilt)", "No Calling (Notification Only)"] },
              { id: "battery_days", name: "battery_days", label: "Battery Life", type: "select", options: ["Up to 7 Days", "Up to 5 Days", "Up to 2 Days (Always-on)"] },
              { id: "sensors", name: "sensors", label: "Health Sensors", type: "text", placeholder: "e.g. SpO2, Heart Rate, Sleep Tracker" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "beauty",
    name: "Beauty & Care",
    label: "Beauty & Personal Care",
    icon: "💄",
    subcategories: [
      {
        id: "skincare_makeup",
        name: "Skincare & Makeup",
        label: "Skincare & Makeup",
        productTypes: [
          {
            id: "makeup_cosmetics",
            name: "Cosmetics & Makeup",
            label: "Lipstick, Foundation & Eyes",
            sizingSystem: "none",
            supportsColor: true, // Color / Shade represents lipstick / foundation shade!
            defaultHasVariants: true,
            attributes: [
              { id: "net_weight_volume", name: "net_weight_volume", label: "Net Volume / Weight", type: "text", required: true, placeholder: "e.g. 30 ml or 4.5 g" },
              { id: "finish_type", name: "finish_type", label: "Finish", type: "select", required: true, options: ["Matte", "Dewy / Radiant", "Glossy", "Satin", "Velvet"] },
              { id: "skin_type", name: "skin_type", label: "Recommended Skin Type", type: "select", options: ["All Skin Types", "Oily to Combination", "Dry Skin", "Sensitive Skin"] },
              { id: "formulation", name: "formulation", label: "Formulation", type: "select", options: ["Liquid", "Cream", "Powder Pressed", "Crayon"] },
              { id: "shelf_life", name: "shelf_life", label: "Shelf Life (Months)", type: "select", options: ["36 Months", "24 Months", "12 Months"] },
            ],
          },
          {
            id: "skincare_serums",
            name: "Skincare Serums & Creams",
            label: "Serums, Moisturisers & Sunscreens",
            sizingSystem: "none",
            supportsColor: false, // NO SIZES OR COLORS!
            defaultHasVariants: false,
            attributes: [
              { id: "net_volume", name: "net_volume", label: "Net Volume", type: "select", required: true, options: ["15 ml", "30 ml", "50 ml", "100 ml", "200 ml"] },
              { id: "key_ingredients", name: "key_ingredients", label: "Key Active Actives", type: "text", required: true, placeholder: "e.g. 10% Niacinamide + 1% Zinc, Hyaluronic Acid, SPF 50 PA++++" },
              { id: "skin_concern", name: "skin_concern", label: "Targets Concern", type: "select", options: ["Dark Spots & Pigmentation", "Acne & Blemishes", "Hydration & Barrier Repair", "Sun Protection (UV)", "Anti-Aging"] },
              { id: "fragrance", name: "fragrance", label: "Fragrance Free?", type: "select", options: ["Fragrance Free", "Light Natural Fragrance"] },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "jewellery",
    name: "Jewellery & Bags",
    label: "Jewellery & Bags",
    icon: "💍",
    subcategories: [
      {
        id: "jewellery_cat",
        name: "Jewellery",
        label: "Fashion & Traditional Jewellery",
        productTypes: [
          {
            id: "rings_jewellery",
            name: "Rings & Bangles",
            label: "Rings & Bangles",
            sizingSystem: "none", // Free Size adjustable or specific numeric
            supportsColor: true,
            defaultHasVariants: false,
            attributes: [
              { id: "base_metal", name: "base_metal", label: "Base Metal", type: "select", required: true, options: ["925 Sterling Silver", "Brass / Copper Alloy", "Stainless Steel", "Gold Plated Alloy"] },
              { id: "plating", name: "plating", label: "Plating Finish", type: "select", required: true, options: ["18K Gold Plated", "Rhodium Silver Polish", "Rose Gold Polish", "Oxidised Antique"] },
              { id: "gemstone", name: "gemstone", label: "Stone / Gemstone", type: "select", options: ["Cubic Zirconia (CZ)", "Kundan & Polki", "Pearl", "Moissanite", "No Stone"] },
              { id: "adjustable", name: "adjustable", label: "Adjustable Ring Size?", type: "select", options: ["Yes (Adjustable Free Size)", "Fixed Size"] },
            ],
          },
          {
            id: "necklaces",
            name: "Necklaces & Earrings",
            label: "Necklaces, Chokers & Sets",
            sizingSystem: "none",
            supportsColor: true,
            defaultHasVariants: false,
            attributes: [
              { id: "base_metal", name: "base_metal", label: "Base Metal", type: "select", required: true, options: ["Brass Alloy", "925 Sterling Silver", "Stainless Steel", "Kundan Meenakari"] },
              { id: "closure_type", name: "closure_type", label: "Closure / Lock", type: "select", options: ["Lobster Claw Clasp", "Adjustable Dori / Thread", "Fish Hook (Earrings)"] },
            ],
          },
          {
            id: "handbags",
            name: "Handbags & Wallets",
            label: "Handbags & Wallets",
            sizingSystem: "none",
            supportsColor: true,
            defaultHasVariants: true,
            attributes: [
              { id: "material", name: "material", label: "Material", type: "select", required: true, options: ["Vegan PU Leather", "Canvas Jute", "Genuine Leather", "Jacquard Fabric"] },
              { id: "compartments", name: "compartments", label: "Number of Compartments", type: "select", options: ["1 Main Compartment", "2 Compartments", "3+ Compartments"] },
              { id: "dimensions_cm", name: "dimensions_cm", label: "Bag Dimensions (L x W x H cm)", type: "text", placeholder: "e.g. 28 x 12 x 22 cm" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Category",
    label: "✍️ Custom Category",
    icon: "✨",
    subcategories: [
      {
        id: "custom_sub",
        name: "General Merchandise",
        label: "General Merchandise",
        productTypes: [
          {
            id: "general_product",
            name: "General Product",
            label: "Standard Single or Variant Product",
            sizingSystem: "none",
            supportsColor: true,
            defaultHasVariants: false,
            attributes: [
              { id: "material", name: "material", label: "Primary Material", type: "text", placeholder: "e.g. Wood, Ceramic, Metal, Fabric..." },
              { id: "dimensions", name: "dimensions", label: "Dimensions / Specifications", type: "text", placeholder: "e.g. 20 x 15 cm" },
              { id: "usage", name: "usage", label: "Usage Instructions / Details", type: "text", placeholder: "e.g. Indoor decorative use..." },
            ],
          },
        ],
      },
    ],
  },
];

// -------------------------------------------------------------
// HELPER QUERY FUNCTIONS
// -------------------------------------------------------------

/**
 * Find MainCategoryConfig by ID or name
 */
export function findMainCategory(idOrName: string): MainCategoryConfig | undefined {
  if (!idOrName) return undefined;
  const lower = idOrName.toLowerCase().trim();
  return DYNAMIC_CATEGORY_CATALOG.find(
    (c) => c.id.toLowerCase() === lower || c.name.toLowerCase() === lower
  );
}

/**
 * Find ProductTypeConfig given subcategory name or product type ID/name
 */
export function resolveProductTypeConfig(
  mainCatIdOrName?: string,
  subcatNameOrId?: string,
  productTypeId?: string
): ProductTypeConfig {
  const fallback = DYNAMIC_CATEGORY_CATALOG[DYNAMIC_CATEGORY_CATALOG.length - 1].subcategories[0].productTypes[0];

  if (!mainCatIdOrName && !subcatNameOrId && !productTypeId) {
    return fallback;
  }

  // 1. Direct search across all categories by productTypeId or subcat name
  const subLower = (subcatNameOrId || "").toLowerCase().trim();
  const prodTypeLower = (productTypeId || "").toLowerCase().trim();

  for (const mainCat of DYNAMIC_CATEGORY_CATALOG) {
    for (const sub of mainCat.subcategories) {
      for (const pt of sub.productTypes) {
        if (
          (prodTypeLower && (pt.id.toLowerCase() === prodTypeLower || pt.name.toLowerCase() === prodTypeLower)) ||
          (subLower && (pt.name.toLowerCase().includes(subLower) || subLower.includes(pt.name.toLowerCase()) || pt.id.toLowerCase().includes(subLower)))
        ) {
          return pt;
        }
      }
    }
  }

  // 2. Intelligent inference based on common keywords
  if (subLower.includes("bottle") || subLower.includes("flask") || subLower.includes("tumbler")) {
    return resolveProductTypeConfig("home", "", "water_bottles");
  }
  if (subLower.includes("bedsheet") || subLower.includes("bedding") || subLower.includes("bed cover")) {
    return resolveProductTypeConfig("home", "", "bedsheets");
  }
  if (subLower.includes("cookware") || subLower.includes("pan") || subLower.includes("kadhai")) {
    return resolveProductTypeConfig("home", "", "cookware");
  }
  if (subLower.includes("saree") || subLower.includes("sari")) {
    return resolveProductTypeConfig("women", "", "sarees");
  }
  if (subLower.includes("kurti") || subLower.includes("suit")) {
    return resolveProductTypeConfig("women", "", "kurtis");
  }
  if (subLower.includes("jean") || subLower.includes("denim") || subLower.includes("pant") || subLower.includes("trouser")) {
    return resolveProductTypeConfig("men", "", "jeans_men");
  }
  if (subLower.includes("shoe") || subLower.includes("sneaker") || subLower.includes("footwear")) {
    return resolveProductTypeConfig("men", "", "shoes_men");
  }
  if (subLower.includes("earphone") || subLower.includes("headphone") || subLower.includes("earbud") || subLower.includes("audio")) {
    return resolveProductTypeConfig("electronics", "", "earphones");
  }
  if (subLower.includes("case") || subLower.includes("cover")) {
    return resolveProductTypeConfig("electronics", "", "phone_cases");
  }
  if (subLower.includes("lipstick") || subLower.includes("makeup") || subLower.includes("cosmetic") || subLower.includes("foundation")) {
    return resolveProductTypeConfig("beauty", "", "makeup_cosmetics");
  }
  if (subLower.includes("serum") || subLower.includes("skincare") || subLower.includes("cream") || subLower.includes("lotion")) {
    return resolveProductTypeConfig("beauty", "", "skincare_serums");
  }
  if (subLower.includes("ring") || subLower.includes("jewellery") || subLower.includes("bangle") || subLower.includes("necklace")) {
    return resolveProductTypeConfig("jewellery", "", "rings_jewellery");
  }
  if (subLower.includes("shirt") || subLower.includes("tee") || subLower.includes("top") || subLower.includes("hoodie") || subLower.includes("polo")) {
    return resolveProductTypeConfig("men", "", "t_shirts");
  }

  // 3. Fallback to default
  const foundMain = findMainCategory(mainCatIdOrName || "");
  if (foundMain && foundMain.subcategories[0]?.productTypes[0]) {
    return foundMain.subcategories[0].productTypes[0];
  }

  return fallback;
}
