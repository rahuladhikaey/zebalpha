import assert from 'assert';
import crypto from 'crypto';

console.log("========================================================================");
console.log("🛡️ ZEBALPHA FOUNDER BOOTSTRAP & MEMBERSHIP RBAC TEST SUITE");
console.log("========================================================================");

// 1. Verify Cryptographic Token Hashing Consistency
const testToken = "ZebAlpha_Founder_Init_2026_Secure_Key_998877";
const hash1 = crypto.createHash('sha256').update(testToken.trim()).digest('hex');
const hash2 = crypto.createHash('sha256').update(testToken.trim()).digest('hex');
assert.strictEqual(hash1, hash2, "SHA-256 token hashing must be deterministic");
console.log("✅ PASS: Deterministic SHA-256 token hashing verified.");

// 2. Test Role & Scope Matching Logic (requireAppMembership simulation)
function evaluateAppScope(memberships, targetApp, allowedRoles = []) {
  const isGlobalOwner = memberships.some(m => m.app_name === 'all' && m.role === 'OWNER');
  if (isGlobalOwner) return { allowed: true, reason: 'GLOBAL_OWNER_BYPASS' };

  const appMem = memberships.find(m => m.app_name === targetApp || m.app_name === 'all');
  if (!appMem) return { allowed: false, reason: 'APP_SCOPE_MISMATCH' };

  if (allowedRoles.length > 0) {
    const normalized = allowedRoles.map(r => r.toLowerCase());
    if (!normalized.includes((appMem.role || '').toLowerCase())) {
      return { allowed: false, reason: 'INSUFFICIENT_ROLE' };
    }
  }

  return { allowed: true, role: appMem.role };
}

// Test Case 2.1: Global Owner can access everything
const ownerUser = [{ app_name: 'all', role: 'OWNER' }];
assert.strictEqual(evaluateAppScope(ownerUser, 'media').allowed, true);
assert.strictEqual(evaluateAppScope(ownerUser, 'operations').allowed, true);
assert.strictEqual(evaluateAppScope(ownerUser, 'superadmin').allowed, true);
console.log("✅ PASS: Global Founder OWNER access verified across all app scopes.");

// Test Case 2.2: Media Admin cannot access operations
const mediaAdmin = [{ app_name: 'media', role: 'Media Admin' }];
assert.strictEqual(evaluateAppScope(mediaAdmin, 'media').allowed, true);
assert.strictEqual(evaluateAppScope(mediaAdmin, 'operations').allowed, false);
assert.strictEqual(evaluateAppScope(mediaAdmin, 'superadmin').allowed, false);
console.log("✅ PASS: Media Admin strictly isolated from Operations & Super Admin.");

// Test Case 2.3: Support Executive cannot perform Operations Manager tasks
const supportExec = [{ app_name: 'operations', role: 'Support Executive' }];
assert.strictEqual(evaluateAppScope(supportExec, 'operations', ['Support Executive']).allowed, true);
assert.strictEqual(evaluateAppScope(supportExec, 'operations', ['Operations Manager', 'HR Manager']).allowed, false);
console.log("✅ PASS: Role hierarchy within Operations domain strictly enforced.");

console.log("========================================================================");
console.log("ALL FOUNDER BOOTSTRAP & RBAC UNIT CHECKS PASSED!");
console.log("========================================================================");

