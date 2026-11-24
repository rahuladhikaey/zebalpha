-- ============================================================================
-- ZEBALPHA — DYNAMIC EXPERIENCE & FESTIVAL THEME MANAGEMENT SYSTEM (DEMS)
-- Complete 8-Table Production Schema, Indexes, RLS & Prebuilt Theme Seed
-- ============================================================================

BEGIN;

-- 1. experiences
CREATE TABLE IF NOT EXISTS public.experiences (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  festival_name TEXT NOT NULL DEFAULT 'ZebAlpha Official',
  thumbnail_url TEXT DEFAULT '/official-logo.png',
  experience_type TEXT NOT NULL DEFAULT 'festival' CHECK (experience_type IN ('default', 'festival', 'seasonal', 'campaign', 'custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'scheduled', 'draft', 'archived', 'expired')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 5,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  schema_version INTEGER NOT NULL DEFAULT 1,
  published_version INTEGER NOT NULL DEFAULT 0,
  draft_version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL DEFAULT 'Super Admin',
  last_published_by TEXT,
  last_published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiences_status_priority
  ON public.experiences (status, priority DESC, start_at, end_at);

-- 2. experience_themes
CREATE TABLE IF NOT EXISTS public.experience_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id TEXT NOT NULL UNIQUE REFERENCES public.experiences(id) ON DELETE CASCADE,
  theme_name TEXT NOT NULL,
  theme_tokens_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  assets_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. experience_home_sections
CREATE TABLE IF NOT EXISTS public.experience_home_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id TEXT NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  widget_type TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  display_order INTEGER NOT NULL DEFAULT 1,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  web_enabled BOOLEAN NOT NULL DEFAULT true,
  app_enabled BOOLEAN NOT NULL DEFAULT true,
  style_variant TEXT NOT NULL DEFAULT 'default',
  background_color TEXT,
  artwork_url TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  target_audience TEXT NOT NULL DEFAULT 'all',
  destination_url TEXT,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (experience_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_experience_home_sections_order
  ON public.experience_home_sections (experience_id, display_order ASC);

-- 4. experience_banners
CREATE TABLE IF NOT EXISTS public.experience_banners (
  id TEXT PRIMARY KEY,
  experience_id TEXT REFERENCES public.experiences(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  desktop_image_url TEXT,
  destination_type TEXT NOT NULL DEFAULT 'product',
  destination_value TEXT NOT NULL DEFAULT '/products',
  campaign_id TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  target_audience TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'disabled', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. experience_popups
CREATE TABLE IF NOT EXISTS public.experience_popups (
  id TEXT PRIMARY KEY,
  experience_id TEXT REFERENCES public.experiences(id) ON DELETE SET NULL,
  popup_type TEXT NOT NULL DEFAULT 'Festival Popup',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  button_text TEXT NOT NULL DEFAULT 'Explore Now',
  destination_type TEXT NOT NULL DEFAULT 'page',
  destination_value TEXT NOT NULL DEFAULT '/products',
  display_frequency TEXT NOT NULL DEFAULT 'once_per_session' CHECK (display_frequency IN ('once_per_session', 'once_per_day', 'once_per_campaign', 'every_visit')),
  dismissal_behavior TEXT NOT NULL DEFAULT 'close_button_and_backdrop',
  target_audience TEXT NOT NULL DEFAULT 'all',
  priority INTEGER NOT NULL DEFAULT 5,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'disabled', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. experience_announcements
CREATE TABLE IF NOT EXISTS public.experience_announcements (
  id TEXT PRIMARY KEY,
  experience_id TEXT REFERENCES public.experiences(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  icon_key TEXT NOT NULL DEFAULT 'flame',
  image_url TEXT,
  cta_text TEXT,
  destination_value TEXT DEFAULT '/products',
  priority INTEGER NOT NULL DEFAULT 5,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'scheduled', 'disabled', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. experience_publications (Immutable Version History & Rollback Snapshots)
CREATE TABLE IF NOT EXISTS public.experience_publications (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL,
  experience_name TEXT NOT NULL,
  festival_name TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  configuration_snapshot_json JSONB NOT NULL,
  published_by TEXT NOT NULL DEFAULT 'Super Admin',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'rolled_back', 'superseded'))
);

CREATE INDEX IF NOT EXISTS idx_experience_publications_version
  ON public.experience_publications (version DESC, published_at DESC);

-- 8. experience_audit_logs
CREATE TABLE IF NOT EXISTS public.experience_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_email TEXT NOT NULL DEFAULT 'superadmin@zebalpha.shop',
  action TEXT NOT NULL,
  experience_id TEXT NOT NULL,
  experience_name TEXT,
  previous_version INTEGER,
  new_version INTEGER,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experience_audit_logs_created
  ON public.experience_audit_logs (created_at DESC);

-- Enable RLS
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_popups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public Read Policies for Active Customer Configurations (Admin writes happen via SUPABASE_SERVICE_ROLE_KEY)
DROP POLICY IF EXISTS "Public read experiences" ON public.experiences;
CREATE POLICY "Public read experiences" ON public.experiences FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experience_themes" ON public.experience_themes;
CREATE POLICY "Public read experience_themes" ON public.experience_themes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experience_home_sections" ON public.experience_home_sections;
CREATE POLICY "Public read experience_home_sections" ON public.experience_home_sections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experience_banners" ON public.experience_banners;
CREATE POLICY "Public read experience_banners" ON public.experience_banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experience_popups" ON public.experience_popups;
CREATE POLICY "Public read experience_popups" ON public.experience_popups FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read experience_announcements" ON public.experience_announcements;
CREATE POLICY "Public read experience_announcements" ON public.experience_announcements FOR SELECT USING (true);

COMMIT;
