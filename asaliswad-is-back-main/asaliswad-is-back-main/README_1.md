# 🛍️ Asali Swad - Premium eCommerce Specification

This document serves as the comprehensive technical and design reference for the **Asali Swad** project. It is specifically structured to guide AI-driven development for a native **Flutter/Java** Android application.

---

## 🏗️ Project Architecture

**Asali Swad** is a high-end spice and grocery storefront designed with a "Premium-First" philosophy.

- **Frontend**: Next.js 15+ (App Router), Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (Bucket: `product-images`)
- **Payments**: Razorpay Integration
- **Logistics**: Shiprocket Integration
- **Communication**: WhatsApp API for order notifications

---

## 🎨 Design System (Visual Language)

To maintain the premium brand identity in the mobile app, use the following tokens:

### 1. Color Palette
- **Primary (Emerald)**: `#065f46` (Emerald 800) - Used for primary actions and branding.
- **Accent (Mint)**: `#10b981` (Emerald 500) - Used for success states and icons.
- **Background**: `#fdfdfd` (Light) / `#020617` (Dark)
- **Surface**: `#ffffff` (White cards with subtle borders `#f1f5f9`)
- **Warnings**: `#f59e0b` (Amber 500) for "Offers" and "Limited" badges.

### 2. UI Characteristics
- **Glassmorphism**: Use `backdrop-blur` (20px+) on sticky headers and navigation bars.
- **Shadows**: Use "Premium Shadows" — `0 10px 40px -10px rgba(0, 0, 0, 0.05)`.
- **Border Radius**: 
    - Full Pages/Sections: `48px` (3rem)
    - Product Cards: `32px` (2rem)
    - Buttons: `16px` (1rem)
- **Typography**: Use **Outfit** or **Inter**. High font weights (900/Black) for headings.

---

## 📱 Feature Specifications (Mobile App Roadmap)

### 1. Home Screen
- **Hero Carousel**: Auto-sliding banners for promotions.
- **Category Pills**: Horizontal scrollable list of spice categories.
- **Today's Selection**: A 2-column grid showing the latest/featured products.
- **AI Search Bar**: Floating search entry point.

### 2. Product Detail Page
- **Multi-Image Carousel**: Interactive sliding for product gallery.
- **Offer Badges**: Display dynamic offers (e.g., "Buy 2 Get 1 Free").
- **Specifications Table**: Technical details (Weight, Origin, Shelf life).
- **"Buy Now" vs "Add to Cart"**: Fixed bottom action bar.

### 3. Shopping Cart
- **Persistent State**: Items remain in cart even after app restart.
- **Quantity Adjuster**: Real-time price updates.
- **Empty State**: Prompt to "Explore Spices" with a CTA.

### 4. Checkout & Payments
- **Address Entry**: Clean form with validation.
- **Payment Split**: 
    - **COD**: Direct success redirection.
    - **Online**: Trigger Razorpay Mobile SDK.
- **Order Success**: Celebration animation (Lottie recommended) and "Track Order" button.

### 5. Admin Dashboard (WebView or Native)
- **Inventory Control**: Add/Edit/Delete products and categories.
- **Order Manifest**: Real-time list of customer orders with delivery status toggles.

---

## 📊 Database Schema (Supabase)

### Table: `products`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | BIGINT | Primary Key |
| `name` | TEXT | Product Name |
| `price` | NUMERIC | Discounted Price |
| `mrp` | NUMERIC | Original Price |
| `description` | TEXT | Markdown-supported story |
| `image_url` | TEXT | Main thumbnail |
| `images` | TEXT[] | Gallery of high-res images |
| `category_id` | BIGINT | Relation to Category |
| `offers` | TEXT[] | List of current deals |
| `specifications`| JSONB | Key-value pairs of specs |

### Table: `categories`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | BIGINT | Primary Key |
| `name` | TEXT | Category Title (e.g., Whole Spices) |

### Table: `orders`
| Column | Type | Description |
| :--- | :--- | :--- |
| `customer_name`| TEXT | Full Name |
| `phone` | TEXT | WhatsApp Number |
| `product_details`| JSONB | Array of items purchased |
| `total_amount` | NUMERIC | Final paid amount |
| `order_status` | TEXT | PENDING, SHIPPED, DELIVERED |

---

## 🤖 Guidance for AI Flutter Implementation

1. **State Management**: Use `Provider` or `Bloc` to handle the cart and product filters.
2. **Networking**: Use `dio` or `http` to connect to Supabase REST APIs.
3. **Icons**: Use `LucideIcons` or `RemixIcon` for a modern, thin-stroke look.
4. **Animations**: Implement `ImplicitAnimations` for page transitions and card hovers.
5. **WhatsApp**: Trigger a `url_launcher` intent to `https://wa.me/{vendor_number}?text={prefilled_message}` upon order completion.

---

Built with ❤️ for **Asali Swad**. Designed for scalability and premium user delight.
