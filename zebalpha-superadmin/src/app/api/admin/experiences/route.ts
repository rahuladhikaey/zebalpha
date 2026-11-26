import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";
import {
  PREBUILT_EXPERIENCE_PRESETS,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_ASSETS,
  DEFAULT_TYPOGRAPHY,
  ExperienceRecord,
  ExperienceBannerItem,
  ExperienceCampaignItem,
  ExperiencePopupItem,
  ExperienceAnnouncementItem,
  ExperiencePublicationSnapshot,
  ExperienceAuditLogItem,
  CustomerActiveExperiencePayload,
  resolveActiveExperience,
  detectScheduleConflicts,
  validateDestinationUrl,
  sanitizeHexColor,
} from "@/lib/experienceThemes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DemsMasterState {
  version: number;
  schema_version: number;
  timezone: string;
  cache_ttl_seconds: number;
  offline_fallback_enabled: boolean;
  experiences: ExperienceRecord[];
  banners: ExperienceBannerItem[];
  campaigns: ExperienceCampaignItem[];
  popups: ExperiencePopupItem[];
  announcements: ExperienceAnnouncementItem[];
  publications: ExperiencePublicationSnapshot[];
  audit_logs: ExperienceAuditLogItem[];
  updated_at: string;
}

const DEFAULT_BANNERS: ExperienceBannerItem[] = [
  {
    id: "bnr_grand_opening",
    experience_id: "exp_default_zebalpha",
    title: "Grand Opening Sale",
    subtitle: "NOW LIVE • SPECIAL OFFERS ON LAUNCH PRODUCTS",
    image_url: "/banner-grand-opening.jpg",
    mobile_image_url: "/banner-grand-opening.jpg",
    desktop_image_url: "/banner-grand-opening.jpg",
    destination_type: "page",
    destination_value: "/products",
    priority: 10,
    target_audience: "all",
    status: "active",
  },
  {
    id: "bnr_retro_cream",
    experience_id: "exp_default_zebalpha",
    title: "Exclusive Streetwear",
    subtitle: "LIMITED RELEASE • CLOTHING FOR THE CULTURE",
    image_url: "/banner-retro-cream.png",
    mobile_image_url: "/banner-retro-cream.png",
    desktop_image_url: "/banner-retro-cream.png",
    destination_type: "page",
    destination_value: "/products",
    priority: 9,
    target_audience: "all",
    status: "active",
  },
  {
    id: "bnr_premium_polo",
    experience_id: "exp_default_zebalpha",
    title: "Men's Premium Polo",
    subtitle: "TEXTURED FABRIC • MODERN ZIP COLLAR FIT",
    image_url: "/banner-premium-polo.png",
    mobile_image_url: "/banner-premium-polo.png",
    desktop_image_url: "/banner-premium-polo.png",
    destination_type: "category",
    destination_value: "/products?category=Polos",
    priority: 8,
    target_audience: "all",
    status: "active",
  },
  {
    id: "bnr_casual_green",
    experience_id: "exp_default_zebalpha",
    title: "ZebAlpha Casuals",
    subtitle: "CONFIDENCE IN EVERY DETAIL • 100% COMBED COTTON",
    image_url: "/banner-casual-green.png",
    mobile_image_url: "/banner-casual-green.png",
    desktop_image_url: "/banner-casual-green.png",
    destination_type: "category",
    destination_value: "/products?category=T-Shirts",
    priority: 7,
    target_audience: "all",
    status: "active",
  },
];

const DEFAULT_CAMPAIGNS: ExperienceCampaignItem[] = [
  {
    id: "camp_first_order_100",
    name: "First Order Flat ₹100 OFF Welcome Campaign",
    description: "Automatic ₹100 discount on first customer order above ₹399 (Code: FIRST100).",
    artwork_url: "/banner-grand-opening.jpg",
    campaign_type: "Limited-Time Promotion",
    start_at: null,
    end_at: null,
    priority: 10,
    associated_theme_id: "exp_default_zebalpha",
    associated_banner_ids: ["bnr_grand_opening"],
    associated_section_keys: ["promo_drop_carousel"],
    destination_url: "/products",
    badge_text: "FLAT ₹100 OFF",
    status: "active",
  },
  {
    id: "camp_new_season_drop",
    name: "240 GSM Streetwear Culture Drop",
    description: "Heavyweight oversized graphic tees, zip polos & custom studio collection.",
    artwork_url: "/banner-retro-cream.png",
    campaign_type: "New Arrivals",
    start_at: null,
    end_at: null,
    priority: 8,
    associated_theme_id: "exp_default_zebalpha",
    associated_banner_ids: ["bnr_retro_cream"],
    associated_section_keys: ["curated_collections", "featured_product_feed"],
    destination_url: "/products",
    badge_text: "NEW ARRIVALS",
    status: "active",
  },
];

