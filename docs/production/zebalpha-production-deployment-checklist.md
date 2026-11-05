# ZebAlpha — Production Deployment Checklist

**Target Release:** Complete Marketplace-Wide Production Readiness  
**Target Commit:** `19e69e6`  
**Execution Condition:** Requires explicit founder authorization prior to execution.

---

## 1. Pre-Deployment Staging Verification

- [x] **Git Repository State:** `main` branch clean with 0 uncommitted changes.
- [x] **TypeScript Compilation:** 100% clean across all packages (`customer`, `seller`, `superadmin`).
- [x] **Automated Regression Suite:** 11/11 tests passing in `tests/production/complete-marketplace-health-gate.mjs`.
- [x] **Zero Mock Data:** Verified zero synthetic numbers, random generators, or fake success stubs in analytics and checkout.
- [x] **Database Migration Script:** Idempotent schema prepared in `supabase/customer_intelligence_and_live_analytics_schema.sql`.
- [x] **Rollback Runbook:** Prepared in `docs/production/zebalpha-rollback-runbook.md`.

---

## 2. Production Deployment Execution Steps

### Step 1: Database Schema Migration (Supabase SQL Editor)
Run the migration script on the production database:
```sql
-- File: supabase/customer_intelligence_and_live_analytics_schema.sql
-- Applies: customer_sessions, customer_login_logs, customer_audit_logs, customer_segment_configs
```
Verify that the 4 tables are created and RLS is enabled:
```sql
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'customer_%';
```

### Step 2: Super Admin & Customer App Deployment (Hosting / Vercel)
Deploy the latest commit (`19e69e6` or current main) to production hosting.
Verify production environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_ACCESS_KEY_1`
- `ADMIN_ACCESS_KEY_2`
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

### Step 3: Android App Bundle (Google Play Console)
- Current Closed Testing (Alpha) Track is running version `1.0.0 (1)`.
- If publishing a new build, build release bundle via Capacitor and upload to the Alpha track.

---

## 3. Post-Deployment Smoke Test (Immediate 15 Minutes)

- [ ] **Home Page:** Loads initial 20 products with responsive Cloudinary images and dark shimmer skeletons.
- [ ] **Live Customer Monitor:** Shows online customer count with real-time green pulsing dot.
- [ ] **Customer Login:** Successful sign-in records an event in `customer_login_logs` with masked email/phone.
- [ ] **Order Management:** Super Admin orders and Seller orders load without delay.
- [ ] **Customer 360° Profile:** Viewing a customer profile logs an access event in `customer_audit_logs`.
- [ ] **Financial Parity:** Customer delivered revenue matches the platform Settlement Ledger.

