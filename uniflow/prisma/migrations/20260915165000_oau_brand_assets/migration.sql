-- Apply the university's checked-in brand asset to existing OAU tenants.
-- Other tenants keep their own branding untouched.
UPDATE tenant_branding AS branding
SET
  logo_url = '/oau-logo.png',
  logo_dark_url = '/oau-logo.png',
  favicon_url = '/oau-logo.png'
FROM tenants AS tenant
WHERE tenant.id = branding.tenant_id
  AND (
    tenant.name_en = 'Omdurman Alahlia University'
    OR tenant.name_ar = 'جامعة امدرمان الاهلية'
  );
