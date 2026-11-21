export type SocialVideoPlatform = "instagram" | "facebook" | "youtube";

export interface SocialPageValidationResult {
  valid: boolean;
  normalizedUrl: string;
  platform?: SocialVideoPlatform;
  platformLabel?: string;
  handle?: string;
  error?: string;
}

export interface ProductVideoValidationResult {
  valid: boolean;
  normalizedUrl: string;
  embedUrl?: string;
  platform?: SocialVideoPlatform;
  platformLabel?: string;
  videoId?: string;
  error?: string;
}

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com", "m.instagram.com"]);
const FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "web.facebook.com",
  "fb.com",
  "www.fb.com",
  "fb.watch",
]);
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

const INSTAGRAM_RESERVED_PATHS = new Set([
  "",
  "explore",
  "accounts",
  "login",
  "direct",
  "stories",
  "reels",
  "reel",
  "p",
  "tv",
  "about",
  "legal",
  "developer",
]);

const FACEBOOK_RESERVED_PATHS = new Set([
  "",
  "login",
  "login.php",
  "recover",
  "help",
  "policies",
  "privacy",
  "marketplace",
  "groups",
  "events",
]);

const PLATFORM_LABELS: Record<SocialVideoPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

const VIDEO_PLATFORM_LABELS: Record<SocialVideoPlatform, string> = {
  instagram: "Instagram Reel",
  facebook: "Facebook Video",
  youtube: "YouTube Shorts",
};

function parseSafeHttpsUrl(rawInput: string): { url?: URL; error?: string } {
  const trimmed = String(rawInput || "").trim();
  if (!trimmed) {
    return { error: "URL cannot be empty." };
  }

  if (/^(javascript|data|vbscript|file|tel|mailto):/i.test(trimmed)) {
    return { error: "Invalid link format. Only official Instagram, Facebook, or YouTube links are allowed." };
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { error: "Please enter a valid URL." };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { error: "Only HTTPS links are supported." };
  }

  parsed.protocol = "https:";

  const host = parsed.hostname.toLowerCase();
  if (
    host.includes("whatsapp") ||
    host === "wa.me" ||
    host === "t.me" ||
    host.includes("telegram")
  ) {
    return {
      error: "WhatsApp and Telegram links are not permitted. Please use your official Instagram, Facebook, or YouTube link.",
    };
  }

  return { url: parsed };
}

export function validateSellerSocialPageUrl(rawUrl: string): SocialPageValidationResult {
  const { url, error } = parseSafeHttpsUrl(rawUrl);
  if (!url) {
    return { valid: false, normalizedUrl: "", error: error || "Please enter your official Instagram or Facebook shop page link." };
  }

  const host = url.hostname.toLowerCase();
  const pathSegments = url.pathname.split("/").filter(Boolean);

  if (INSTAGRAM_HOSTS.has(host)) {
    const first = (pathSegments[0] || "").toLowerCase();
    if (!first || INSTAGRAM_RESERVED_PATHS.has(first) || !/^[a-z0-9._]{1,40}$/i.test(first)) {
      return {
        valid: false,
        normalizedUrl: "",
        error: "Please enter your official Instagram profile URL (e.g. https://www.instagram.com/yourshopname).",
      };
    }
    const cleanHandle = pathSegments[0];
    return {
      valid: true,
      normalizedUrl: `https://www.instagram.com/${cleanHandle}/`,
      platform: "instagram",
      platformLabel: PLATFORM_LABELS.instagram,
      handle: `@${cleanHandle}`,
    };
  }

  if (FACEBOOK_HOSTS.has(host) && host !== "fb.watch") {
    const first = (pathSegments[0] || "").toLowerCase();
    if (!first || FACEBOOK_RESERVED_PATHS.has(first)) {
      return {
        valid: false,
        normalizedUrl: "",
        error: "Please enter your official Facebook Page URL (e.g. https://www.facebook.com/yourshopname).",
      };
    }
    const cleanUrl = `https://www.facebook.com${url.pathname}${url.search && first === "profile.php" ? url.search : ""}`;
    return {
      valid: true,
      normalizedUrl: cleanUrl,
      platform: "facebook",
      platformLabel: PLATFORM_LABELS.facebook,
      handle: first === "profile.php" ? "Facebook Page" : pathSegments[0],
    };
  }

  if (YOUTUBE_HOSTS.has(host) && host !== "youtu.be") {
    const first = pathSegments[0] || "";
    const isChannel =
      first.startsWith("@") ||
      (first === "channel" && Boolean(pathSegments[1])) ||
      (first === "c" && Boolean(pathSegments[1])) ||
      (first === "user" && Boolean(pathSegments[1]));
    if (!isChannel) {
      return {
        valid: false,
        normalizedUrl: "",
        error: "Please enter your official YouTube Channel URL (e.g. https://www.youtube.com/@yourshopname).",
      };
    }
    return {
      valid: true,
      normalizedUrl: `https://www.youtube.com/${pathSegments.slice(0, first.startsWith("@") ? 1 : 2).join("/")}`,
      platform: "youtube",
      platformLabel: PLATFORM_LABELS.youtube,
      handle: first.startsWith("@") ? first : pathSegments[1],
    };
  }

  return {
    valid: false,
    normalizedUrl: "",
    error: "Only official Instagram, Facebook, or YouTube shop page links are supported.",
  };
}

