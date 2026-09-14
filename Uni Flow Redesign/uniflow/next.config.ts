import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Argon2 is a native addon; it must not be bundled into the server build.
  serverExternalPackages: ['@node-rs/argon2'],
};

export default withNextIntl(nextConfig);
