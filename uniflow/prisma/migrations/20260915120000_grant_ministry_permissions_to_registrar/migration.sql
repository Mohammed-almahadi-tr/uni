-- The Ministry XLSX workflow was added after some tenants had already been
-- provisioned. Keep the global permission catalogue and the shipped Registrar
-- role in those tenants in sync with src/lib/auth/permissions.ts.
INSERT INTO permissions ("key", description)
VALUES
  ('admission.import', 'Import Ministry admission candidate workbooks'),
  ('admission.manage', 'Review and decide Ministry admission candidates')
ON CONFLICT ("key") DO UPDATE
SET description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_key)
SELECT r.id, permission_key
FROM roles AS r
CROSS JOIN (
  VALUES
    ('admission.import'),
    ('admission.manage')
) AS ministry_permissions(permission_key)
WHERE r.name = 'Registrar'
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- Existing sessions cache their permission set. Force users assigned to the
-- updated role to authenticate again so the navigation and route guards see
-- the newly granted permissions immediately.
UPDATE users AS u
SET session_version = u.session_version + 1
WHERE EXISTS (
  SELECT 1
  FROM user_roles AS ur
  JOIN roles AS r ON r.id = ur.role_id
  WHERE ur.user_id = u.id
    AND r.name = 'Registrar'
);
