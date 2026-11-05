# ZEBALPHA — CUSTOMER RETENTION ANALYTICS LOGIC VALIDATION & FINAL HARDENING

**Baseline Target:** `fccbf91` / `93772a1`  
**Status:** Audit & Validation Completed — Ready for Staging Review  
**Deployment Policy:** No automatic deployment performed.

---

## 1. Executive Summary

This audit resolved the customer segment overlap issue and mathematically fortified the Customer Retention Rate Analytics engine in ZebAlpha.

### Key Corrections Implemented:
1. **Purchase Segment Exclusivity**:
   The primary Pie/Donut Chart now strictly reflects the **3 mutually exclusive purchase tiers**:
   - **New Customers**: $0 \text{–} 1$ Delivered Orders.
   - **Frequent / Repeat Customers**: $2 \text{–} 4$ Delivered Orders.
   - **Loyal Customers**: $5+$ Delivered Orders.
   
   Every registered customer belongs to **exactly one** segment ($New \cup Repeat \cup Loyal = \text{Registered Customers}$, with empty pairwise intersections). Their percentages sum to **100.0%**.

2. **Decoupling of Activity and Purchase States**:
   - Inactive Customers ($30+$ days dormant) and Cart Abandoners ($24\text{h}+$ unpurchased cart) have been **removed from the primary pie chart slices** so they no longer cause segment overlap or distort purchase percentages.
   - They are calculated and presented in a dedicated **Customer Activity & Operational Pipeline** panel alongside Active Customers and Guest Shoppers.

3. **Standard Repeat Purchase Rate Denominator**:
   - Changed denominator from all signups to **customers with at least one delivered order**:
     $$\text{Repeat Purchase Rate} = \left(\frac{\text{Repeat} + \text{Loyal}}{\text{Customers with } \ge 1 \text{ Delivered Order}}\right) \times 100$$
   - Also provides `repeatShareOfRegistered` for macro-funnel visibility.

4. **Distinct Cohort Retention Metrics**:
   - **Purchase Retention**: Tracks whether customers who acquired their first delivered order returned to place a second delivered order within 7, 30, and 90 days.
   - **Visit Retention**: Tracks whether customers returned to the platform (recorded a session heartbeat or login) between day 1 and day 7, 30, or 90 after registration.

5. **Multi-Source Inactivity Determination**:
   - Inactivity ($30+$ days) now evaluates the maximum timestamp across all available activity records:
     $$\text{lastActive} = \max(\text{session\_heartbeat}, \text{latest\_order\_date}, \text{latest\_login\_timestamp}, \text{profile\_updated\_at}, \text{profile\_created\_at})$$
   - A customer is never classified as inactive merely because one activity source is missing.

6. **Cart Abandonment Accuracy**:
   - Requires valid `user_id`, item quantity $> 0$, and item age between $24\text{h}$ and $30\text{d}$ (excludes stale/expired sessions).
   - Validates that the user has not placed a subsequent valid order after adding the cart items.
   - Matches against purchased product IDs.
   - Deduplicates multiple cart items per user ($1\text{ user} = 1\text{ cart abandoner}$).
   - Displays `Unavailable` badge if the cart items table is offline or unreachable.

---

## 2. Database Sources & Schema Mapping

| Metric | Source Table(s) | Criteria / Filter |
| :--- | :--- | :--- |
| **Registered Customers** | `public.profiles` | Authenticated customer profiles (`is_guest = false`) |
| **Guest Visitors / Shoppers** | `customer_sessions`, `orders` | Unauthenticated sessions (`user_id IS NULL`) or guest checkout orders |
| **Delivered Orders** | `public.orders` | `order_status IN ('delivered', 'partially_returned')` AND `payment_status != 'FAILED'` |
| **Cancelled / Returned** | `public.orders` | `order_status IN ('cancelled', 'returned', 'refunded', 'rto', 'rejected')` |
| **Customer Last Active** | `customer_sessions`, `orders`, `customer_login_logs`, `profiles` | $\max(\text{heartbeat}, \text{order\_created}, \text{login\_created}, \text{updated\_at}, \text{created\_at})$ |
| **Cart Abandoners** | `public.cart_items`, `orders` | Cart items $\ge 24\text{h}$ and $\le 30\text{d}$ old without subsequent order or product purchase match |

---

## 3. Mathematical Formulas & Reconciliation

### 3.1 Primary Purchase Segment Distribution
For a given customer cohort with size $N_{\text{reg}}$:
$$\text{Pct}_{\text{New}} = \left(\frac{N_{\text{New}}}{N_{\text{reg}}}\right) \times 100, \quad \text{Pct}_{\text{Repeat}} = \left(\frac{N_{\text{Repeat}}}{N_{\text{reg}}}\right) \times 100, \quad \text{Pct}_{\text{Loyal}} = \left(\frac{N_{\text{Loyal}}}{N_{\text{reg}}}\right) \times 100$$
$$\text{Pct}_{\text{New}} + \text{Pct}_{\text{Repeat}} + \text{Pct}_{\text{Loyal}} \equiv 100.0\%$$
*(Reconciled on largest segment to eliminate floating point rounding error).*

### 3.2 Repeat Purchase Rate
$$\text{Repeat Purchase Rate} = \begin{cases} \frac{N_{\text{Repeat}} + N_{\text{Loyal}}}{N_{\text{Delivered} \ge 1}} \times 100 & \text{if } N_{\text{Delivered} \ge 1} > 0 \\ 0 & \text{otherwise} \end{cases}$$

