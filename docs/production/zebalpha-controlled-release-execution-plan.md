# ZEBALPHA — CONTROLLED PRODUCTION RELEASE EXECUTION PLAN

**Release Target:** Customer Retention Analytics & Customer Intelligence Engine  
**Release Identifier:** `v2.4.0-customer-retention-intelligence`  
**Verified Baseline Target:** `a2836f0` / `c4f7105`  
**Branch:** `main` (Synchronized with `origin/main`)  
**Authorization Policy:** Preparation and staging verification only — **Awaiting Explicit Founder Authorization**.

---

## 1. Pre-Deployment Verification

### 1.1 Environment Configuration Audit
Ensure the following server-side environment variables are configured in the production environment before executing any stage:

| Environment Variable | Required Location | Security Boundary | Purpose |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel / Client Hosts | Public / Client | Supabase Gateway URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel / Client Hosts | Public / Client | Anon client authorization |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Hosts Only (Admin & API) | **Strictly Server-Side** | Privileged RLS bypass for customer 360 aggregations |
| `SUPERADMIN_KEY_1` | Super Admin Host Only | **Strictly Server-Side** | Dual-key cryptographic token 1 |
| `SUPERADMIN_KEY_2` | Super Admin Host Only | **Strictly Server-Side** | Dual-key cryptographic token 2 |
| `RAZORPAY_KEY_SECRET` | Server Hosts Only | **Strictly Server-Side** | Webhook HMAC SHA256 signature verification |

> [!CAUTION]
> Under no circumstances must `SUPABASE_SERVICE_ROLE_KEY`, `SUPERADMIN_KEY_1`, `SUPERADMIN_KEY_2`, or `RAZORPAY_KEY_SECRET` be prefixed with `NEXT_PUBLIC_` or printed to client consoles.

### 1.2 Supabase Backup & Restore Readiness
* **Automatic Snapshot Verification:** Confirm daily Point-in-Time Recovery (PITR) is active under Supabase Dashboard $\to$ Project Settings $\to$ Database $\to$ Backups.
* **Pre-Migration Manual Snapshot:** Immediately before Stage 1 execution, navigate to Supabase Dashboard $\to$ Database $\to$ Backups and trigger a manual backup snapshot.
* **Recovery Point Objective (RPO):** $< 5 \text{ minutes}$.
* **Recovery Time Objective (RTO):** $< 15 \text{ minutes}$.

### 1.3 Row Level Security (RLS) Policy Audit
All four new tables implement explicit RLS policies:
1. `public.customer_sessions`:
   - `Allow public session heartbeats`: Authenticated and guest clients can insert/update their active sessions (`USING (true)`).
   - `Service role full access customer_sessions`: Full access for service role.
2. `public.customer_login_logs`:
   - `Allow public login event logging`: Insert-only for auth events (`FOR INSERT WITH CHECK (true)`).
   - `Service role full access customer_login_logs`: Read/Write for super admin.
3. `public.customer_audit_logs`:
   - `Service role full access customer_audit_logs`: Insert and Read restricted exclusively to `service_role` (`auth.role() = 'service_role'`).
4. `public.customer_segment_configs`:
   - `Allow public read segment configs`: Public select for client threshold sync (`FOR SELECT USING (true)`).
   - `Service role full access customer_segment_configs`: Read/Write restricted to service role.

### 1.4 Migration Dependencies & Foreign Key Cascade Safety
* **Dependencies:** None. The four new tables rely only on `auth.users(id)` with `ON DELETE SET NULL`.
* **Zero Impact on Core Tables:** No foreign key in `profiles`, `orders`, `products`, `sellers`, or `cart_items` references any of the four new tables.
* **Non-Destructive Rollback:**
  Executing `DROP TABLE IF EXISTS public.customer_sessions CASCADE` will **only** drop views or triggers directly attached to `customer_sessions`. It will **never** cascade into `profiles`, `orders`, or `auth.users`.

---

## 2. Staged Deployment Execution Sequence

> [!IMPORTANT]
> **Never deploy all platforms simultaneously.** Execute sequentially in five isolated stages. Run mandatory smoke tests and health checks after each stage before proceeding.

```
┌────────────────────────────────┐
│ Stage 1: Supabase DB Migration │
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│ Stage 2: Super Admin Dashboard │
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│ Stage 3: Customer Web Store    │
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│ Stage 4: Seller Panel          │
└───────────────┬────────────────┘
                ▼
┌────────────────────────────────┐
│ Stage 5: Android Internal AAB  │
└────────────────────────────────┘
```

---

### STAGE 1 — Supabase Production Schema Migration

* **Prerequisite:** Manual PITR snapshot completed.
* **Command / Action:**
  Execute SQL file via Supabase Production SQL Editor:
  `supabase/customer_intelligence_and_live_analytics_schema.sql`
* **Verification Steps:**
  1. Confirm table existence:
     ```sql
     SELECT table_name FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('customer_sessions', 'customer_login_logs', 'customer_audit_logs', 'customer_segment_configs');
     ```
  2. Confirm default configuration seed:
     ```sql
     SELECT * FROM public.customer_segment_configs WHERE id = 1;
     -- Expected: new_max_delivered=1, repeat_min_delivered=2, repeat_max_delivered=4, loyal_min_delivered=5, inactivity_timeout_seconds=120
     ```
* **Rollback Trigger Conditions:** SQL execution error, index failure, or schema lock contention $> 10 \text{s}$.
* **Rollback Command:**
  ```sql
  DROP TABLE IF EXISTS public.customer_sessions CASCADE;
  DROP TABLE IF EXISTS public.customer_login_logs CASCADE;
  DROP TABLE IF EXISTS public.customer_audit_logs CASCADE;
  DROP TABLE IF EXISTS public.customer_segment_configs CASCADE;
  ```