const DEFAULT_ANNOUNCEMENTS: ExperienceAnnouncementItem[] = [
  {
    id: "ann_culture",
    experience_id: "exp_default_zebalpha",
    title: "ZebAlpha Culture",
    message: "ZEBALPHA • CLOTHING FOR THE CULTURE",
    icon_key: "crown",
    destination_value: "/products",
    priority: 10,
    status: "active",
  },
  {
    id: "ann_new_drop",
    experience_id: "exp_default_zebalpha",
    title: "New Season Arrivals",
    message: "NEW SEASON • AUTHENTIC STREETWEAR",
    icon_key: "flame",
    destination_value: "/products",
    priority: 9,
    status: "active",
  },
  {
    id: "ann_first_100",
    experience_id: "exp_default_zebalpha",
    title: "First Order Welcome",
    message: "FLAT ₹100 OFF ON 1ST ORDER (CODE: FIRST100)",
    icon_key: "tag",
    destination_value: "/products",
    priority: 8,
    status: "active",
  },
  {
    id: "ann_free_shipping",
    experience_id: "exp_default_zebalpha",
    title: "Free Express Shipping",
    message: "FREE EXPRESS SHIPPING ON ORDERS OVER ₹499",
    icon_key: "truck",
    destination_value: "/products",
    priority: 7,
    status: "active",
  },
];

async function upsertStoreSetting(key: string, value: any) {
  const now = new Date().toISOString();
  const { data: existing } = await supabaseServer
    .from("store_settings")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  if (existing?.id) {
    await supabaseServer
      .from("store_settings")
      .update({ value, updated_at: now })
      .eq("id", existing.id);
  } else {
    await supabaseServer
      .from("store_settings")
      .upsert({ key, value, updated_at: now }, { onConflict: "key" });
  }
}

function buildInitialDemsState(): DemsMasterState {
  const initialDefault = PREBUILT_EXPERIENCE_PRESETS[0];
  const initialSnapshot: ExperiencePublicationSnapshot = {
    id: "pub_v1_default",
    experience_id: initialDefault.id,
    experience_name: initialDefault.name,
    festival_name: initialDefault.festival_name,
    version: 1,
    version_label: "v1 — Default ZebAlpha Theme",
    configuration_snapshot_json: {
      experience: initialDefault,
      banners: DEFAULT_BANNERS,
      campaigns: DEFAULT_CAMPAIGNS,
      popups: [],
      announcements: DEFAULT_ANNOUNCEMENTS,
    },
    published_by: "Super Admin",
    published_at: "2026-11-24T00:00:00.000Z",
    status: "published",
  };

  return {
    version: 1,
    schema_version: 1,
    timezone: "Asia/Kolkata",
    cache_ttl_seconds: 300,
    offline_fallback_enabled: true,
    experiences: PREBUILT_EXPERIENCE_PRESETS.map((p) => ({ ...p })),
    banners: DEFAULT_BANNERS,
    campaigns: DEFAULT_CAMPAIGNS,
    popups: [],
    announcements: DEFAULT_ANNOUNCEMENTS,
    publications: [initialSnapshot],
    audit_logs: [
      {
        id: "audit_init_v1",
        admin_email: "superadmin@zebalpha.shop",
        action: "PUBLISH_EXPERIENCE",
        experience_id: initialDefault.id,
        experience_name: initialDefault.name,
        previous_version: 0,
        new_version: 1,
        metadata_json: { note: "Initialized DEMS with 8 prebuilt festival presets" },
        created_at: "2026-11-24T00:00:00.000Z",
      },
    ],
    updated_at: new Date().toISOString(),
  };
}

