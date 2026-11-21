import test from "node:test";
import assert from "node:assert/strict";

import {
  computeGstinChecksum,
  redactPiiForLogs,
  validateEnrolmentIdFormat,
} from "../src/shared/utils/indianGstCompliance";
import {
  GstnGspVerificationService,
  SandboxGspTransport,
} from "../src/shared/services/gstnGspService";

function makeSampleRegularTaxId(stateCode: string, pan10: string, entity = "1"): string {
  const prefix14 = `${stateCode}${pan10}${entity}Z`;
  return `${prefix14}${computeGstinChecksum(prefix14)}`;
}

test("TC-01: Valid Enrolment ID passes format validation and Sandbox verification (no PAN needed)", async () => {
  const enrolmentId = "19E000123456789";
  const fmt = validateEnrolmentIdFormat(enrolmentId);
  assert.equal(fmt.valid, true);
  assert.equal(fmt.stateName, "West Bengal");

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

test("TC-02: Invalid length, bad state code, or regular tax ID is rejected in Enrolment ID field", async () => {
  assert.equal(validateEnrolmentIdFormat("SHORT123").valid, false);
  assert.equal(validateEnrolmentIdFormat("99E000123456789").valid, false);
  assert.equal(validateEnrolmentIdFormat(makeSampleRegularTaxId("19", "ABCPA1234F")).valid, false);
});

test("TC-03: Fake / non-existent and cancelled Enrolment IDs are blocked by adapter", async () => {
  const svc = new GstnGspVerificationService({ transport: new SandboxGspTransport() });

  const notFound = await svc.verifyEnrolmentId({ enrolmentId: "19NOTFND1234567" });
  assert.equal(notFound.verified, false);
  assert.equal(notFound.outcome, "invalid");

  const cancelled = await svc.verifyEnrolmentId({ enrolmentId: "19CANCL12345678" });
  assert.equal(cancelled.verified, false);
  assert.equal(cancelled.outcome, "cancelled");
});

test("TC-04: Stolen Enrolment ID caught by Mobile or Email mismatch (without PAN)", async () => {
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

test("TC-05: Unconfigured adapter, timeout, expired token refresh, malformed payload & PII redaction handled safely", async () => {
  const enrolmentId = "19E000123456789";

  const unavail = await new GstnGspVerificationService({
    transport: new SandboxGspTransport({ simulateUnavailable: true }),
    maxRetries: 1,
  }).verifyEnrolmentId({ enrolmentId });
  assert.equal(unavail.verified, false);
  assert.equal(unavail.manualReviewRequired, true);

  const timeout = await new GstnGspVerificationService({
    transport: new SandboxGspTransport({ simulateTimeout: true }),
    timeoutMs: 25,
    maxRetries: 1,
  }).verifyEnrolmentId({ enrolmentId });
  assert.equal(timeout.verified, false);
  assert.equal(timeout.outcome, "timeout");

  const tokenTransport = new SandboxGspTransport({ simulateExpiredTokenOnce: true });
  const refreshed = await new GstnGspVerificationService({ transport: tokenTransport }).verifyEnrolmentId({
    enrolmentId,
  });
  assert.equal(refreshed.verified, true);
  assert.equal(tokenTransport.getTokenRefreshCount(), 1);

  const malformed = await new GstnGspVerificationService({
    transport: new SandboxGspTransport({ simulateInvalidResponse: true }),
  }).verifyEnrolmentId({ enrolmentId });
  assert.equal(malformed.verified, false);
  assert.equal(malformed.outcome, "invalid_response");

  const redacted = redactPiiForLogs({ mobile_number: "9876543210", email: "a@b.com", safe: "ok" });
  assert.equal(redacted.mobile_number, "[REDACTED]");
  assert.equal(redacted.email, "[REDACTED]");
  assert.equal(redacted.safe, "ok");
});
