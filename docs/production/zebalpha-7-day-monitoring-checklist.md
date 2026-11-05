# ZebAlpha — 7-Day Production Monitoring Checklist & Alert Thresholds

**Target Release:** Customer Intelligence & Live User Monitoring  
**Target Environments:** Android Native App (`com.zebalpha.customer`), Web Storefront (`zebalpha.shop`), Super Admin (`admin.zebalpha.shop`)  
**Monitoring Duration:** 7 Days Post-Deployment

---

## 1. Daily Production Telemetry Schedule

| Day | Primary Focus Area | Verification Criteria | Alert Threshold |
| :--- | :--- | :--- | :--- |
| **Day 1** | Session tracking & Heartbeat health | Heartbeat traffic is steady, no DB connection exhaustion | DB Connections > 70% |
| **Day 2** | Multi-device & Online/Offline accuracy | Deduplication verified on multi-tab/multi-device shoppers | Online count > 3x total daily visitors |
| **Day 3** | Login tracking & Method distribution | Email & Google OAuth logins logged with masked PII | Failed login rate > 15% |
| **Day 4** | Order lifecycle & Net revenue match | Net delivered revenue strictly matches Settlement Ledger | Financial variance > 0.00% |
| **Day 5** | Partial returns & Refund adjustments | Returned items deducted from net revenue and CLV | Unmatched refund items > 0 |
| **Day 6** | Super Admin access & RBAC audit | All profile inspections recorded in `customer_audit_logs` | Unauthenticated profile read > 0 |
| **Day 7** | Full Weekly Review & Segment Stability | New, Repeat, Loyal segment distribution verified stable | Error rate > 0.5% |

---

## 2. Comprehensive 12-Point Monitoring Matrix

### 1. Android vs Website Active Customer Counts
- **Metric:** Split ratio of online users (`platform === 'android'` vs `'website'`).
- **Baseline:** Expected 65–75% Android mobile app, 25–35% Website.
- **Alert:** Sudden drop to 0% for either platform signals client tracker regression.

### 2. Unique Customers vs Active Sessions
- **Metric:** Ratio of `currentlyOnlineTotal` to raw active rows in `customer_sessions`.
- **Expected Ratio:** 1.0 to 1.3 sessions per customer.
- **Alert:** Ratio > 3.0 indicates session leak or failure of pagehide beacon cleanup.

### 3. Guest vs Registered Shoppers
- **Metric:** Proportion of anonymous guest browsing sessions to authenticated users.
- **Verification:** Ensure guest sessions transition cleanly to user sessions upon sign-in.

### 4. Registration Count Accuracy
- **Metric:** `kpis.registeredCount` matches `SELECT count(*) FROM public.profiles`.
- **Alert:** Discrepancy between dashboard registered count and profiles table.

### 5. New, Repeat, and Loyal Segmentation
- **Metric:** Segment transitions when customers receive order delivery updates.
- **Verification:** Confirm customer moves from `New` to `Repeat` on second delivered order.

### 6. Delivered Order & Net Revenue Parity
- **Metric:** `kpis.totalDeliveredRevenue` equals sum of non-cancelled, non-refunded delivered orders.
- **Formula:** Net Revenue = $\sum (\text{total\_amount} - \text{refund\_amount})$.
- **Alert:** Financial variance > ₹0.00 between Customer Intelligence and Settlements.

### 7. Partial Return and Refund Deductions
- **Metric:** Partial return events correctly decrement customer net purchase value.
- **Verification:** Partially returned orders count toward delivered frequency but reflect reduced net value.

### 8. Customer Retention & CLV Calculations
- **Metric:** 7-Day, 30-Day, and 90-Day cohort retention percentages.
- **Expected Range:** 7-Day (15–30%), 30-Day (20–45%), 90-Day (25–50%).

### 9. Heartbeat Failure & Inactivity Timeout Rates
- **Metric:** Percentage of sessions cleaned up via timeout vs explicit `action=end` beacon.
- **Expected:** ~70% beacon cleanup, ~30% server timeout fallback (mobile app kills).

### 10. API Latency & Database Performance
- **Target Metrics:**
  - `/api/analytics/heartbeat`: p95 < 25 ms, p99 < 50 ms.
  - `/api/admin/customer-intelligence`: p95 < 120 ms, p99 < 200 ms.
- **Alert:** Endpoint p95 > 250 ms.

### 11. Unauthorized Access Attempts
- **Metric:** HTTP 401/403 responses on `/api/admin/customer-intelligence*`.
- **Alert:** Any spike (> 5 events in 10 minutes) generates security incident alert.

### 12. Super Admin Dashboard Load Times
- **Metric:** Time to interactive (TTI) for the Customer Intelligence tab.
- **Target:** < 1.2s on high-speed internet, < 2.5s on 3G.

---

## 3. Incident Escalation Protocol

1. **P1 (Critical):** Checkout impacted, financial discrepancy, or data leak $\rightarrow$ **Execute immediate Rollback Runbook**; notify founder immediately.
2. **P2 (Major):** Heartbeat API latency > 500ms or online user count divergence $\rightarrow$ Adjust inactivity timeout or throttle client heartbeat from 45s to 60s.
3. **P3 (Minor):** UI cosmetic or filter sorting misalignment $\rightarrow$ Fix in scheduled maintenance window.

