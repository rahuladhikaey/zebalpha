import crypto from "crypto";
import { supabaseServer } from "@/lib/supabaseServer";

export interface FcmPushInput {
  title: string;
  body: string;
  image?: string | null;
  url?: string;
  tag?: string;
  userId?: string | null;
  target?: "all" | "customers" | "sellers" | "new_drops" | "orders" | "user";
  topic?: string | null;
}

export interface FcmPushResult {
  configured: boolean;
  projectId: string | null;
  totalTokens: number;
  deliveredToDevices: number;
  failedCount: number;
  topicSent: boolean;
  prunedInvalidTokens: number;
  error?: string;
}

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function loadServiceAccountFromEnv(): FirebaseServiceAccount | null {
  const rawJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    "";

  if (rawJson.trim()) {
    try {
      const trimmed = rawJson.trim();
      const decoded = trimmed.startsWith("{")
        ? trimmed
        : Buffer.from(trimmed, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as Partial<FirebaseServiceAccount>;
      if (parsed.client_email && parsed.private_key) {
        return {
          project_id: (parsed.project_id || process.env.FIREBASE_PROJECT_ID || "zebalpha-f691e").trim(),
          client_email: parsed.client_email.trim(),
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch (err) {
      console.error("[FCM v1] Failed parsing FIREBASE_SERVICE_ACCOUNT_JSON:", err);
    }
  }

  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  const projectId = (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "zebalpha-f691e"
  ).trim();

  if (clientEmail && privateKey) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  return null;
}

async function getGoogleOAuthAccessToken(sa: FirebaseServiceAccount): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const unsignedJwt = `${header}.${claimSet}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const signature = base64UrlEncode(signer.sign(sa.private_key));
  const assertion = `${unsignedJwt}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `Google OAuth token error: ${tokenJson.error_description || tokenJson.error || tokenRes.status}`
    );
  }

  const expiresInMs = Math.max(300, Number(tokenJson.expires_in) || 3500) * 1000;
  cachedAccessToken = {
    token: tokenJson.access_token,
    expiresAt: Date.now() + expiresInMs,
  };
  return tokenJson.access_token;
}

interface StoredTokenEntry {
  token: string;
  user_id?: string | null;
  platform?: string;
  topics?: string[];
  updated_at?: string;
}

async function fetchTargetTokens(params: {
  target?: FcmPushInput["target"];
  userId?: string | null;
}): Promise<string[]> {
  const tokenSet = new Set<string>();

  // 1. Primary source: device_push_tokens table
  try {
    let query = supabaseServer
      .from("device_push_tokens")
      .select("token, user_id, platform, is_active");

    if (params.target === "user" && params.userId) {
      query = query.eq("user_id", params.userId);
    }

    const { data, error } = await query.limit(1000);
    if (!error && Array.isArray(data)) {
      for (const row of data as Array<{ token?: string; is_active?: boolean | null }>) {
        if (row?.is_active !== false && typeof row?.token === "string" && row.token.length > 20) {
          tokenSet.add(row.token.trim());
        }
      }
    }
  } catch (err) {
    console.warn("[FCM v1] device_push_tokens lookup notice:", err);
  }

  // 2. Resilient fallback source: store_settings.fcm_device_tokens
  try {
    const { data: fallbackRow } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "fcm_device_tokens")
      .maybeSingle();

    if (Array.isArray(fallbackRow?.value)) {
      for (const item of fallbackRow.value as StoredTokenEntry[]) {
        if (!item?.token || typeof item.token !== "string" || item.token.length <= 20) continue;
        if (params.target === "user" && params.userId) {
          if (String(item.user_id || "") !== String(params.userId)) continue;
        }
        tokenSet.add(item.token.trim());
      }
    }
  } catch (err) {
    console.warn("[FCM v1] store_settings fallback lookup notice:", err);
  }

  return Array.from(tokenSet);
}

