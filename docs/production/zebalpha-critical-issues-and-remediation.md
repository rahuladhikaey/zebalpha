# ZebAlpha — Critical Issues & Remediation Log

**Audit Baseline:** `19e69e6`  
**Purpose:** Historical tracking of discovered defects, root cause analyses, and implemented architectural remediations.

---

## 1. Discovered Issues & Remediation Summary

| Issue # | Component | Severity | Description | Remediation Applied | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE-01** | Super Admin Overview | **Medium** | "Registered Customers = 0 with Active Customers = 2" anomaly. | `page.tsx` now loads `profiles` via `supabase.from("profiles")` and merges guest buyer records. | **RESOLVED** |
| **ISSUE-02** | Super Admin Overview | **Medium** | "Top Product Revenue exists while Sales by Category shows zero". | Rewrote `categorySales` memo in `DashboardOverview.tsx` to handle UUID/string category IDs and parse both `product_details` and `items`. | **RESOLVED** |
| **ISSUE-03** | Customer Intelligence | **High** | Session hijacking risk if attacker sends another customer's `sessionId`. | Added database session ownership check in `heartbeat/route.ts`. | **RESOLVED** |
| **ISSUE-04** | Heartbeat Telemetry | **Medium** | Arbitrary session identifier injection vulnerability. | Added strict regex validation `/^[a-zA-Z0-9_\-\.]{8,128}$/` in `heartbeat/route.ts`. | **RESOLVED** |
| **ISSUE-05** | Customer Intelligence | **Low** | Multi-device active customer count inflation (1 customer with 2 tabs counted twice). | Deduplicated `currentlyOnlineTotal` by unique `user_id` across concurrent sessions. | **RESOLVED** |
| **ISSUE-06** | Financial Ledger | **Medium** | Partial returns and refund deductions were not reducing net purchase revenue. | Implemented net revenue calculation: $\max(0, \text{total\_amount} - \text{refund\_amount})$. | **RESOLVED** |

---

## 2. In-Depth Root Cause Analyses

### Issue 01: Customer Metric Anomaly
* **Root Cause:** In `DashboardOverview.tsx`, `customerStats` computed `totalCustomers` from `customers.length`. However, `fetchData()` in `AdminPage.tsx` did not populate `setCustomers()`. Meanwhile, `activeCustomers` was derived from unique buyer names in `filteredOrders`.
* **Fix:** `AdminPage.tsx` now includes `supabase.from("profiles").select("*")` inside `Promise.all` and passes the resulting records as `customers`. Furthermore, `DashboardOverview.tsx` merges guest purchasers to guarantee $\text{Total Customers} \ge \text{Active Customers}$.

### Issue 02: Category Sales Discrepancy
* **Root Cause:** `categorySales` initialized `const catMap: Record<number, number> = {}` while Supabase uses UUID strings for `categories.id`. Additionally, orders storing items in `order.items` were overlooked.
* **Fix:** Updated lookup maps to support UUID strings and normalized lowercase category names, checking both `order.product_details` and `order.items`.
