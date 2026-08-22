-- Row-Level Security (RLS) — layer 3 of the tenant-isolation defence in depth
-- (docs/ARCHITECTURE.md §4). This is the layer that survives a bug in the
-- application-level tenant client: even a raw query on a restricted role cannot read
-- or write another website's rows.
--
-- Policy: a row is visible/writable only when its websiteId equals the session GUC
-- `app.website_id`. The app sets this per request/transaction via
--   SELECT set_config('app.website_id', $websiteId, true);
-- The migration is written to be safe to apply on the default (superuser/owner) role,
-- which BYPASSES RLS — see docs/SECURITY.md for how to run the app under a *restricted*
-- role so the policies actually take effect.

-- Helper: current tenant from the GUC (NULL when unset).
CREATE OR REPLACE FUNCTION app_current_website_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.website_id', true), '');
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'Domain','Theme','SiteSettings','FeatureFlag','AnalyticsConfiguration','Membership','Role',
    'Customer','Category','Brand','Collection','Product','ProductVariant','StockMovement','Media',
    'Page','ContentBlock','Menu','Cart','Order','Coupon','ShippingZone','Quiz','QuizResult',
    'VisagismProfile','RecommendationRule','Favorite','AuditLog','NewsletterSubscriber',
    'ContactMessage','ExportJob'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);
    -- Drop any prior policy of the same name to keep this idempotent.
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I;', tbl);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
      USING ("websiteId" = app_current_website_id())
      WITH CHECK ("websiteId" = app_current_website_id());
    $f$, tbl);
  END LOOP;
END $$;

-- Note on Role: system role templates use websiteId = NULL. If you seed such templates,
-- either give them a concrete websiteId or add a permissive policy for NULL tenants on
-- that table only. The application seeds per-website roles, so this default is fine.