function buildCustomerActivePayload(state: DemsMasterState): {
  customerPayload: CustomerActiveExperiencePayload;
  resolvedState: DemsMasterState;
} {
  const nowMs = Date.now();
  const { activeExperience, updatedExperiences } = resolveActiveExperience(
    state.experiences,
    nowMs
  );

  // Filter active banners within date window
  const activeBanners = (state.banners || [])
    .filter((b) => {
      if (b.status !== "active" && b.status !== "scheduled") return false;
      const sMs = b.start_at ? new Date(b.start_at).getTime() : null;
      const eMs = b.end_at ? new Date(b.end_at).getTime() : null;
      if (sMs && !Number.isNaN(sMs) && sMs > nowMs) return false;
      if (eMs && !Number.isNaN(eMs) && eMs <= nowMs) return false;
      return true;
    })
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

  // Filter active campaigns within date window
  const activeCampaigns = (state.campaigns || [])
    .filter((c) => {
      if (c.status !== "active" && c.status !== "scheduled") return false;
      const sMs = c.start_at ? new Date(c.start_at).getTime() : null;
      const eMs = c.end_at ? new Date(c.end_at).getTime() : null;
      if (sMs && !Number.isNaN(sMs) && sMs > nowMs) return false;
      if (eMs && !Number.isNaN(eMs) && eMs <= nowMs) return false;
      return true;
    })
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

  // Filter active popups within date window
  const activePopups = (state.popups || [])
    .filter((p) => {
      if (p.status !== "active" && p.status !== "scheduled") return false;
      const sMs = p.start_at ? new Date(p.start_at).getTime() : null;
      const eMs = p.end_at ? new Date(p.end_at).getTime() : null;
      if (sMs && !Number.isNaN(sMs) && sMs > nowMs) return false;
      if (eMs && !Number.isNaN(eMs) && eMs <= nowMs) return false;
      return true;
    })
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

  // Filter active announcements within date window
  const activeAnnouncements = (state.announcements || [])
    .filter((a) => {
      if (a.status !== "active" && a.status !== "scheduled") return false;
      const sMs = a.start_at ? new Date(a.start_at).getTime() : null;
      const eMs = a.end_at ? new Date(a.end_at).getTime() : null;
      if (sMs && !Number.isNaN(sMs) && sMs > nowMs) return false;
      if (eMs && !Number.isNaN(eMs) && eMs <= nowMs) return false;
      return true;
    })
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

  const resolvedState: DemsMasterState = {
    ...state,
    experiences: updatedExperiences,
  };

  const customerPayload: CustomerActiveExperiencePayload = {
    version: state.version,
    schemaVersion: state.schema_version || 1,
    activeExperienceId: activeExperience.id,
    name: activeExperience.name,
    slug: activeExperience.slug,
    festivalName: activeExperience.festival_name,
    experienceType: activeExperience.experience_type,
    isDefault: activeExperience.is_default,
    timezone: state.timezone || "Asia/Kolkata",
    effectiveStartAt: activeExperience.start_at || null,
    effectiveEndAt: activeExperience.end_at || null,
    lastUpdatedAt: activeExperience.updated_at || state.updated_at,
    lastPublishedBy: activeExperience.last_published_by || "Super Admin",
    themeTokens: activeExperience.theme_tokens,
    typography: activeExperience.typography || DEFAULT_TYPOGRAPHY,
    assets: activeExperience.assets || DEFAULT_ASSETS,
    homeSections: (activeExperience.home_sections || DEFAULT_HOME_SECTIONS).sort(
      (a, b) => (a.display_order ?? 99) - (b.display_order ?? 99)
    ),
    banners: activeBanners,
    campaigns: activeCampaigns,
    popups: activePopups,
    announcements: activeAnnouncements,
  };

  return { customerPayload, resolvedState };
}