export function validateProductVideoUrl(rawUrl: string): ProductVideoValidationResult {
  const { url, error } = parseSafeHttpsUrl(rawUrl);
  if (!url) {
    return { valid: false, normalizedUrl: "", error: error || "Please enter a valid product video link." };
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  if (INSTAGRAM_HOSTS.has(host)) {
    let kind = "";
    let code = "";
    if (segments.length >= 2 && ["reel", "reels", "p", "tv"].includes(segments[0].toLowerCase())) {
      kind = segments[0].toLowerCase();
      code = segments[1];
    } else if (segments.length >= 3 && ["reel", "reels", "p", "tv"].includes(segments[1].toLowerCase())) {
      kind = segments[1].toLowerCase();
      code = segments[2];
    }

    if (!code || !/^[A-Za-z0-9_-]{5,30}$/.test(code)) {
      return {
        valid: false,
        normalizedUrl: "",
        error: "Please paste a specific Instagram Reel or Post video link.",
      };
    }

    const canonicalKind = kind === "p" ? "p" : "reel";
    return {
      valid: true,
      normalizedUrl: `https://www.instagram.com/${canonicalKind}/${code}/`,
      embedUrl: `https://www.instagram.com/${canonicalKind}/${code}/embed/`,
      platform: "instagram",
      platformLabel: VIDEO_PLATFORM_LABELS.instagram,
      videoId: code,
    };
  }

  if (YOUTUBE_HOSTS.has(host)) {
    let videoId = "";
    if (host === "youtu.be") {
      videoId = segments[0] || "";
    } else if (segments[0]?.toLowerCase() === "shorts" && segments[1]) {
      videoId = segments[1];
    } else if (segments[0]?.toLowerCase() === "embed" && segments[1]) {
      videoId = segments[1];
    } else if (segments[0]?.toLowerCase() === "watch") {
      videoId = url.searchParams.get("v") || "";
    }

    if (!videoId || !/^[A-Za-z0-9_-]{6,20}$/.test(videoId)) {
      return {
        valid: false,
        normalizedUrl: "",
        error: "Please paste a valid YouTube Shorts or YouTube video link.",
      };
    }

    const isShorts = segments[0]?.toLowerCase() === "shorts";
    return {
      valid: true,
      normalizedUrl: isShorts
        ? `https://www.youtube.com/shorts/${videoId}`
        : `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&fs=0&iv_load_policy=3&disablekb=1`,
      platform: "youtube",
      platformLabel: isShorts ? "YouTube Shorts" : "YouTube Video",
      videoId,
    };
  }

  if (FACEBOOK_HOSTS.has(host)) {
    const first = (segments[0] || "").toLowerCase();
    const second = (segments[1] || "").toLowerCase();
    const isFbWatch = host === "fb.watch" && Boolean(segments[0]);
    const isFbReel = (first === "reel" || first === "reels") && Boolean(segments[1]);
    const isFbShareVideo = first === "share" && (second === "r" || second === "v") && Boolean(segments[2]);
    const isFbWatchQuery = first === "watch" && Boolean(url.searchParams.get("v"));
    const isFbPageVideo = segments.length >= 3 && (second === "videos" || second === "reel");
    const isFbVideoPhp = first === "video.php" && Boolean(url.searchParams.get("v"));

    if (!isFbWatch && !isFbReel && !isFbShareVideo && !isFbWatchQuery && !isFbPageVideo && !isFbVideoPhp) {
      return {
        valid: false,
        normalizedUrl: "",
        error: "Please paste a specific Facebook Reel or Video link.",
      };
    }

    const normalizedUrl = url.toString();
    return {
      valid: true,
      normalizedUrl,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(normalizedUrl)}&show_text=false&width=360&t=0`,
      platform: "facebook",
      platformLabel: isFbReel || isFbShareVideo ? "Facebook Reel" : VIDEO_PLATFORM_LABELS.facebook,
      videoId: segments[segments.length - 1] || url.searchParams.get("v") || "fb-video",
    };
  }

  return {
    valid: false,
    normalizedUrl: "",
    error: "Only public Instagram Reel, Facebook Reel/Video, or YouTube Shorts links are supported.",
  };
}

export function parseProductVideoProof(rawUrl?: string | null): ProductVideoValidationResult | null {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) return null;
  const res = validateProductVideoUrl(rawUrl);
  return res.valid ? res : null;
}
