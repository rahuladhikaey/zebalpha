# 🔑 ZEB-ALPHA — Secret Management & Credential Rotation Runbook

## Overview
This document outlines the standard operating procedure for rotating sensitive credentials, API keys, and cryptographic secrets across the ZEB-ALPHA platform. 

> [!IMPORTANT]
> **Zero-Exposure Policy**: Real secret values are never committed to version control, logs, or documentation. All environment files (`.env`, `.env.local`, `.env.production`) must be excluded in `.gitignore`.

---

## 1. Inventory of Sensitive Secrets

| Secret Name | Scope / Service | Sensitivity | Risk if Compromised | Recommended Rotation Frequency |
| :--- | :--- | :--- | :--- | :--- |
| `ADMIN_ACCESS_KEY_1` | `zebalpha-superadmin` | **CRITICAL** | Unauthorized access to admin portal factor 1 | 90 days |
| `ADMIN_ACCESS_KEY_2` | `zebalpha-superadmin` | **CRITICAL** | Unauthorized access to admin portal factor 2 | 90 days |
| `ADMIN_JWT_SECRET` | `zebalpha-superadmin` | **CRITICAL** | Forgery of admin session tokens | 90 days |
| `JWT_SECRET` | `zebalpha-backend` | **CRITICAL** | Forgery of user/seller API tokens | 90 days |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend & Superadmin | **CRITICAL** | Direct database bypass of all RLS policies | Immediately if exposed, otherwise 180 days |
| `POSTGRES_DB_PASSWORD` | Backend Direct Connection | **CRITICAL** | Direct database read/write access | 180 days |
| `RAZORPAY_KEY_SECRET` | Customer & Backend | **CRITICAL** | Forgery of payment confirmation webhooks | 180 days |
| `SHIPROCKET_PASSWORD` | Backend & Superadmin | **HIGH** | Unauthorized shipment creation / tracking leaks | 90 days |
| `CRON_SECRET` | Backend & Cron Jobs | **HIGH** | Unauthorized triggering of heavy maintenance jobs | 180 days |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Customer & Seller UI | **MEDIUM** | Standard public access (constrained by RLS) | As needed |

---

## 2. Generating High-Entropy Cryptographic Secrets

Use modern cryptographic tools (such as OpenSSL or Node.js crypto) to generate production-grade keys. Never use dictionary words or predictable patterns.

### Generating 256-bit Hexadecimal Keys (e.g., for JWT Secrets, Cron Secret):
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### Generating High-Entropy Passphrases (e.g., for Admin Access Keys):
```bash
# Using Node.js base64url
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

---

## 3. Step-by-Step Rotation Procedures

### Procedure A: Rotating Admin Two-Factor Keys (`ADMIN_ACCESS_KEY_1`, `ADMIN_ACCESS_KEY_2`)
1. Generate two new distinct 256-bit keys using the commands above.
2. In the hosting provider (e.g., Vercel / AWS / Docker Secrets), update:
   - `ADMIN_ACCESS_KEY_1=<new-key-1>`
   - `ADMIN_ACCESS_KEY_2=<new-key-2>`
3. Restart the `zebalpha-superadmin` service.
4. Notify authorized administrative personnel via secure out-of-band channels (e.g., encrypted password manager / hardware security keys).
5. Verify login by authenticating with the new dual keys on `/`.

### Procedure B: Rotating Backend & Admin JWT Secrets (`JWT_SECRET`, `ADMIN_JWT_SECRET`)
> [!NOTE]
> Rotating a JWT secret invalidates active sessions, requiring users and admins to re-authenticate. Schedule this during a scheduled maintenance window.
1. Generate a new 256-bit hexadecimal string.
2. Update `JWT_SECRET` in `zebalpha-backend` environment variables.
3. Update `ADMIN_JWT_SECRET` in `zebalpha-superadmin` environment variables.
4. Redeploy or restart services.
5. Verify that older tokens are rejected with HTTP 401 and new logins generate valid tokens.

### Procedure C: Rotating Supabase Service Role Key
1. Navigate to the **Supabase Dashboard** > **Project Settings** > **API**.
2. Under **Project API keys**, initiate rotation for the `service_role` secret.
3. Copy the newly generated `service_role` key.
4. Immediately update:
   - `zebalpha-backend/.env` -> `SUPABASE_SERVICE_ROLE_KEY`
   - `zebalpha-superadmin/.env.local` -> `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy updated environment configurations.
6. Verify that administrative queries and backend orders function as expected.

### Procedure D: Rotating Razorpay Key Secret
1. Log in to the **Razorpay Dashboard** > **Settings** > **API Keys**.
2. Click **Regenerate Key**. Razorpay provides an option to keep the old key active for 24 hours to ensure zero downtime.
3. Update `RAZORPAY_KEY_SECRET` in:
   - `zebalpha-backend/.env`
   - `zebalpha-customer/.env.local`
4. Deploy the new configuration.
5. Run a test transaction in staging to verify HMAC signature validation passes.
6. Deactivate the old key in the Razorpay dashboard once 24 hours have elapsed.

### Procedure E: Rotating Database Connection Password
1. In the Supabase Dashboard, go to **Project Settings** > **Database** > **Database Password** and click **Reset Database Password**.
2. Copy the new strong password.
3. Update the connection strings in `zebalpha-backend/.env`:
   - `DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[NEW_PASSWORD]@[HOST]:5432/postgres`
4. Restart the backend service.
5. Verify database connectivity using the health check route `/api/health`.

---

## 4. Best Practices for Production Secrets Management

1. **Avoid `.env` Files in Production Containers**: Use container secret injection (AWS Secrets Manager, Doppler, Vault, or Kubernetes Secrets) instead of baking `.env` files into container images.
2. **Access Separation**: Only senior infrastructure engineers should have permissions to view or edit production secrets in cloud consoles.
3. **Audit Log Inspection**: Periodically review audit logs for unexpected authentication attempts or secret retrieval operations.
