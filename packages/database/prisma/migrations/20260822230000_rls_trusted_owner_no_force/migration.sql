-- Fix: 20260822190000_row_level_security applied FORCE ROW LEVEL SECURITY, which —
-- contrary to that migration's own stated intent — makes the policies apply to the
-- TABLE OWNER as well. On managed hosts (e.g. Render) the single provisioned role owns
-- the tables and is NOT a superuser, so migrations/seed/runtime all run as the owner
-- and every tenant-table write failed with 42501 ("new row violates row-level security
-- policy"), and every read would have come back empty. Locally the bug was masked
-- because the dev role is a superuser (superusers bypass RLS even under FORCE).
--
-- The intended architecture (docs/SECURITY.md) is two-tier:
--   * the OWNER role is the trusted backend (migrations, seed, the app server in the
--     default single-role deployment) → bypasses policies, standard Postgres semantics;
--   * an optional RESTRICTED role (optic_app) runs the app when layer-3 enforcement is
--     wanted → ENABLE ROW LEVEL SECURITY is fully enforced for any non-owner role, with
--     the same strict tenant policies (no permissive USING(true) anywhere).
--
-- So: drop FORCE, keep ENABLE and the tenant_isolation policies untouched.

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
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;
