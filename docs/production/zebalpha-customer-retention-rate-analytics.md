# ZEBALPHA — PREMIUM CUSTOMER RETENTION RATE ANALYTICS CARD

## Architecture & Production Verification Summary

**Target Version:** ZebAlpha Super Admin Customer Intelligence  
**Component:** `zebalpha-superadmin/src/components/admin/CustomerRetentionChartCard.tsx`  
**API Endpoint:** `/api/admin/customer-intelligence` (Enriched with `retentionCard` payload)

---

### 1. Visual Design & Theme Alignment
The analytics card adheres strictly to the dark navy design language:
- **Card Background:** Dark navy gradient (`from-[#0c1322] via-[#090d16] to-[#04070e]`) with ambient radial glows (`sky-500/5` and `purple-500/5`).
- **Geometry:** Rounded `[2.5rem]` outer container with subtle `sky-950/70` borders.
- **Left Column:** High-precision SVG trigonometric Donut Chart ($cx=160, cy=160, R=135, r=75$):
  - Dynamic central donut hole displaying global **Repeat Rate %** by default.
  - Interactive hover state: highlights slice, adds SVG filter drop-shadow glow, and displays slice-specific customer count, name, and percentage share.
  - Percentage labels directly rendered on arc midpoints for slices $\ge 8\%$.
- **Right Column:** Enterprise customer category legend with:
  - Colored indicator dots corresponding to each segment.
  - Descriptive rule summary (e.g. `2–4 Delivered Orders`, `5+ Delivered Orders`).
  - Raw customer counts and colored percentage share badges.
  - Responsive micro progress bars.
- **Date Filtering Bar:** Real-time filter buttons (`All Time`, `Today`, `7 Days`, `30 Days`, `90 Days`, `Custom` date picker drawer).
- **Summary Metrics Row:** Bottom status bar displaying Total Registered, Guest Shoppers, Active vs Inactive ratio, and 30-Day Cohort Retention.

---

### 2. Customer Segmentation Rules (Zero Fake Data)

| Segment ID | Name | Color | Eligibility Rule |
| :--- | :--- | :--- | :--- |
| `new` | **New Customers** | Sky Blue (`#38BDF8`) | $\le 1$ Delivered Order completed |
| `repeat` | **Frequent / Repeat** | Amber (`#FBBF24`) | $2 \text{–} 4$ Delivered Orders completed |
| `loyal` | **Loyal Customers** | Purple (`#A855F7`) | $\ge 5$ Delivered Orders completed |
| `inactive` | **Inactive Customers** | Rose (`#F43F5E`) | No session activity or orders in $\ge 30$ days |
| `cart_abandoners` | **Cart Abandoners** | Orange (`#FB923C`) | Unpurchased items in `public.cart_items` for $\ge 24\text{h}$ without delivered order |

*Note on Cart Abandoners:* If `cart_items` is unavailable or empty in any deployment environment, the system displays an `Unavailable` badge rather than generating mock or random figures.

---

### 3. Mathematical Calculations & Formulas

1. **Segment Percentage:**
   $$\text{Percentage}_i = \left(\frac{\text{Count}_i}{\sum_{j} \text{Count}_j}\right) \times 100$$
2. **Repeat Purchase Rate:**
   $$\text{Repeat Rate} = \left(\frac{\text{Repeat Customers} + \text{Loyal Customers}}{\text{Total Customers}}\right) \times 100$$
3. **SVG Arc Geometry:**
   - Outer arc points: $x = cx + R \cos(\theta), y = cy + R \sin(\theta)$
   - Inner arc points: $x = cx + r \cos(\theta), y = cy + r \sin(\theta)$
   - Label centroid: $r_{\text{mid}} = \frac{R + r}{2}, \theta_{\text{mid}} = \theta_{\text{start}} + \frac{\Delta\theta}{2}$

---

### 4. Verification Test Results
- **Automated Test Suite:** `tests/production/customer-retention-rate-analytics.test.mjs` (6/6 tests passed)
- **Customer Intelligence Gate:** `tests/production/customer-intelligence-final-gate.mjs` (9/9 tests passed)
- **Marketplace Health Gate:** `tests/production/complete-marketplace-health-gate.mjs` (11/11 tests passed)
- **TypeScript Compilation:** 0 errors across customer, seller, and superadmin workspaces.
