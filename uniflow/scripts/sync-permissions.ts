import 'dotenv/config';
import { syncPermissions } from '../src/lib/auth/provisioning';
import { prisma, systemPrisma } from '../src/lib/db/client';

async function main(): Promise<void> {
  try {
    const result = await syncPermissions();
    console.log(`✓ permission catalogue synchronized (${result.synced} permissions)`);
  } finally {
    await Promise.allSettled([prisma.$disconnect(), systemPrisma.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
