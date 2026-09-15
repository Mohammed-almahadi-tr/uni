import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Argon2 is a native addon; it must not be bundled into the server build.
  serverExternalPackages: ['@node-rs/argon2'],
  // Ministry workbooks are posted through a Server Action. Keep this below
  // Vercel's 4.5 MB request limit so multipart overhead cannot trigger a 413.
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
};

export default withNextIntl(nextConfig);