### 3.3 Cohort Purchase Retention ($N\text{-Day}$)
$$\text{Purchase Retention}_{ND} = \frac{\text{Customers whose 2nd order was placed within } N \text{ days of 1st delivered order}}{\text{Customers whose 1st delivered order is } \ge N \text{ days old}} \times 100$$

### 3.4 Cohort Visit Retention ($N\text{-Day}$)
$$\text{Visit Retention}_{ND} = \frac{\text{Customers with platform activity between Day 1 and Day } N \text{ after registration}}{\text{Customers registered } \ge N \text{ days ago}} \times 100$$

---

## 4. Date Filter Consistency & Scope Documentation

The retention dashboard date filters (**All Time**, **Today**, **7 Days**, **30 Days**, **90 Days**, and **Custom**) enforce strict UTC and local boundaries:
- **Today**: `new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)` to `now`.
- **7 / 30 / 90 Days**: `new Date(now.getTime() - N * 86400000)` to `now`.
- **Custom**: `startDate + 'T00:00:00.000Z'` to `endDate + 'T23:59:59.999Z'`.

**Date Scope Documentation:**  
In the API and UI, the date filter represents the **Customer Acquisition Window** (`c.registration_date`), tracking the lifetime purchase segment tier (New, Repeat, Loyal) and activity status of customers acquired in that period.

---

## 5. Automated Test Evidence

Execution of `tests/production/customer-retention-rate-analytics.test.mjs`:

```
========================================================================
📊 ZEBALPHA CUSTOMER RETENTION LOGIC HARDENING & ACCURACY TEST SUITE
========================================================================

--- 1. Purchase Segment Exclusivity & Partitioning ---
  ✅ PASS: Every registered customer belongs to exactly one purchase segment (New, Repeat, Loyal)

--- 2. Exact 100% Percentage Reconciliation ---
  ✅ PASS: Primary purchase segment percentages strictly reconcile to 100.0%

--- 3. Overlapping Activity & Purchase States Decoupling ---
  ✅ PASS: A loyal customer who is inactive or has an abandoned cart is classified in Loyal for purchases, and tracked separately for activity

--- 4. Guest vs Registered Customer Separation ---
  ✅ PASS: Guest shoppers are isolated from registered customer purchase retention distribution

--- 5. Repeat Purchase Rate Standard Denominator ---
  ✅ PASS: Repeat purchase rate uses customers with >= 1 delivered order as denominator

--- 6. Cohort Retention: Purchase vs Visit Differentiation ---
  ✅ PASS: Visit retention tracks session/login returns, while purchase retention tracks second order placement

--- 7. Order Lifecycle: Partial Returns & Refunds ---
  ✅ PASS: Delivered orders with partial returns are counted as delivered, with net revenue deducted

--- 8. Date Filter Boundaries & Timezones ---
  ✅ PASS: Date filters enforce explicit UTC start (00:00:00.000) and end (23:59:59.999) timestamps

--- 9. Empty Database Resilience ---
  ✅ PASS: Zero-mock empty database returns 0s without NaN or division by zero errors

--- 10. Cart Abandonment Validation ---
  ✅ PASS: Cart item is not counted as abandoned if user subsequently placed an order or purchased the item

========================================================================
🏁 TEST EXECUTION COMPLETE: 10/10 TESTS PASSED
========================================================================
```

**Additional Gates Executed:**
- `customer-intelligence-final-gate.mjs`: **9 / 9 Passed**
- `complete-marketplace-health-gate.mjs`: **11 / 11 Passed**
- TypeScript Compilation across all workspaces: **0 errors**

---

## 6. Files Changed

1. `zebalpha-superadmin/src/app/api/admin/customer-intelligence/route.ts`
   - Separated registered customers from guest profiles in retention cohort.
   - Enforced 3 mutually exclusive purchase segments: New, Repeat, Loyal.
   - Implemented exact float percentage reconciliation to $100.0\%$.
   - Hardened Repeat Purchase Rate denominator to customers with $\ge 1$ delivered orders.
   - Added multi-source activity timestamp calculation.
   - Added separated visit vs purchase cohort retention calculations.
   - Enhanced cart abandonment detection with product matching and order check.
2. `zebalpha-superadmin/src/components/admin/CustomerRetentionChartCard.tsx`
   - Updated TypeScript interfaces (`RetentionSegment`, `RetentionActivityMetrics`, `RetentionCardData`).
   - SVG Donut chart strictly renders the 3 non-overlapping purchase segments.
   - Central hole displays Repeat Purchase Rate % of buyers with cohort context.
   - Added dedicated Customer Activity & Operational Pipeline section for non-overlapping metrics (Active, Inactive, Cart Abandoners, Guest Shoppers).
   - Bottom status row updated with purchase vs visit retention.
3. `tests/production/customer-retention-rate-analytics.test.mjs`
   - 10 automated test suites covering exclusivity, reconciliation, decoupling, guest isolation, denominators, partial refunds, date boundaries, and empty DB states.
4. `docs/analytics/zebalpha-customer-retention-logic-validation.md`
   - Comprehensive validation report.

---

## 7. Unresolved Issues & Recommendations
- **No unresolved issues or blocking defects identified.**
- **Recommendation:** Keep `public.cart_items` RLS verified so the service role can query unpurchased carts reliably in staging and production. If cart data is ever offline, the UI automatically displays the `Unavailable` badge rather than inventing numbers.

