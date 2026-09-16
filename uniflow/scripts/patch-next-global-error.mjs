/**
 * Work around Next.js 16's synthetic /_global-error prerender regression.
 *
 * Next's isPageStatic() returns an empty appConfig for this internal route.
 * The build then treats it as static because `undefined !== 0`, prerenders it
 * without a root layout, and crashes in OuterLayoutRouter when React context
 * has not been initialized. Setting revalidate to zero keeps the runtime error
 * boundary out of the static export list.
 *
 * Upstream report and suggested patch:
 * https://github.com/vercel/next.js/issues/93024
 *
 * Remove this script once the installed stable Next.js release contains the
 * upstream fix. It deliberately fails if Next's generated source no longer
 * matches, so an upgrade cannot silently patch the wrong code.
 */
import fs from 'node:fs';
import path from 'node:path';

const targets = [
  path.resolve('node_modules/next/dist/build/utils.js'),
  path.resolve('node_modules/next/dist/esm/build/utils.js'),
];

for (const target of targets) {
  if (!fs.existsSync(target)) {
    throw new Error(`Next.js build utility was not found: ${target}`);
  }

  const source = fs.readFileSync(target, 'utf8');
  const routeStart = source.indexOf('Skip page data collection for synthetic _global-error routes');
  if (routeStart < 0) {
    throw new Error(`Next.js global-error branch was not found in ${target}`);
  }

  const branchEnd = source.indexOf('await ', routeStart);
  if (branchEnd < 0) {
    throw new Error(`Next.js global-error branch boundary was not found in ${target}`);
  }

  const before = source.slice(0, routeStart);
  const branch = source.slice(routeStart, branchEnd);
  const after = source.slice(branchEnd);

  if (branch.includes('appConfig: { revalidate: 0 }')) {
    console.log(`✓ Next.js global-error workaround already applied (${path.basename(path.dirname(target))})`);
    continue;
  }
  if (!branch.includes('appConfig: {}')) {
    throw new Error(`Next.js global-error appConfig no longer matches the expected source in ${target}`);
  }

  fs.writeFileSync(
    target,
    before + branch.replace('appConfig: {}', 'appConfig: { revalidate: 0 }') + after,
    'utf8',
  );
  console.log(`✓ Applied Next.js global-error prerender workaround (${target})`);
}
