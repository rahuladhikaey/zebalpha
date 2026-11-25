-- ============================================================================
-- SEED ZebQuick-ELIGIBLE SUBCATEGORIES INTO ZEBALPHA `public.categories`
-- Ensures sellers see Bras, Panties, Vests, Trunks, Track Pants, Belts,
-- Wallets, Socks, Handkerchief, Nightwear inside Men's Fashion / Women's
-- Fashion / Fashion Accessories when uploading products.
-- ============================================================================
-- Ensure parent Fashion Accessories exists if not already present
INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
SELECT 'Fashion Accessories', 'fashion-accessories', 'Belts, wallets, purses, card holders & keychains', 'handbag', 'AUTO', 8, true, true, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE slug IN ('fashion-accessories', 'accessories'));

-- Helper block to insert subcategories safely under parent slugs
DO $$
DECLARE
  v_men_id UUID;
  v_women_id UUID;
  v_acc_id UUID;
BEGIN
  SELECT id INTO v_men_id FROM public.categories WHERE slug IN ('mens-fashion', 'men', 'men-fashion') LIMIT 1;
  SELECT id INTO v_women_id FROM public.categories WHERE slug IN ('womens-fashion', 'women', 'women-fashion') LIMIT 1;
  SELECT id INTO v_acc_id FROM public.categories WHERE slug IN ('fashion-accessories', 'accessories', 'jewellery-bags') LIMIT 1;

  -- Women's Fashion subcategories
  IF v_women_id IS NOT NULL THEN
    INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
    SELECT v.name, v.slug, v.descr, 'dress', 'AUTO', v.ord, true, true, v_women_id
    FROM (VALUES
      ('Bras', 'bras', 'Everyday, sports & padded bras', 101),
      ('Panties', 'panties', 'Cotton & seamless panties', 102),
      ('Camisoles', 'camisoles', 'Cotton & stretch camisoles', 103),
      ('Slips', 'slips', 'Inner slips & petticoats', 104),
      ('Women''s Shorts', 'womens-shorts', 'Casual & cycling shorts', 105),
      ('Shapewear', 'shapewear', 'Body shapers & tummy tuckers', 106),
      ('Nightwear', 'nightwear', 'Nighties, sleepwear & pyjama sets', 107)
    ) AS v(name, slug, descr, ord)
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = v.slug);
  END IF;

  -- Men's Fashion subcategories
  IF v_men_id IS NOT NULL THEN
    INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
    SELECT v.name, v.slug, v.descr, 'shirt', 'AUTO', v.ord, true, true, v_men_id
    FROM (VALUES
      ('Men''s Underwear', 'mens-underwear', 'Everyday men''s underwear', 201),
      ('Vest / Sando Ganji', 'vest-sando-ganji', 'Cotton vests & gym sando ganji', 202),
      ('Boxer Shorts', 'boxer-shorts', 'Woven & knitted boxer shorts', 203),
      ('Trunks', 'trunks', 'Cotton & stretch trunks', 204),
      ('Briefs', 'briefs', 'Classic & sport briefs', 205),
      ('Bermudas', 'bermudas', 'Casual & cotton bermudas', 206),
      ('Sports Pants', 'sports-pants', 'Athletic & sports pants', 207),
      ('Track Pants', 'track-pants', 'Dailywear & gym track pants', 208),
      ('Lounge Pants', 'lounge-pants', 'Home & lounge pyjama pants', 209),
      ('Shorts', 'mens-shorts', 'Everyday men''s shorts', 210),
      ('Socks', 'socks', 'Ankle, crew & sports socks', 211),
      ('Handkerchief', 'handkerchief', 'Cotton handkerchiefs & packs', 212)
    ) AS v(name, slug, descr, ord)
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = v.slug);
  END IF;

  -- Fashion Accessories subcategories
  IF v_acc_id IS NOT NULL THEN
    INSERT INTO public.categories (name, slug, description, icon_key, icon_source, display_order, is_active, show_in_navigation, parent_id)
    SELECT v.name, v.slug, v.descr, 'handbag', 'AUTO', v.ord, true, true, v_acc_id
    FROM (VALUES
      ('Belts', 'belts', 'Leather & casual belts', 301),
      ('Money Purses', 'money-purses', 'Compact money & coin purses', 302),
      ('Wallets', 'wallets', 'Men''s & women''s wallets', 303),
      ('Card Holders', 'card-holders', 'Slim RFID & card holders', 304),
      ('Keychains', 'keychains', 'Metal & leather keychains', 305)
    ) AS v(name, slug, descr, ord)
    WHERE NOT EXISTS (SELECT 1 FROM public.categories c WHERE c.slug = v.slug);
  END IF;
END $$;