async function pruneInvalidTokens(invalidTokens: string[]): Promise<void> {
  if (invalidTokens.length === 0) return;

  try {
    await supabaseServer
      .from("device_push_tokens")
      .delete()
      .in("token", invalidTokens);
  } catch {}

  try {
    const { data: fallbackRow } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "fcm_device_tokens")
      .maybeSingle();

    if (Array.isArray(fallbackRow?.value)) {
      const deadSet = new Set(invalidTokens);
      const remaining = (fallbackRow.value as StoredTokenEntry[]).filter(
        (item) => item?.token && !deadSet.has(item.token)
      );
      if (remaining.length !== fallbackRow.value.length) {
        await supabaseServer.from("store_settings").upsert(
          {
            key: "fcm_device_tokens",
            value: remaining,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      }
    }
  } catch {}
}

function buildFcmMessagePayload(
  input: FcmPushInput,
  destination: { token: string } | { topic: string }
) {
  const safeUrl = (input.url || "/notifications").trim();
  const safeTag = (input.tag || `zebalpha-${Date.now()}`).trim();
  const safeImage = input.image && input.image.trim().startsWith("http") ? input.image.trim() : undefined;

  return {
    message: {
      ...destination,
      notification: {
        title: input.title,
        body: input.body,
        ...(safeImage ? { image: safeImage } : {}),
      },
      android: {
        priority: "HIGH",
        ttl: "86400s",
        notification: {
          channel_id: "zebalpha_alerts_channel",
          icon: "ic_stat_notification",
          color: "#EAB308",
          sound: "default",
          default_vibrate_timings: true,
          notification_priority: "PRIORITY_HIGH",
          visibility: "PUBLIC",
          tag: safeTag,
          ...(safeImage ? { image: safeImage } : {}),
        },
      },
      data: {
        id: safeTag,
        title: input.title,
        body: input.body,
        message: input.body,
        url: safeUrl,
        target_url: safeUrl,
        ...(safeImage ? { image: safeImage } : {}),
      },
    },
  };
}

export async function sendFcmPushServer(input: FcmPushInput): Promise<FcmPushResult> {
  const sa = loadServiceAccountFromEnv();
  const tokens = await fetchTargetTokens({
    target: input.target,
    userId: input.userId,
  });

  if (!sa) {
    return {
      configured: false,
      projectId: null,
      totalTokens: tokens.length,
      deliveredToDevices: 0,
      failedCount: 0,
      topicSent: false,
      prunedInvalidTokens: 0,
      error:
        "Missing FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) in server environment variables.",
    };
  }

  let accessToken: string;
  try {
    accessToken = await getGoogleOAuthAccessToken(sa);
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : "OAuth failure";
    console.error("[FCM v1] OAuth error:", msg);
    return {
      configured: true,
      projectId: sa.project_id,
      totalTokens: tokens.length,
      deliveredToDevices: 0,
      failedCount: tokens.length,
      topicSent: false,
      prunedInvalidTokens: 0,
      error: msg,
    };
  }

  const endpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
    sa.project_id
  )}/messages:send`;

  let delivered = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  // Send to individual device tokens in parallel batches of 20 (works for ALL existing installed APKs)
  const batchSize = 20;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (token) => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(buildFcmMessagePayload(input, { token })),
        });

        if (res.ok) {
          return { ok: true as const, token };
        }

        const errText = await res.text().catch(() => "");
        const isDeadToken =
          res.status === 404 ||
          errText.includes("UNREGISTERED") ||
          errText.includes("registration-token-not-registered") ||
          (res.status === 400 && errText.includes("not a valid FCM registration token"));

        return { ok: false as const, token, isDeadToken, status: res.status, errText };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) {
        delivered++;
      } else {
        failed++;
        if (r.status === "fulfilled" && r.value.isDeadToken) {
          invalidTokens.push(r.value.token);
        }
      }
    }
  }

  // Also dispatch to topic for broadcasts so newly subscribed APKs receive instant alerts even before login
  let topicSent = false;
  const resolvedTopic =
    input.topic ||
    (input.target === "all" || input.target === "customers" || input.target === "new_drops"
      ? "zebalpha_customers"
      : null);

  if (resolvedTopic && input.target !== "user") {
    try {
      const topicRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildFcmMessagePayload(input, { topic: resolvedTopic })),
      });
      topicSent = topicRes.ok;
    } catch (topicErr) {
      console.warn("[FCM v1] Topic send notice:", topicErr);
    }
  }

  if (invalidTokens.length > 0) {
    void pruneInvalidTokens(invalidTokens);
  }

  return {
    configured: true,
    projectId: sa.project_id,
    totalTokens: tokens.length,
    deliveredToDevices: delivered,
    failedCount: failed,
    topicSent,
    prunedInvalidTokens: invalidTokens.length,
  };
}
