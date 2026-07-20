# 🌶️ Asali Swad — Premium eCommerce Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-blue?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![My Skills](https://skillicons.dev/icons?i=java,react,spring,mysql,android)](https://skillicons.dev)
[![Typing SVG](https://readme-typing-svg.demolab.com/?lines=Full+Stack+Developer;AI+Enthusiast;Java+Developer&center=true&width=500&height=50)](https://git.io/typing-svg)
## 📊 GitHub Stats

![Stats](https://github-readme-stats.vercel.app/api?username=rahuladhikaey&show_icons=true&theme=radical)

## 🔥 GitHub Streak

![Streak](https://streak-stats.demolab.com/?user=rahuladhikaey&theme=radical)
# Hi 👋 I'm Rahul

## 🚀 Skills
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=java&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

## 📊 GitHub Stats
![Stats](https://github-readme-stats.vercel.app/api?username=YOUR_USERNAME&show_icons=true&theme=radical)

## 🔥 Streak
![Streak](https://streak-stats.demolab.com/?user=YOUR_USERNAME&theme=radical)
A modern, high-performance eCommerce storefront for **Asali Swad**, specializing in handmade Bori and premium grocery products. Built with a focus on speed, user experience, and a seamless WhatsApp-based ordering system.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- A Supabase Project
- A GitHub Account

### 2. Local Installation
```bash
# Clone the repository
git clone https://github.com/rahuladhikaey/ownskill2.git
cd ownskill2/ecommerce-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the result.

---

## 🛠️ Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/) (App Router, Turbopack)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Order System:** WhatsApp Business Integration (Cash on Delivery)
- **Icons:** [Lucide React](https://lucide.dev/)

---

## 🔗 Database Connection (Supabase)

To connect your database, follow these steps in your [Supabase Dashboard](https://supabase.com/dashboard):

1. **Get Credentials**: Go to **Project Settings > API** and copy your `URL` and `anon public` key.
2. **Setup Tables**: Run the following SQL in the **SQL Editor**:
   - Create `categories`, `products`, and `orders` tables.
   - Refer to [ecommerce-app/README.md](./ecommerce-app/README.md#supabase-setup) for specific column schemas.
3. **Storage**: Create a **public** bucket named `product-images` for product photos.

---

## 🌐 Deployment & Hosting

This platform is optimized for modern hosting providers like **Render**, **Vercel**, or **Netlify**.

### 1. Deploying to Render / Vercel
1. Connect your GitHub repository to your hosting provider.
2. **Build Settings**:
   - **Framework Preset**: `Next.js`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `.next`
3. **Environment Variables**:
   Add the following variables to your project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`

### 2. Custom Domain
Most providers allow you to connect a custom domain (e.g., `asaliswad.com`) easily through their dashboard under **Settings > Domains**.

---

## 📂 Project Structure

```text
/
├── ecommerce-app/        # Main Next.js application
│   ├── src/app/          # Application routes and pages
│   ├── src/components/   # Reusable UI components
│   ├── src/lib/          # Supabase client and utilities
│   └── public/           # Static assets
└── Asali Swad pic/       # Original product photography and assets
```

---

## 📄 License

This project is licensed under the MIT License.

---

Developed with ❤️ for **Asali Swad**.
# asaliswad-is-back
