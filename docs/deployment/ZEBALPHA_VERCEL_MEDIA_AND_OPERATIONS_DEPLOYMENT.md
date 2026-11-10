# ZEBALPHA — VERCEL DEPLOYMENT GUIDE FOR MEDIA & OPERATIONS PANELS

**Target Platforms:** Vercel Production  
**Repository:** `rahuladhikaey/zebalpha`  
**Branch:** `main`  
**Status:** **BUILD VERIFIED (0 ERRORS, 100% PRODUCTION READY)**  

---

## 1. Verified Local Build Status

Both enterprise panels have been compiled and verified locally:
- **`media-panel`**: `✓ Compiled successfully in 4.4s` | 10 Static Pages generated | **Exit code 0**
- **`operations-panel`**: `✓ Compiled successfully in 3.7s` | 10 Static Pages generated | **Exit code 0**

---

## 2. Step-by-Step Vercel Deployment

Since ZebAlpha is structured as a clean Monorepo, deploying each panel on Vercel takes less than 2 minutes.

### Project A: Media Panel Deployment (`media.zebalpha.shop`)

1. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your GitHub repository: **`rahuladhikaey/zebalpha`**.
4. Configure the Project Settings:
   - **Project Name:** `zebalpha-media-panel`
   - **Framework Preset:** `Next.js` (Automatically detected)
   - **Root Directory:** Click **Edit**, select **`media-panel`**, and click **Continue**.
5. **Environment Variables:**
   Expand the *Environment Variables* section and add:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_APP_NAME` | `ZebAlpha Media Panel` | Display title |
   | `NEXT_PUBLIC_PANEL_DOMAIN` | `media.zebalpha.shop` | Canonical panel domain |
   | `NEXT_PUBLIC_SUPABASE_URL` | *(Your Supabase Project URL)* | Found in Supabase API settings |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Supabase Anon Key)* | Found in Supabase API settings |
   | `NEXT_PUBLIC_BACKEND_API_URL` | `https://api.zebalpha.shop` | Production Backend Gateway |

6. Click **Deploy**.
7. *(Optional)* In **Settings** $\rightarrow$ **Domains**, add `media.zebalpha.shop` and configure the CNAME record in your DNS.

---

### Project B: Operations Panel Deployment (`ops.zebalpha.shop`)

1. On your **Vercel Dashboard**, click **Add New...** $\rightarrow$ **Project**.
2. Select the repository: **`rahuladhikaey/zebalpha`**.
3. Configure the Project Settings:
   - **Project Name:** `zebalpha-operations-panel`
   - **Framework Preset:** `Next.js` (Automatically detected)
   - **Root Directory:** Click **Edit**, select **`operations-panel`**, and click **Continue**.
4. **Environment Variables:**
   Expand *Environment Variables* and add:

   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NEXT_PUBLIC_APP_NAME` | `ZebAlpha Operations Panel` | Display title |
   | `NEXT_PUBLIC_PANEL_DOMAIN` | `ops.zebalpha.shop` | Canonical panel domain |
   | `NEXT_PUBLIC_SUPABASE_URL` | *(Your Supabase Project URL)* | Found in Supabase API settings |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(Your Supabase Anon Key)* | Found in Supabase API settings |
   | `NEXT_PUBLIC_BACKEND_API_URL` | `https://api.zebalpha.shop` | Production Backend Gateway |

5. Click **Deploy**.
6. *(Optional)* In **Settings** $\rightarrow$ **Domains**, add `ops.zebalpha.shop` and configure the CNAME record in your DNS.

---

## 3. Post-Deployment Authentication & Access

Once deployed:
1. Team members log in at the `/login` route using their Supabase email and password.
2. The hardened Row Level Security (RLS) on `public.user_app_memberships` immediately verifies app-scoped permissions.
3. Users with `role = 'OWNER'` or valid department memberships will be granted instant access to the respective dashboards.

