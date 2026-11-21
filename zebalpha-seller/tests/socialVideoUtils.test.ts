import test from "node:test";
import assert from "node:assert/strict";

import {
  validateSellerSocialPageUrl,
  validateProductVideoUrl,
  parseProductVideoProof,
} from "../src/shared/utils/socialVideoUtils";

test("SV-01: Valid official Instagram, Facebook, and YouTube shop pages pass and normalize cleanly", () => {
  const ig = validateSellerSocialPageUrl("instagram.com/urban.threads_in");
  assert.equal(ig.valid, true);
  assert.equal(ig.platform, "instagram");
  assert.equal(ig.normalizedUrl, "https://www.instagram.com/urban.threads_in/");

  const fb = validateSellerSocialPageUrl("https://www.facebook.com/UrbanThreadsKolkata");
  assert.equal(fb.valid, true);
  assert.equal(fb.platform, "facebook");

  const yt = validateSellerSocialPageUrl("https://www.youtube.com/@UrbanThreadsOfficial");
  assert.equal(yt.valid, true);
  assert.equal(yt.platform, "youtube");
});

test("SV-02: WhatsApp, Telegram, XSS javascript:, and random domains are strictly blocked", () => {
  assert.equal(validateSellerSocialPageUrl("https://wa.me/919876543210").valid, false);
  assert.equal(validateSellerSocialPageUrl("https://t.me/myshop").valid, false);
  assert.equal(validateSellerSocialPageUrl("javascript:alert(1)").valid, false);
  assert.equal(validateSellerSocialPageUrl("https://myrandomsite.com/shop").valid, false);
  assert.equal(validateSellerSocialPageUrl("https://www.instagram.com/explore").valid, false);
});

test("SV-03: Instagram Reels, YouTube Shorts, and Facebook Reels generate exact zero-egress embed URLs", () => {
  const igReel = validateProductVideoUrl("https://www.instagram.com/reel/C8AbCdEf123/?igsh=xyz");
  assert.equal(igReel.valid, true);
  assert.equal(igReel.platform, "instagram");
  assert.equal(igReel.embedUrl, "https://www.instagram.com/reel/C8AbCdEf123/embed/");

  const igUserReel = validateProductVideoUrl("https://www.instagram.com/myshop/reel/C8AbCdEf123/");
  assert.equal(igUserReel.valid, true);
  assert.equal(igUserReel.videoId, "C8AbCdEf123");

  const ytShort = validateProductVideoUrl("https://youtube.com/shorts/dQw4w9WgXcQ?si=abc");
  assert.equal(ytShort.valid, true);
  assert.equal(ytShort.platform, "youtube");
  assert.equal(
    ytShort.embedUrl,
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1&fs=0&iv_load_policy=3&disablekb=1"
  );

  const fbReel = validateProductVideoUrl("https://www.facebook.com/reel/123456789012345");
  assert.equal(fbReel.valid, true);
  assert.equal(fbReel.platform, "facebook");
  assert.ok(fbReel.embedUrl?.startsWith("https://www.facebook.com/plugins/video.php?href="));

  const fbShare = validateProductVideoUrl("https://www.facebook.com/share/r/1AbCdEf99/");
  assert.equal(fbShare.valid, true);
  assert.equal(fbShare.platform, "facebook");
});

test("SV-04: Profile-only URLs and disallowed domains are rejected as product video proofs", () => {
  assert.equal(validateProductVideoUrl("https://www.instagram.com/myshop/").valid, false);
  assert.equal(validateProductVideoUrl("https://wa.me/919876543210").valid, false);
  assert.equal(validateProductVideoUrl("https://evil.example/video.mp4").valid, false);
  assert.equal(parseProductVideoProof(""), null);
});