async function syncAllSettingsAndTables(
  state: DemsMasterState,
  customerPayload: CustomerActiveExperiencePayload
) {
  // 1. Save master DEMS state & active customer payload into store_settings (single-key cached by customer storefront)
  await upsertStoreSetting("dems_master_state_v1", state);
  await upsertStoreSetting("dems_active_experience_v1", customerPayload);

  // 2. Also keep sdui_homepage_layout_v1, hero_banners & marquee_banner synchronized for 100% backward compatibility
  const sduiWidgets = customerPayload.homeSections.map((sec, idx) => ({
    id: sec.section_key,
    widget_type: sec.widget_type,
    title: sec.title,
    subtitle: sec.subtitle,
    enabled: sec.is_visible,
    web_enabled: sec.web_enabled,
    app_enabled: sec.app_enabled,
    display_order: idx + 1,
    config: sec.settings_json || {},
  }));

  const marqueeItems =
    customerPayload.announcements.length > 0
      ? customerPayload.announcements.map((a) => ({
          icon: a.icon_key || "flame",
          text: a.message,
        }))
      : [
          { icon: "crown", text: "ZEBALPHA • CLOTHING FOR THE CULTURE" },
          { icon: "flame", text: "NEW SEASON DROP • AUTHENTIC STREETWEAR" },
          { icon: "tag", text: "FLAT ₹100 OFF ON 1ST ORDER (CODE: FIRST100)" },
        ];

  await upsertStoreSetting("sdui_homepage_layout_v1", {
    version: customerPayload.version,
    updated_at: new Date().toISOString(),
    global_theme: {
      header_backdrop: customerPayload.slug,
      announcement_bar_enabled: true,
      trust_bar_enabled: true,
      free_shipping_threshold: 499,
      trust_badges: [
        { icon: "truck", title: "Free Delivery", subtitle: "on ₹499+" },
        { icon: "shield", title: "Easy Returns", subtitle: "5-Day Policy" },
        { icon: "badge", title: "Secure Shopping", subtitle: "100% Safe" },
      ],
      marquee_items: marqueeItems,
    },
    widgets: sduiWidgets,
  });

  await upsertStoreSetting("marquee_banner", marqueeItems);

  if (customerPayload.banners.length > 0) {
    const heroBannerFormat = customerPayload.banners.map((b, idx) => ({
      id: b.id || `banner-${idx}`,
      src: b.mobile_image_url || b.image_url,
      alt: b.title,
      title: b.title,
      tagline: b.subtitle || "",
      link: validateDestinationUrl(b.destination_type, b.destination_value).normalizedUrl,
    }));
    await upsertStoreSetting("hero_banners", heroBannerFormat);
  }

  // 3. Best-effort sync to normalized relational tables (non-fatal if migration SQL hasn't been executed yet)
  try {
    for (const exp of state.experiences) {
      await supabaseServer.from("experiences").upsert(
        {
          id: exp.id,
          name: exp.name,
          slug: exp.slug,
          description: exp.description,
          festival_name: exp.festival_name,
          thumbnail_url: exp.thumbnail_url || "/official-logo.png",
          experience_type: exp.experience_type,
          status: exp.status,
          is_default: exp.is_default,
          priority: exp.priority,
          start_at: exp.start_at || null,
          end_at: exp.end_at || null,
          timezone: exp.timezone || "Asia/Kolkata",
          schema_version: exp.schema_version || 1,
          published_version: exp.published_version || 0,
          draft_version: exp.draft_version || 1,
          created_by: exp.created_by || "Super Admin",
          last_published_by: exp.last_published_by || null,
          last_published_at: exp.last_published_at || null,
          updated_at: exp.updated_at || new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      await supabaseServer.from("experience_themes").upsert(
        {
          experience_id: exp.id,
          theme_name: exp.name,
          theme_tokens_json: exp.theme_tokens,
          typography_json: exp.typography,
          assets_json: exp.assets,
          schema_version: exp.schema_version || 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "experience_id" }
      );
    }
  } catch {
    // Non-fatal if SQL migration not yet run
  }

  // 4. Trigger instant Server-to-Server Cache Purge on Customer Storefront (both production & configured URL)
  const revalidateTargets = new Set<string>([
    process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://zebalpha.shop",
    "https://zebalpha.shop",
  ]);
  const revalidateSecret = (process.env.CACHE_REVALIDATE_SECRET || "").trim();

  await Promise.allSettled(
    Array.from(revalidateTargets).map((baseUrl) =>
      fetch(`${baseUrl.replace(/\/$/, "")}/api/cache/revalidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(revalidateSecret ? { "x-revalidate-secret": revalidateSecret } : {}),
        },
        body: JSON.stringify({
          target: "all",
          ...(revalidateSecret ? { secret: revalidateSecret } : {}),
        }),
      })
    )
  );
}

async function loadDemsMasterState(): Promise<DemsMasterState> {
  const { data: row } = await supabaseServer
    .from("store_settings")
    .select("value")
    .eq("key", "dems_master_state_v1")
    .maybeSingle();

  if (row?.value) {
    const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
    if (parsed && Array.isArray(parsed.experiences) && parsed.experiences.length > 0) {
      // Ensure all 8 prebuilt templates exist and migrate untouched v1 Default ZebAlpha Theme to Option B (Coral Header + Champagne Gold Accents)
      const existingIds = new Set(parsed.experiences.map((e: ExperienceRecord) => e.id));
      let didMigrateDefault = false;
      const mergedExperiences = parsed.experiences.map((exp: ExperienceRecord) => {
        if (
          exp.id === "exp_default_zebalpha" &&
          exp.theme_tokens?.primaryButtonBg?.toUpperCase() === "#F03A46" &&
          exp.theme_tokens?.discountBadgeColor?.toUpperCase() === "#047857"
        ) {
          didMigrateDefault = true;
          return {
            ...exp,
            theme_tokens: { ...PREBUILT_EXPERIENCE_PRESETS[0].theme_tokens },
          };
        }
        return exp;
      });
      for (const preset of PREBUILT_EXPERIENCE_PRESETS) {
        if (!existingIds.has(preset.id)) {
          mergedExperiences.push({ ...preset });
        }
      }
      const nextState: DemsMasterState = {
        ...buildInitialDemsState(),
        ...parsed,
        experiences: mergedExperiences,
      };
      if (didMigrateDefault) {
        const { customerPayload, resolvedState } = buildCustomerActivePayload(nextState);
        await syncAllSettingsAndTables(resolvedState, customerPayload);
        return resolvedState;
      }
      return nextState;
    }
  }

  const initial = buildInitialDemsState();
  const { customerPayload, resolvedState } = buildCustomerActivePayload(initial);
  await syncAllSettingsAndTables(resolvedState, customerPayload);
  return resolvedState;
}

// GET /api/admin/experiences
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    const state = await loadDemsMasterState();
    const { customerPayload, resolvedState } = buildCustomerActivePayload(state);
    const scheduleConflicts = detectScheduleConflicts(resolvedState.experiences);

    // Fetch live categories & top products for destination/campaign pickers
    const [{ data: categories }, { data: products }] = await Promise.all([
      supabaseServer
        .from("categories")
        .select("id, name, slug, image_url")
        .order("display_order", { ascending: true })
        .limit(40),
      supabaseServer
        .from("products")
        .select("id, name, price, mrp, image_url, is_active")
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        state: resolvedState,
        activeCustomerExperience: customerPayload,
        scheduleConflicts,
        categories: categories || [],
        products: products || [],
      },
    });
  } catch (err: any) {
    if (err?.name === "AuthError") return authErrorResponse(err);
    console.error("[GET /api/admin/experiences Error]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to load Experience Management data" },
      { status: 500 }
    );
  }
}

// POST /api/admin/experiences
export async function POST(req: Request) {
  try {
    const admin = (await requireSuperAdmin(req)) as { userId?: string; email?: string } | null;
    const adminEmail: string =
      typeof admin?.email === "string" && admin.email
        ? admin.email
        : "superadmin@zebalpha.shop";
    const adminUserId: string | null =
      typeof admin?.userId === "string" ? admin.userId : null;

    const body = await req.json();
    const action = String(body?.action || "");
    const state = await loadDemsMasterState();
    const nowIso = new Date().toISOString();

    const appendAuditLog = (
      logAction: ExperienceAuditLogItem["action"],
      expId: string,
      expName: string,
      prevVer: number | null,
      newVer: number | null,
      meta: Record<string, any> = {}
    ) => {
      const entry: ExperienceAuditLogItem = {
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        admin_id: adminUserId,
        admin_email: adminEmail,
        action: logAction,
        experience_id: expId,
        experience_name: expName,
        previous_version: prevVer,
        new_version: newVer,
        metadata_json: meta,
        created_at: nowIso,
      };
      state.audit_logs = [entry, ...(state.audit_logs || [])].slice(0, 150);
    };

    const createImmutablePublicationSnapshot = (
      exp: ExperienceRecord,
      labelSuffix: string
    ): number => {
      const nextVersion = Number(state.version || 1) + 1;
      state.version = nextVersion;
      exp.published_version = nextVersion;
      exp.last_published_by = adminEmail;
      exp.last_published_at = nowIso;

      // Mark previous publications as superseded
      state.publications = (state.publications || []).map((p) =>
        p.status === "published" ? { ...p, status: "superseded" as const } : p
      );

      const snapshot: ExperiencePublicationSnapshot = {
        id: `pub_v${nextVersion}_${Date.now()}`,
        experience_id: exp.id,
        experience_name: exp.name,
        festival_name: exp.festival_name,
        version: nextVersion,
        version_label: `v${nextVersion} — ${exp.name} (${labelSuffix})`,
        configuration_snapshot_json: {
          experience: JSON.parse(JSON.stringify(exp)),
          banners: JSON.parse(JSON.stringify(state.banners || [])),
          campaigns: JSON.parse(JSON.stringify(state.campaigns || [])),
          popups: JSON.parse(JSON.stringify(state.popups || [])),
          announcements: JSON.parse(JSON.stringify(state.announcements || [])),
        },
        published_by: adminEmail,
        published_at: nowIso,
        status: "published",
      };

      state.publications = [snapshot, ...(state.publications || [])].slice(0, 60);
      return nextVersion;
    };

    // -------------------------------------------------------------------------
    // ACTION 1: CREATE OR DUPLICATE EXPERIENCE THEME
    // -------------------------------------------------------------------------
    if (action === "create_experience" || action === "duplicate_experience") {
      const sourceId = body.sourceExperienceId || "exp_default_zebalpha";
      const source =
        state.experiences.find((e) => e.id === sourceId) || PREBUILT_EXPERIENCE_PRESETS[0];

      const rawName = String(body.name || `${source.name} Copy`).trim();
      const rawFestival = String(body.festival_name || source.festival_name || "Custom Festival").trim();
      const slugBase = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const uniqueId = `exp_${slugBase}_${Date.now().toString(36)}`;

      const newExp: ExperienceRecord = {
        ...JSON.parse(JSON.stringify(source)),
        id: uniqueId,
        name: rawName,
        slug: `${slugBase}-${Date.now().toString(36).slice(-4)}`,
        description: String(body.description || source.description || "").trim(),
        festival_name: rawFestival,
        experience_type: body.experience_type || "festival",
        status: "draft",
        is_default: false,
        priority: Number(body.priority || 10),
        start_at: body.start_at || null,
        end_at: body.end_at || null,
        published_version: 0,
        draft_version: 1,
        created_by: adminEmail,
        created_at: nowIso,
        updated_at: nowIso,
      };

      state.experiences.push(newExp);
      appendAuditLog(
        action === "duplicate_experience" ? "DUPLICATE_EXPERIENCE" : "CREATE_EXPERIENCE",
        newExp.id,
        newExp.name,
        state.version,
        state.version,
        { festival_name: newExp.festival_name }
      );
    }

    // -------------------------------------------------------------------------
    // ACTION 2: SAVE DRAFT / UPDATE EXPERIENCE TOKENS, TYPOGRAPHY, ASSETS, SECTIONS
    // -------------------------------------------------------------------------
    else if (action === "save_experience") {
      const expInput = body.experience as ExperienceRecord;
      if (!expInput?.id) {
        return NextResponse.json(
          { success: false, message: "Experience ID is required" },
          { status: 400 }
        );
      }

      const idx = state.experiences.findIndex((e) => e.id === expInput.id);
      if (idx === -1) {
        return NextResponse.json(
          { success: false, message: "Experience not found" },
          { status: 404 }
        );
      }

      const existing = state.experiences[idx];
      const defTokens = PREBUILT_EXPERIENCE_PRESETS[0].theme_tokens;
      const incomingTokens = expInput.theme_tokens || existing.theme_tokens;

      // Validate all 25 HEX color tokens
      const validatedTokens: any = {};
      for (const key of Object.keys(defTokens) as Array<keyof typeof defTokens>) {
        validatedTokens[key] = sanitizeHexColor(
          incomingTokens[key],
          existing.theme_tokens[key] || defTokens[key]
        );
      }

      const updatedExp: ExperienceRecord = {
        ...existing,
        ...expInput,
        theme_tokens: validatedTokens,
        typography: {
          ...DEFAULT_TYPOGRAPHY,
          ...(existing.typography || {}),
          ...(expInput.typography || {}),
        },
        assets: {
          ...DEFAULT_ASSETS,
          ...(existing.assets || {}),
          ...(expInput.assets || {}),
        },
        home_sections: Array.isArray(expInput.home_sections)
          ? expInput.home_sections.map((s, i) => ({ ...s, display_order: i + 1 }))
          : existing.home_sections,
        draft_version: Number(existing.draft_version || 1) + 1,
        updated_at: nowIso,
      };

      state.experiences[idx] = updatedExp;

      // If this experience is currently active and publishNow is requested, bump version & snapshot
      if (body.publishNow) {
        const prevVer = state.version;
        if (!updatedExp.is_default) {
          state.experiences = state.experiences.map((e) =>
            !e.is_default && e.id !== updatedExp.id && e.status === "active"
              ? { ...e, status: "draft" as const }
              : e
          );
        }
        updatedExp.status = "active";
        const newVer = createImmutablePublicationSnapshot(updatedExp, "Published Live");
        appendAuditLog("PUBLISH_EXPERIENCE", updatedExp.id, updatedExp.name, prevVer, newVer);
      } else {
        appendAuditLog(
          "SAVE_DRAFT",
          updatedExp.id,
          updatedExp.name,
          state.version,
          state.version
        );
      }
    }

    // -------------------------------------------------------------------------
    // ACTION 3: PUBLISH EXPERIENCE IMMEDIATELY
    // -------------------------------------------------------------------------
    else if (action === "publish_experience") {
      const targetId = String(body.experienceId || "");
      const target = state.experiences.find((e) => e.id === targetId);
      if (!target) {
        return NextResponse.json(
          { success: false, message: "Experience not found" },
          { status: 404 }
        );
      }

      const prevVer = state.version;
      // Demote other non-default active experiences so the newly published one takes effect immediately
      state.experiences = state.experiences.map((e) => {
        if (e.id === target.id) {
          return {
            ...e,
            status: "active" as const,
            start_at: null,
            end_at: e.end_at && new Date(e.end_at).getTime() <= Date.now() ? null : e.end_at,
            updated_at: nowIso,
          };
        }
        if (!e.is_default && e.status === "active") {
          return { ...e, status: "draft" as const };
        }
        return e;
      });

      const publishedExp = state.experiences.find((e) => e.id === target.id)!;
      const newVer = createImmutablePublicationSnapshot(publishedExp, "Immediate Publish");
      appendAuditLog("PUBLISH_EXPERIENCE", publishedExp.id, publishedExp.name, prevVer, newVer);
    }

    // -------------------------------------------------------------------------
    // ACTION 4: SCHEDULE EXPERIENCE (WITH DATE & CONFLICT VALIDATION)
    // -------------------------------------------------------------------------
    else if (action === "schedule_experience") {
      const targetId = String(body.experienceId || "");
      const startAt = body.start_at ? new Date(body.start_at).toISOString() : null;
      const endAt = body.end_at ? new Date(body.end_at).toISOString() : null;
      const priority = Number(body.priority || 10);

      if (!startAt || !endAt) {
        return NextResponse.json(
          { success: false, message: "Both Start Date/Time and End Date/Time are required for scheduling." },
          { status: 400 }
        );
      }

      if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
        return NextResponse.json(
          { success: false, message: "End Date/Time must be after Start Date/Time." },
          { status: 400 }
        );
      }

      const idx = state.experiences.findIndex((e) => e.id === targetId);
      if (idx === -1) {
        return NextResponse.json(
          { success: false, message: "Experience not found" },
          { status: 404 }
        );
      }

      const prevVer = state.version;
      const startMs = new Date(startAt).getTime();
      const endMs = new Date(endAt).getTime();
      const nowMs = Date.now();
      const shouldBeActiveNow = startMs <= nowMs && endMs > nowMs;

      state.experiences[idx] = {
        ...state.experiences[idx],
        status: shouldBeActiveNow ? "active" : "scheduled",
        start_at: startAt,
        end_at: endAt,
        priority,
        updated_at: nowIso,
      };

      const exp = state.experiences[idx];
      const newVer = createImmutablePublicationSnapshot(
        exp,
        shouldBeActiveNow ? "Scheduled Active Now" : `Scheduled ${startAt.slice(0, 10)}`
      );
      appendAuditLog("SCHEDULE_EXPERIENCE", exp.id, exp.name, prevVer, newVer, {
        start_at: startAt,
        end_at: endAt,
        priority,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 5: UNPUBLISH / ARCHIVE / DELETE EXPERIENCE
    // -------------------------------------------------------------------------
    else if (action === "unpublish_experience" || action === "archive_experience") {
      const targetId = String(body.experienceId || "");
      const idx = state.experiences.findIndex((e) => e.id === targetId);
      if (idx === -1) {
        return NextResponse.json(
          { success: false, message: "Experience not found" },
          { status: 404 }
        );
      }
      if (state.experiences[idx].is_default) {
        return NextResponse.json(
          { success: false, message: "Default ZebAlpha Theme cannot be archived or unpublished." },
          { status: 400 }
        );
      }

      const prevVer = state.version;
      state.experiences[idx] = {
        ...state.experiences[idx],
        status: action === "archive_experience" ? "archived" : "draft",
        updated_at: nowIso,
      };
      state.version = prevVer + 1;

      appendAuditLog(
        action === "archive_experience" ? "ARCHIVE_EXPERIENCE" : "UNPUBLISH_EXPERIENCE",
        state.experiences[idx].id,
        state.experiences[idx].name,
        prevVer,
        state.version
      );
    }

    // -------------------------------------------------------------------------
    // ACTION 6: ROLLBACK TO HISTORICAL PUBLICATION VERSION
    // -------------------------------------------------------------------------
    else if (action === "rollback_publication") {
      const pubId = String(body.publicationId || "");
      const targetPub = (state.publications || []).find((p) => p.id === pubId);
      if (!targetPub || !targetPub.configuration_snapshot_json?.experience) {
        return NextResponse.json(
          { success: false, message: "Historical publication snapshot not found" },
          { status: 404 }
        );
      }

      const prevVer = state.version;
      const snap = targetPub.configuration_snapshot_json;
      const restoredExp: ExperienceRecord = {
        ...JSON.parse(JSON.stringify(snap.experience)),
        status: "active",
        updated_at: nowIso,
      };

      // Update or insert restored experience and deactivate other non-default experiences
      const existingIdx = state.experiences.findIndex((e) => e.id === restoredExp.id);
      state.experiences = state.experiences.map((e) =>
        !e.is_default && e.id !== restoredExp.id && e.status === "active"
          ? { ...e, status: "draft" as const }
          : e
      );

      if (existingIdx >= 0) {
        state.experiences[existingIdx] = restoredExp;
      } else {
        state.experiences.push(restoredExp);
      }

      if (Array.isArray(snap.banners) && snap.banners.length > 0) {
        state.banners = JSON.parse(JSON.stringify(snap.banners));
      }
      if (Array.isArray(snap.campaigns)) {
        state.campaigns = JSON.parse(JSON.stringify(snap.campaigns));
      }
      if (Array.isArray(snap.popups)) {
        state.popups = JSON.parse(JSON.stringify(snap.popups));
      }
      if (Array.isArray(snap.announcements) && snap.announcements.length > 0) {
        state.announcements = JSON.parse(JSON.stringify(snap.announcements));
      }

      const newVer = createImmutablePublicationSnapshot(
        restoredExp,
        `Rollback from v${targetPub.version}`
      );
      appendAuditLog("ROLLBACK_EXPERIENCE", restoredExp.id, restoredExp.name, prevVer, newVer, {
        restored_from_version: targetPub.version,
        restored_publication_id: targetPub.id,
      });
    }

    // -------------------------------------------------------------------------
    // ACTION 7: SAVE BANNERS / CAMPAIGNS / POPUPS / ANNOUNCEMENTS / SETTINGS
    // -------------------------------------------------------------------------
    else if (action === "save_banners") {
      const banners = Array.isArray(body.banners) ? (body.banners as ExperienceBannerItem[]) : [];
      for (const b of banners) {
        const check = validateDestinationUrl(b.destination_type, b.destination_value);
        if (!check.valid) {
          return NextResponse.json(
            { success: false, message: `Banner "${b.title}": ${check.error}` },
            { status: 400 }
          );
        }
      }
      const prevVer = state.version;
      state.banners = banners;
      state.version = prevVer + 1;
      appendAuditLog("UPDATE_BANNERS", "global", "Banner & Artwork Manager", prevVer, state.version, {
        count: banners.length,
      });
    } else if (action === "save_campaigns") {
      const prevVer = state.version;
      state.campaigns = Array.isArray(body.campaigns) ? body.campaigns : state.campaigns;
      state.version = prevVer + 1;
      appendAuditLog("UPDATE_CAMPAIGNS", "global", "Campaign Manager", prevVer, state.version, {
        count: state.campaigns.length,
      });
    } else if (action === "save_popups") {
      const prevVer = state.version;
      state.popups = Array.isArray(body.popups) ? body.popups : state.popups;
      state.version = prevVer + 1;
      appendAuditLog("UPDATE_POPUPS", "global", "Popup Manager", prevVer, state.version, {
        count: state.popups.length,
      });
    } else if (action === "save_announcements") {
      const prevVer = state.version;
      state.announcements = Array.isArray(body.announcements)
        ? body.announcements
        : state.announcements;
      state.version = prevVer + 1;
      appendAuditLog(
        "UPDATE_ANNOUNCEMENTS",
        "global",
        "Announcement Manager",
        prevVer,
        state.version,
        { count: state.announcements.length }
      );
    } else if (action === "emergency_reset_default") {
      const prevVer = state.version;
      state.experiences = state.experiences.map((e) =>
        e.is_default
          ? {
              ...PREBUILT_EXPERIENCE_PRESETS[0],
              status: "active" as const,
              updated_at: nowIso,
            }
          : { ...e, status: e.status === "active" ? ("draft" as const) : e.status }
      );
      const defExp = state.experiences.find((e) => e.is_default)!;
      const newVer = createImmutablePublicationSnapshot(defExp, "Emergency Reset to Default");
      appendAuditLog("EMERGENCY_RESET_DEFAULT", defExp.id, defExp.name, prevVer, newVer);
    } else {
      return NextResponse.json(
        { success: false, message: `Unsupported action: ${action}` },
        { status: 400 }
      );
    }

    state.updated_at = nowIso;
    const { customerPayload, resolvedState } = buildCustomerActivePayload(state);
    await syncAllSettingsAndTables(resolvedState, customerPayload);

    const scheduleConflicts = detectScheduleConflicts(resolvedState.experiences);

    return NextResponse.json({
      success: true,
      message: "Experience Management configuration saved and synced!",
      data: {
        state: resolvedState,
        activeCustomerExperience: customerPayload,
        scheduleConflicts,
      },
    });
  } catch (err: any) {
    if (err?.name === "AuthError") return authErrorResponse(err);
    console.error("[POST /api/admin/experiences Error]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to update Experience configuration" },
      { status: 500 }
    );
  }
}
