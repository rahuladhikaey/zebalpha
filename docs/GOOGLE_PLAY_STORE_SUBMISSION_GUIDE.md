# 🚀 ZEBALPHA - Google Play Store Publishing & Host Guide
**All Guidelines, Assets & Step-by-Step Instructions**

---

## 📁 1. Generated Assets & Release Bundle

All Play Store assets have been generated and packaged in the [`playstore-assets`](file:///d:/Full%20Folder%2077/playstore-assets) directory:

| Asset Name | Resolution / Format | File Path | Status |
| :--- | :--- | :--- | :--- |
| **Android App Bundle** | `.aab` (Signed Release) | [`playstore-assets/app-release.aab`](file:///d:/Full%20Folder%2077/playstore-assets/app-release.aab) | ✅ Ready to Upload |
| **App Icon** | 512 × 512 px (32-bit PNG) | [`playstore-assets/playstore_icon_512x512.png`](file:///d:/Full%20Folder%2077/playstore-assets/playstore_icon_512x512.png) | ✅ Ready |
| **Feature Graphic Banner** | 1024 × 500 px (PNG) | [`playstore-assets/playstore_feature_graphic_1024x500.png`](file:///d:/Full%20Folder%2077/playstore-assets/playstore_feature_graphic_1024x500.png) | ✅ Ready |
| **Phone Screenshots** | Mobile 390 × 844 px | [`playstore-assets/screenshots/`](file:///d:/Full%20Folder%2077/playstore-assets/screenshots/) | ✅ 4 Screenshots Ready |

---

## 🛠️ 2. Changes Made for Google Play Store Policy Compliance

Google Play has strict policy rules regarding user data, account deletion, and transparency. The following code and policy components were built:

1. **Account Deletion Web Page (Mandatory Google Play Requirement)**:
   - Built: [`zebalpha-customer/src/app/(customer)/account-deletion/page.tsx`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/app/(customer)/account-deletion/page.tsx)
   - Public Live URL: `https://zebalpha.shop/account-deletion`
   - Purpose: Google Play requires that any app with user registration must have a publicly accessible web URL where users can request their account and data to be deleted.
2. **In-App Account Deletion Link**:
   - Updated: [`zebalpha-customer/src/app/(customer)/profile/page.tsx`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/app/(customer)/profile/page.tsx)
   - Purpose: Users can directly tap "Delete Account" inside their profile settings.
3. **Privacy Policy Compliance Update**:
   - Updated: [`zebalpha-customer/src/app/(customer)/privacy-policy/page.tsx`](file:///d:/Full%20Folder%2077/zebalpha-customer/src/app/(customer)/privacy-policy/page.tsx)
   - Public Live URL: `https://zebalpha.shop/privacy-policy`
   - Added direct clause and hyperlink to the account deletion page.

---

## 📝 3. Store Listing Copy (Copy-Paste directly into Google Play Console)

### **App Name** (Max 30 characters)
```text
ZEBALPHA - Premium Streetwear
```

### **Short Description** (Max 80 characters)
```text
Discover exclusive drops, luxury streetwear & contemporary premium fashion.
```

### **Full Description** (Max 4000 characters)
```markdown
Welcome to ZEBALPHA – The Ultimate Destination for Contemporary Fashion & Premium Streetwear.

Elevate your personal aesthetic with ZEBALPHA. Explore high-end streetwear, curated drops, oversized silhouettes, avant-garde styles, and luxury essentials tailored for the modern trendsetter.

✦ WHAT MAKES ZEBALPHA UNIQUE?

1. EXCLUSIVE DROPS & CURATED APPAREL
Get early access to limited edition clothing, unisex oversized tees, designer hoodies, trousers, and accessories crafted from premium fabrics.

2. SEAMLESS & ULTRA-FAST SHOPPING
Enjoy a fluid, native app experience with instant category navigation, real-time inventory updates, and high-resolution lookbooks.

3. REWARD COINS & ALPHA CARDS
Earn reward coins on your purchases, unlock exclusive boutique discounts, and track your VIP member tier directly within your profile.

4. 100% SECURE CHECKOUT
Shop with complete peace of mind. We support all major secure payment channels including UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, Net Banking, and Cash on Delivery (COD), processed with bank-grade encryption.

5. FAST SHIPPING & LIVE ORDER TRACKING
Track your package from dispatch to your doorstep with real-time tracking notifications and dedicated logistics partners.

6. HASSLE-FREE RETURNS & REPLACEMENTS
Enjoy an easy return and replacement policy with doorstep pick-up and instant status updates.

✦ CONTACT & CUSTOMER SUPPORT
Have questions or feedback? We are here for you!
- Website: https://zebalpha.shop
- Customer Support Email: support@zebalpha.shop
- Privacy Policy: https://zebalpha.shop/privacy-policy
- Account Deletion: https://zebalpha.shop/account-deletion

Download ZEBALPHA today and redefine your wardrobe with luxury streetwear!
```

---

## 📋 4. App Details & Store Settings

- **App Category**: `Shopping`
- **Tags**: `Shopping`, `Clothing`, `Fashion`, `Online Shopping`
- **Developer Contact Email**: `support@zebalpha.shop`
- **Developer Website**: `https://zebalpha.shop`
- **Developer Phone**: *(Your business phone number)*

---

## 🔒 5. Google Play Console: "App Content" & Policy Declarations

When filling out the **Policy > App content** section in Play Console, use these exact answers:

### A. Privacy Policy
- **Privacy Policy URL**: `https://zebalpha.shop/privacy-policy`

### B. App Access (Reviewer Login)
Google reviewers test the app. Because ZEBALPHA has authentication, provide credentials:
- Select: **All or some functionality in my app is restricted**
- Click **Add instructions**:
  - Name: `Demo Customer Account`
  - Username / Email: `demo.playstore@zebalpha.shop` (or your test email)
  - Password: `YourTestPassword123`
  - Notes: `Reviewers can log in with this account or browse public product catalog and categories without signing in.`

### C. Ads
- Select: **No, my app does not contain ads**

### D. Content Rating (IARC Questionnaire)
- Category: **Consumer Store / Commercial**
- Violence / Sexual content / Controlled substances: **No** to all.
- User Content sharing: No (Only e-commerce reviews/orders).
- Resulting Rating: **Everyone (3+)** or **Teen (13+)**.

### E. Target Audience and Content
- Target age group: **18 and over** (and/or 13-17)
- Could your store listing unintentionally appeal to children?: **No**

### F. News App / Government App / Financial Features
- Is this a news app?: **No**
- Is this a government app?: **No**
- Financial Features: **E-commerce / Shopping Checkout** (Using licensed third-party payment gateway Razorpay, PCI-DSS compliant).

### G. Data Safety Section (Crucial!)
| Question | Answer | Details |
| :--- | :--- | :--- |
| Does your app collect or share user data? | **Yes** | Standard e-commerce data |
| Is all user data encrypted in transit? | **Yes** | All requests use HTTPS/TLS |
| Do you provide a way for users to request data deletion? | **Yes** | Provide URL: `https://zebalpha.shop/account-deletion` |

**Data types collected:**
1. **Personal info**:
   - Name (App functionality, Account management)
   - Email address (App functionality, Account management)
   - Phone number (Order delivery, Account management)
   - Physical Address (Order shipping & fulfillment)
2. **Financial info**:
   - Purchase history (App functionality, invoices)
   - Payment info (Handled directly by certified payment processor, not stored in app)
3. **App info and performance**:
   - Diagnostics / Crash logs (App performance)

---

## 👥 6. Important: The 20-Testers Rule (For Personal Accounts)

> [!IMPORTANT]
> **Google Play 20-Testers Requirement:**
> - If your Google Play Developer Console account is a **Personal** account registered after **November 13, 2023**, Google mandates that you must run a **Closed Test** with at least **20 testers** who opt-in for at least **14 consecutive days** before you can apply for Production access.
> - If your developer account is registered as an **Organization** (with D-U-N-S number), this 20-tester rule does NOT apply, and you can publish to Production directly.

### How to complete Closed Testing (if Personal account):
1. Create a Closed Testing track in Play Console.
2. Upload [`playstore-assets/app-release.aab`](file:///d:/Full%20Folder%2077/playstore-assets/app-release.aab).
3. Create an email list or Google Group of 20+ friends/colleagues.
4. Share the opt-in link with them.
5. Keep them enrolled for 14 days.
6. Once completed, the "Apply for Production" button will become active in Play Console.

---

## 🔄 7. How to Rebuild a New AAB in the Future

Whenever you update your code and need a new version for Play Store:

1. Open [`zebalpha-customer/android/app/build.gradle`](file:///d:/Full%20Folder%2077/zebalpha-customer/android/app/build.gradle) and increment `versionCode`:
   ```gradle
   versionCode 3        // Increment each release (e.g., 2 -> 3)
   versionName "1.0.2"  // Your version name
   ```
2. Run the build command in terminal:
   ```bash
   cd "d:\Full Folder 77\zebalpha-customer"
   npm run build:aab
   ```
   *(Or run `./gradlew bundleRelease` inside `zebalpha-customer/android`)*.
3. The new bundle will be at:
   `zebalpha-customer/android/app/build/outputs/bundle/release/app-release.aab`
