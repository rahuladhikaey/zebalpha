# 🚨 ZEB-ALPHA — Security Incident Response Runbook

## 1. Purpose & Incident Classification

This document defines standard incident response procedures for the ZEB-ALPHA Clothing E-Commerce platform to ensure rapid containment, forensic preservation, and swift recovery from security incidents.

### Severity Classification Matrix

| Severity Level | Definition | Examples | SLA to Initial Response |
| :--- | :--- | :--- | :--- |
| **P1 - CRITICAL** | Active compromise of administrative credentials, unauthorized database modifications, or successful financial/payment manipulation. | Admin portal access from unauthorized IP; tampered order totals accepted; database data wipe. | **< 15 Minutes** |
| **P2 - HIGH** | Exploitation of multi-tenant isolation, leaked service role keys, or elevated brute-force attacks against authentication endpoints. | Seller modifying another seller's inventory; public exposure of API keys; DDoS impairing checkout. | **< 1 Hour** |
| **P3 - MEDIUM** | Suspicious traffic patterns, isolated rate-limit triggers, or malformed API requests without evidence of breach. | Repeated failed login attempts on admin portal; localized scraping of catalog. | **< 4 Hours** |
| **P4 - LOW** | Minor security misconfigurations or informational audit alerts without operational risk. | Deprecated package warnings; non-sensitive client errors. | **< 24 Hours** |

---

## 2. Standard Incident Lifecycle

```
[ IDENTIFY ] ---> [ CONTAIN ] ---> [ ERADICATE ] ---> [ RECOVER ] ---> [ POST-MORTEM ]
```

1. **Identification**: Detect anomalous behavior via audit logs (`admin_audit_logs`, `payment_audit_logs`), monitoring alerts, or rate-limit triggers.
2. **Containment**: Immediately block the threat actor (IP ban, credential revocation, session termination) to prevent spread or data loss.
3. **Eradication**: Identify and patch the root cause; purge unauthorized data modifications; rotate all associated secrets.
4. **Recovery**: Restore verified services; validate system integrity; monitor closely for recurring activity.
5. **Post-Mortem**: Document timeline, impact, root causes, and corrective action items in an Incident Report.

---

## 3. Incident Playbooks

### Playbook A: Compromised Administrative Keys or Unauthorized Admin Login

#### Symptoms:
- Unexpected entries in `public.admin_audit_logs` with action `LOGIN_SUCCESS` from an unrecognized IP address or unusual timestamp.
- Multiple `LOGIN_LOCKED_OUT` events from external IP ranges.

#### Immediate Action Checklist:
1. **Immediate Revocation**:
   - Rotate `ADMIN_ACCESS_KEY_1`, `ADMIN_ACCESS_KEY_2`, and `ADMIN_JWT_SECRET` in environment variables.
   - Restart the `zebalpha-superadmin` application. Rotating `ADMIN_JWT_SECRET` immediately invalidates all active admin cookies across the board.
2. **Block Offending IP**:
   - Add the offending IP address or subnet to the cloud firewall / Cloudflare / WAF blocklist.
3. **Forensic Audit**:
   - Query `admin_audit_logs` to review all actions performed during the suspicious session:
     ```sql
     SELECT * FROM public.admin_audit_logs 
     WHERE created_at >= NOW() - INTERVAL '24 hours' 
     ORDER BY created_at DESC;
     ```
   - Check if any merchant payout settings, user roles, or bank details were modified.
4. **Data Verification**:
   - Verify `public.sellers`, `public.store_settings`, and `public.orders` for unauthorized mutations.
   - If alterations were made, revert records using database backup snapshots or manual restoration.

---

### Playbook B: Payment Tampering or Webhook Signature Anomaly

#### Symptoms:
- Order recorded with `payment_status = 'completed'` but corresponding Razorpay transaction amount does not match authoritative cart subtotal.
- Multiple failed payment signature errors in backend application logs.

#### Immediate Action Checklist:
1. **Quarantine Orders**:
   - Immediately update suspicious orders to `order_status = 'on_hold'` or `payment_status = 'under_review'`.
   - Prevent automatic shipment generation in Shiprocket for quarantined orders.
2. **Re-verify Payment Against Razorpay REST API**:
   - Execute an authoritative server-to-server check directly with Razorpay API:
     ```bash
     curl -u <KEY_ID>:<KEY_SECRET> https://api.razorpay.com/v1/payments/<PAYMENT_ID>
     ```
   - Verify that:
     - `amount` matches the database `total_amount * 100` in paise.
     - `status` is strictly `captured`.
     - `order_id` matches the internal `razorpay_order_id`.
3. **Fraudulent Order Cancellation**:
   - If payment is invalid or amount was manipulated, mark the order as `cancelled` and log the attempt in `payment_audit_logs`.
4. **IP Blacklist**:
   - Block client IP addresses that submitted forged payment signatures.

---

### Playbook C: Insecure Direct Object Reference (IDOR) or Cross-Tenant Breach

#### Symptoms:
- A seller reports products modified or deleted that they did not initiate.
- Logs show HTTP 403 or unauthorized updates attempted with mismatched seller IDs.

#### Immediate Action Checklist:
1. **Identify Actor**:
   - Inspect backend logs for `PUT /api/products/:id` or `DELETE /api/products/:id`.
   - Extract the authenticated seller ID (`req.user.id`) and target product ID.
2. **Account Suspension**:
   - Temporarily suspend the offending seller account in `public.sellers`:
     ```sql
     UPDATE public.sellers 
     SET status = 'suspended', is_suspended = true, suspension_reason = 'Suspected unauthorized access attempt' 
     WHERE id = '<OFFENDING_SELLER_ID>';
     ```
3. **Restore Impacted Inventory**:
   - Revert affected product records from transaction logs or database backups.

---

## 4. Forensic Log Preservation Guidelines

When an incident is declared:
1. **Preserve Log Files**: Do not restart container instances without archiving local `/var/log` and ephemeral logs.
2. **Export Database Audit Tables**: Export `admin_audit_logs` and `payment_audit_logs` to a timestamped archive:
   ```bash
   pg_dump -t public.admin_audit_logs -t public.payment_audit_logs [DATABASE_URL] > forensic_audit_$(date +%Y%m%d_%H%M%S).sql
   ```
3. **Chain of Custody**: Record the identity of investigators, dates, and exact commands used during evidence collection.
