-- Dark mode as a stored preference.
--
-- The smallest change that makes the choice follow the person rather than the
-- browser: one enum and one column on `users`, defaulted so every existing row
-- is already valid and no backfill is needed. Nothing reads it but the
-- interface — no policy, posting rule or printed document is affected.

CREATE TYPE "theme_preference" AS ENUM ('SYSTEM', 'LIGHT', 'DARK');

ALTER TABLE "users"
  ADD COLUMN "theme_preference" "theme_preference" NOT NULL DEFAULT 'SYSTEM';
