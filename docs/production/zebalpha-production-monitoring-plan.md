# ZebAlpha — Production Monitoring & Incident Response Plan

**Scope:** Customer App, Website, Seller Panel, Super Admin Dashboard, and Database  
**Operational Standard:** 99.9% Uptime, Zero Financial Discrepancies, Sub-150ms Latency

---

## 1. Monitoring Metrics & Alerting Thresholds

| Area | Monitored Metric | Target Value | Warning Threshold | Critical Incident Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Storefront** | Product Feed Latency | < 100 ms | > 250 ms | > 500 ms (or HTTP 5xx > 1%) |
| **Storefront** | Cumulative Layout Shift (CLS) | < 0.02 | > 0.05 | > 0.10 |
| **Telemetry** | Heartbeat Latency | < 30 ms | > 100 ms | > 250 ms |
| **Telemetry** | Zombie Session Inactivity Timeout | 120 seconds | > 150 seconds | > 300 seconds |
| **Finance** | Settlement Ledger Variance | ₹0.00 | > ₹0.00 | Any un-reconciled order |
| **Database** | Supabase Connection Pool Usage | < 50% | > 75% | > 85% |
| **Security** | Unauthorized Admin Access (401/403) | 0 events | > 3 / 10 mins | > 10 / 10 mins (IP Block) |

---

## 2. Telemetry Ingestion Architecture

```
[Customer Android App / Web]
         │
         ▼  (Every 45s while visible)
[/api/analytics/heartbeat]
         │  (Session regex & ownership check)
         ▼
[public.customer_sessions]
         │
         ▼  (Queried with 120s cutoff)
[Super Admin Live Customer Monitor]
```

---

## 3. Incident Severity Levels & Response Protocols

### Severity 1 (Critical)
* **Definition:** Checkout failure, payment processing disruption, financial ledger discrepancy, or unauthorized data access.
* **Response Action:**
  1. Trigger immediate incident bridge.
  2. If caused by recent code change, execute [Rollback Runbook](file:///d:/Full%20Folder%2077/docs/production/zebalpha-rollback-runbook.md).
  3. Notify founder within 15 minutes.

### Severity 2 (Major)
* **Definition:** Slow API response times (> 500ms), elevated failed login rates, or telemetry backlog.
* **Response Action:**
  1. Inspect Supabase query performance and active connection pools.
  2. If heartbeat traffic is high, increase client heartbeat interval from 45s to 60s.
  3. Resolve within 2 hours.

### Severity 3 (Minor)
* **Definition:** Cosmetic UI misalignment, category filter sort ordering, or non-blocking analytics display delay.
* **Response Action:**
  1. Schedule resolution in standard development sprint.