---

### STAGE 2 — Super Admin Dashboard Deployment

* **Prerequisite:** Stage 1 verified.
* **Build & Deploy Commands:**
  ```bash
  cd zebalpha-superadmin
  npm ci
  npm run build
  # Deploy to production hosting (Vercel / Cloudflare / Node)
  ```
* **Verification Steps:**
  1. Log in to Super Admin Dashboard with 2-Key cryptographic credentials.
  2. Navigate to **Customers** tab (`/dashboard?tab=customers`).
  3. Verify Donut Chart renders with 3 non-overlapping purchase segments (New, Repeat, Loyal) summing to $100.0\%$.
  4. Verify Operational Pipeline shows separate metrics (Active, Inactive, Cart Abandoners, Guest Shoppers).
  5. Verify Date Filter switches (Today, 7D, 30D, 90D, Custom) update chart without errors.
* **Rollback Trigger Conditions:** 500 error on `/api/admin/customer-intelligence`, missing donut chart, or authentication failure.
* **Rollback Command:**
  In Vercel / hosting console: click **Promote to Production** on previous deployment (`v2.3.9` / commit `0f82eba`). Rollback completes in $< 60 \text{ seconds}$.

---

### STAGE 3 — Customer Website Storefront Deployment

* **Prerequisite:** Stage 2 verified.
* **Build & Deploy Commands:**
  ```bash
  cd zebalpha-customer
  npm ci
  npm run build
  # Deploy to production hosting
  ```
* **Verification Steps:**
  1. Open production website in incognito browser.
  2. Verify guest session initialized and 45s heartbeat sent to `/api/analytics/heartbeat`.
  3. Log in with test customer account $\to$ verify login log created in `customer_login_logs`.
  4. Check Super Admin Live Monitor: verify online user count increments.
  5. Test browsing, cart addition, and checkout flow.
* **Rollback Trigger Conditions:** Cart or checkout degradation, heartbeat endpoint throwing 500s, or frontend layout shifts.
* **Rollback Command:**
  Re-promote previous deployment in website hosting console.

---

### STAGE 4 — Seller Panel Deployment

* **Prerequisite:** Stage 3 verified.
* **Build & Deploy Commands:**
  ```bash
  cd zebalpha-seller
  npm ci
  npm run build
  # Deploy to production hosting
  ```
* **Verification Steps:**
  1. Log in to Seller Panel with verified seller account.
  2. Verify seller dashboard, orders list, and 0% commission settlement display.
* **Rollback Trigger Conditions:** Seller authentication error or order list query failure.
* **Rollback Command:**
  Re-promote previous deployment in seller hosting console.

---

### STAGE 5 — Android Mobile App (Internal Testing Track Rollout)

* **Prerequisite:** Stage 3 verified and stable for at least 2 hours.
* **Build & Deploy Commands:**
  ```bash
  cd android
  ./gradlew bundleRelease
  ```
* **Rollout Cadence:**
  1. **Phase A:** Upload AAB to Google Play Console under **Internal Testing Track** (10 internal device testers).
  2. **Phase B:** Verify session tracking, push notifications, and checkout on physical Android devices.
  3. **Phase C (Staged Production):**
     - Day 1: 10% rollout
     - Day 2: 25% rollout
     - Day 3: 50% rollout
     - Day 4: 100% full production
* **Rollback Trigger Conditions:** App crash rate $> 0.1\%$, ANR rate $> 0.05\%$, or session tracking ANR.
* **Rollback Command:**
  In Google Play Console: click **Halt Rollout** immediately. The previous production version remains active for all users.

---

## 3. Deployment Safety & Monitoring Matrix

During and following release execution, monitor the following metrics in 15-minute intervals for the first 6 hours:

| Telemetry Channel | Healthy Threshold | Critical Regress Alert (Halt Rollout) |
| :--- | :--- | :--- |
| **API Error Rate (5xx)** | $< 0.05\%$ | $\ge 0.5\%$ across 5 minutes |
| **P95 API Latency** | $< 50 \text{ ms}$ | $> 250 \text{ ms}$ |
| **Checkout Success Rate** | $\ge 98.5\%$ | $< 95\%$ |
| **Razorpay Webhooks** | 100% Signature Match | Any failed signature verification |
| **Customer Sessions** | Heartbeats updated every 45s | Orphaned sessions accumulating without timeout |
| **Database Connection Pool** | $< 30\%$ capacity | $> 80\%$ capacity |

---

## 4. Required Founder Authorization Checkpoints

In strict compliance with governance rules, each step requires explicit sign-off:

- [ ] **Founder Checkpoint 1:** Authorization to execute **Stage 1** (Supabase Schema Migration).
- [ ] **Founder Checkpoint 2:** Authorization to deploy **Stage 2** (Super Admin Dashboard).
- [ ] **Founder Checkpoint 3:** Authorization to deploy **Stage 3** (Customer Website).
- [ ] **Founder Checkpoint 4:** Authorization to deploy **Stage 4** (Seller Panel).
- [ ] **Founder Checkpoint 5:** Authorization to upload **Stage 5** (Android Internal Testing Track).

---

## 5. Summary Verdict

### **STATUS: PASS — READY FOR FOUNDER AUTHORIZATION**

All pre-deployment verifications, migration idempotency checks, RLS audits, and platform rollback commands are documented and ready. The system is paused and awaiting explicit founder authorization before any production action.

