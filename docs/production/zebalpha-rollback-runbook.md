# ZebAlpha — Production Rollback & Recovery Runbook

**Service Scope:** Customer Intelligence, Session Heartbeats, Customer 360° Management, and Repeat Purchase Analytics  
**Associated Target Commits:** `0f82eba` / `a842363`  
**Authoritative Environment:** Supabase PostgreSQL Database & Vercel / Node Production Hosting

---

## 1. Rollback Trigger Criteria

A rollback must be initiated immediately if ANY of the following conditions occur after deployment:
1. **Critical Financial Inconsistency:** Net order revenue reported in Customer Intelligence deviates from the authoritative Settlement / Razorpay Ledger.
2. **Database Contention:** CPU or connection saturation caused by session heartbeats exceeding 85% sustained capacity.
3. **Checkout / Order Degradation:** Any regression in customer checkout, payment processing, or order placement.
4. **Security Alert:** Unauthorized bypass of Super Admin role verification or exposure of unmasked customer PII.

---

## 2. Emergency Rollback Procedures

### Step 1: Frontend & API Application Rollback (Zero Downtime)
If the application needs to be reverted to the pre-Customer-Intelligence baseline:

```bash
# 1. Identify stable pre-deployment tag/commit
git checkout 50d61b1

# 2. Verify clean working directory
git status

# 3. Deploy pre-deployment commit to production hosting
# (e.g. Vercel / Cloud Build / Server deploy pipeline)
```

The pre-deployment commit does not call `/api/analytics/heartbeat` or render the Customer Intelligence tab, instantly stopping all new session writes while preserving orders and product listings.

### Step 2: Database Schema & RLS Rollback (Non-Destructive)
> [!IMPORTANT]
> Never drop existing customer, order, or profile records. The rollback touches ONLY newly added analytics tables.

Execute the following SQL migration rollback script in Supabase SQL Editor:

```sql
-- SAFE ROLLBACK: Remove analytics auxiliary tables without affecting core e-commerce data
BEGIN;

-- 1. Drop telemetry and log tables
DROP TABLE IF EXISTS public.customer_audit_logs CASCADE;
DROP TABLE IF EXISTS public.customer_login_logs CASCADE;
DROP TABLE IF EXISTS public.customer_sessions CASCADE;
DROP TABLE IF EXISTS public.customer_segment_configs CASCADE;

-- 2. Confirm core tables remain 100% intact
SELECT count(*) FROM public.orders;
SELECT count(*) FROM public.profiles;
SELECT count(*) FROM public.products;
SELECT count(*) FROM public.sellers;

COMMIT;
```

---

## 3. Database Safety Verification

Before and after executing any migration or rollback:
1. **Automatic Backup Check:**
   - Verify that Supabase Point-in-Time Recovery (PITR) or daily snapshot is active.
2. **Data Isolation Guarantee:**
   - The analytics tables (`customer_sessions`, `customer_login_logs`, `customer_audit_logs`, `customer_segment_configs`) are strictly auxiliary.
   - Core transactional tables (`orders`, `profiles`, `products`, `sellers`, `payments`, `seller_orders`) have NO foreign key cascade dependencies on analytics tables.
   - Rolling back the analytics tables CANNOT delete, modify, or corrupt order or financial data.

---

## 4. Post-Rollback Verification Checklist

- [ ] Core checkout flow operational on Android and Web.
- [ ] Razorpay payment webhooks processing normally.
- [ ] Super Admin Overview Dashboard operational.
- [ ] No residual HTTP 500 errors in server logs.
- [ ] Incident logged in Super Admin Security Audit with root cause analysis.

