import { Prisma } from '@/generated/prisma/client';

/**
 * Deterministic JSON serialisation.
 *
 * Two callers depend on this and both break subtly without it:
 *
 *   audit/log.ts   — the hash chain covers before/after payloads that are
 *                    stored as `jsonb`. **Postgres jsonb does not preserve
 *                    key order**: it normalises keys by length then bytewise,
 *                    so `{nameAr, nameEn, requiresCostCenter, code}` comes
 *                    back as `{code, nameAr, nameEn, requiresCostCenter}`.
 *                    Hashing the raw JSON.stringify at write time and again
 *                    at verify time therefore produces different digests for
 *                    identical data, and the verifier reports tampering that
 *                    never happened. Found by the chart-of-accounts suite,
 *                    which was the first to log a multi-key payload.
 *
 *   idempotency.ts — a client that serialises `{a, b}` one request and
 *                    `{b, a}` the next is sending the same request. Treating
 *                    that as a key conflict would be a bug in us.
 *
 * Sorting keys recursively makes both cases stable.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value instanceof Prisma.Decimal) return JSON.stringify(value.toFixed());
  if (Array.isArray(value)) {
    // Array order is meaningful and is preserved.
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
