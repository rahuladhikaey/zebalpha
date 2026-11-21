import test from "node:test";
import assert from "node:assert/strict";

import {
  computeGstinChecksum,
  redactPiiForLogs,
  validateEnrolmentIdFormat,
  validateGstinFormat,
} from "../src/shared/utils/indianGstCompliance";
import {
  GstnGspVerificationService,
  SandboxGspTransport,
} from "../src/shared/services/gstnGspService";

function makeValidTestGstin(stateCode: string, pan10: string, entity = "1"): string {
  const prefix14 = `${stateCode}${pan10}${entity}Z`;
  return `${prefix14}${computeGstinChecksum(prefix14)}`;
}

test("TC-01: Valid GSTIN passes checksum + Sandbox GSP active verification (no PAN input needed)", async () => {
  const gstin = makeValidTestGstin("19", "ABCPA1234F");
  assert.equal(validateGstinFormat(gstin).valid, true);

  const svc = new GstnGspVerificationService({ transport: new SandboxGspTransport() });
  const res = await svc.verifyGstin({ gstin, submittedBusinessName: "ZebAlpha Sandbox Textiles" });
  assert.equal(res.verified, true);
  assert.equal(res.outcome, "verified");
  assert.equal(res.record?.registrationStatus, "Active");
  assert.equal(res.record?.stateName, "West Bengal");
});

test("TC-02: Invalid GSTIN format and bad checksum are rejected", async () => {
  assert.equal(validateGstinFormat("INVALID123").valid, false);
  const validGstin = makeValidTestGstin("19", "ABCPA1234F");
  const badCheck = `${validGstin.slice(0, 14)}${validGstin[14] === "0" ? "1" : "0"}`;
  assert.equal(validateGstinFormat(badCheck).valid, false);
});

test("TC-03: Cancelled GSTIN is blocked", async () => {
  const cancelledGstin = makeValidTestGstin("27", "CANCL1234F");
  const svc = new GstnGspVerificationService({ transport: new SandboxGspTransport() });
  const res = await svc.verifyGstin({ gstin: cancelledGstin });
  assert.equal(res.verified, false);
  assert.equal(res.outcome, "cancelled");
});

test("TC-04: Valid Enrolment ID verifies WITHOUT PAN via GSTN Real/Fake + Mobile/Email ownership check", async () => {
  const enrolmentId = "19E000123456789";
  assert.equal(validateEnrolmentIdFormat(enrolmentId).valid, true);

  const svc = new GstnGspVerificationService({ transport: new SandboxGspTransport() });
  const res = await svc.verifyEnrolmentId({ enrolmentId });
  assert.equal(res.verified, true);
  assert.equal(res.record?.registeredStateName, "West Bengal");

  const contact = await svc.validateEnrolmentContact({
    enrolmentId,
    mobile: "9876543210",
    email: "seller@sandbox-seller.in",
  });
  assert.equal(contact.verified, true);
  assert.equal(contact.mobileMatched, true);
  assert.equal(contact.emailMatched, true);
});

test("TC-05: Fake / non-existent Enrolment ID or regular GSTIN in Enrolment field is rejected", async () => {
  assert.equal(validateEnrolmentIdFormat(makeValidTestGstin("19", "ABCPA1234F")).valid, false);

  const svc = new GstnGspVerificationService({ transport: new SandboxGspTransport() });
  const res = await svc.verifyEnrolmentId({ enrolmentId: "19NOTFND1234567" });
  assert.equal(res.verified, false);
  assert.equal(res.outcome, "invalid");
});

test("TC-06: Stolen Enrolment ID caught by Mobile or Email mismatch (without PAN)", async () => {
  const svc = new GstnGspVerificationService({ transport: new SandboxGspTransport() });
  const mobileBad = await svc.validateEnrolmentContact({
    enrolmentId: "19E000123456789",
    mobile: "9000000001",
    email: "seller@sandbox-seller.in",
  });
  assert.equal(mobileBad.verified, false);
  assert.equal(mobileBad.mobileMatched, false);

  const emailBad = await svc.validateEnrolmentContact({
    enrolmentId: "19E000123456789",
    mobile: "9876543210",
    email: "other@example.com",
  });
  assert.equal(emailBad.verified, false);
  assert.equal(emailBad.emailMatched, false);
});

test("TC-07: GSP unavailable, timeout, expired token auto-refresh, and malformed Base64 handled safely", async () => {
  const gstin = makeValidTestGstin("19", "ABCPA1234F");

  const unavail = await new GstnGspVerificationService({
    transport: new SandboxGspTransport({ simulateUnavailable: true }),
    maxRetries: 1,
  }).verifyGstin({ gstin });
  assert.equal(unavail.verified, false);
  assert.equal(unavail.manualReviewRequired, true);

  const timeout = await new GstnGspVerificationService({
    transport: new SandboxGspTransport({ simulateTimeout: true }),
    timeoutMs: 25,
    maxRetries: 1,
  }).verifyGstin({ gstin });
  assert.equal(timeout.verified, false);
  assert.equal(timeout.outcome, "timeout");

  const tokenTransport = new SandboxGspTransport({ simulateExpiredTokenOnce: true });
  const refreshed = await new GstnGspVerificationService({ transport: tokenTransport }).verifyGstin({ gstin });
  assert.equal(refreshed.verified, true);
  assert.equal(tokenTransport.getTokenRefreshCount(), 1);

  const malformed = await new GstnGspVerificationService({
    transport: new SandboxGspTransport({ simulateInvalidResponse: true }),
  }).verifyGstin({ gstin });
  assert.equal(malformed.verified, false);
  assert.equal(malformed.outcome, "invalid_response");

  const redacted = redactPiiForLogs({ mobile_number: "9876543210", email: "a@b.com", safe: "ok" });
  assert.equal(redacted.mobile_number, "[REDACTED]");
  assert.equal(redacted.email, "[REDACTED]");
  assert.equal(redacted.safe, "ok");
});
