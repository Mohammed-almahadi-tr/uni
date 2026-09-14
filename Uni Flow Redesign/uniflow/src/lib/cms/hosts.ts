import 'server-only';
import { withSystem, withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * Which university a request is for (SRS REQ-LP-01, Track C1).
 *
 * ## What this replaces
 *
 * Nothing, and that is the point. The legacy product had no notion of "which
 * tenant is this" because each customer got a copy of the source tree with
 * its own bitmaps compiled in. The evidence that this does not work is still
 * in the repository:
 *
 * ```vb
 * Me.Text = "Oasis Computer Systems"      ' frmMain.designer.vb:233  (Ribat)
 * Me.Text = "الكلية التكنلوجية"            ' frmMainPanal.Designer.vb:56 (Nile)
 * ```
 *
 * The Ribat University build titles its main window with the *vendor's* name.
 * The Nile College build titles its main window with a *third institution's*
 * name, left behind by whoever copied the folder to start it — and ships that
 * institution's icon, `KCT_Logo_A-2.ico`, as project content. Two customers,
 * two wrong identities, and no test could have caught either, because there
 * was no per-tenant behaviour to test.
 *
 * ## The mechanism
 *
 * A hostname resolves to exactly one tenant, because `tenant_domains.host` is
 * globally unique. That single constraint is the entire cross-tenant
 * guarantee for the public surface: there is no ambiguity for application
 * code to resolve, and therefore no bug to write there.
 *
 * ## Why this one lookup runs as the owner
 *
 * Every other read in the application runs under `withTenant`, which sets
 * `app.tenant_id` and lets RLS confine the query. This lookup is what
 * *produces* that tenant id, so at the moment it runs there is nothing to
 * confine it to. It therefore runs under `withSystem`, exactly as the
 * sessionless registration-card verification does (B4), and is written to be
 * safe in that position: a single equality read on a normalised host,
 * returning the tenant's public identity and nothing else. No caller-supplied
 * predicate reaches the database.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

/**
 * Reduce whatever arrived in the `Host` header to the form stored in the
 * table: lowercase, no scheme, no port, no trailing dot, no path.
 *
 * `www.example.edu` is deliberately *not* folded into `example.edu`. They are
 * different hosts; if both should work, both are registered, and one of them
 * is canonical so the other redirects. Folding them here would mean a tenant
 * could be served on a host it never claimed.
 */
export function normaliseHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let host = raw.trim().toLowerCase();

  // Strip a scheme if someone passed a URL.
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  // Strip anything from the first slash, question mark or hash.
  host = host.replace(/[/?#].*$/, '');
  // Strip credentials.
  host = host.replace(/^[^@]*@/, '');
  // Strip the port. IPv6 literals in brackets are not supported and are not a
  // hostname a university publishes.
  host = host.replace(/:\d+$/, '');
  // Strip the FQDN's trailing dot.
  host = host.replace(/\.$/, '');

  if (!host) return null;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(host)) {
    return null;
  }
  if (host.length > 253) return null;
  return host;
}

export interface ResolvedTenant {
  tenantId: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  /** The currency the books are kept in. Carried here because every page that
   *  shows a student money needs it and none of them should be guessing: an
   *  amount rendered against the wrong currency is a figure somebody acts on. */
  functionalCurrency: string;
  /** The host the request arrived on, normalised. */
  host: string;
  /** True when that host is the one the site advertises. */
  isCanonical: boolean;
  /** Where to redirect when it is not. Null when the tenant has set none. */
  canonicalHost: string | null;
}

/**
 * Turn a `Host` header into a tenant, or null.
 *
 * Null is a real answer and the caller must render it as "no site is
 * configured at this address" — never as a fallback to some other tenant.
 * Guessing here is how one university's branding ends up on another's domain,
 * which is the failure this whole module exists to make impossible.
 *
 * An unverified host resolves to null even when it is on file: registering a
 * domain must not be sufficient to be served on it.
 */
export async function resolveTenantByHost(
  rawHost: string | null | undefined,
): Promise<ResolvedTenant | null> {
  const host = normaliseHost(rawHost);
  if (!host) return null;

  return withSystem(async (tx) => {
    const row = await tx.tenantDomain.findUnique({
      where: { host },
      select: {
        host: true,
        isCanonical: true,
        isVerified: true,
        tenant: {
          select: {
            id: true,
            slug: true,
            nameAr: true,
            nameEn: true,
            functionalCurrency: true,
            isActive: true,
            domains: {
              where: { isCanonical: true },
              select: { host: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!row || !row.isVerified) return null;
    // A tenant whose contract has ended stops being served. The rows stay —
    // the ledger still refers to them — but the public site does not.
    if (!row.tenant.isActive) return null;

    return {
      tenantId: row.tenant.id,
      slug: row.tenant.slug,
      nameAr: row.tenant.nameAr,
      nameEn: row.tenant.nameEn,
      functionalCurrency: row.tenant.functionalCurrency.trim(),
      host: row.host,
      isCanonical: row.isCanonical,
      canonicalHost: row.tenant.domains[0]?.host ?? null,
    };
  });
}

export interface AddDomainInput {
  host: string;
  /** Platform operators verify a domain once they have seen the DNS record. */
  verified?: boolean;
  /** Make this the address the site advertises. Implies verified. */
  canonical?: boolean;
}

/**
 * Attach a hostname to a tenant.
 *
 * Requires `tenant.manage`, which is a platform permission and is deliberately
 * not in any tenant's default roles: a university must not be able to claim a
 * hostname for itself, because the namespace is shared with every other
 * university on the platform.
 */
export async function addDomain(
  principal: Principal,
  tenantId: string,
  input: AddDomainInput,
): Promise<{ id: string; host: string }> {
  requirePermission(principal, 'tenant.manage');

  const host = normaliseHost(input.host);
  if (!host) {
    throw new DomainError(
      `"${input.host}" is not a hostname. Give the bare host — no scheme, no port, no path.`,
    );
  }

  const canonical = input.canonical ?? false;
  const verified = canonical ? true : (input.verified ?? false);

  return withSystem(async (tx) => {
    const taken = await tx.tenantDomain.findUnique({
      where: { host },
      select: { tenantId: true },
    });
    if (taken) {
      throw new DomainError(
        taken.tenantId === tenantId
          ? `${host} is already attached to this university.`
          : `${host} is attached to another university on this platform. ` +
            `One host serves one tenant, and the database enforces it.`,
      );
    }

    if (canonical) {
      await tx.tenantDomain.updateMany({
        where: { tenantId, isCanonical: true },
        data: { isCanonical: false },
      });
    }

    const row = await tx.tenantDomain.create({
      data: { tenantId, host, isVerified: verified, isCanonical: canonical },
      select: { id: true, host: true },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'TenantDomain',
      resourceId: row.id,
      after: { host, isVerified: verified, isCanonical: canonical },
    });

    return row;
  });
}

/** Record that the DNS record has been seen. */
export async function verifyDomain(
  principal: Principal,
  tenantId: string,
  host: string,
): Promise<void> {
  requirePermission(principal, 'tenant.manage');
  const normalised = normaliseHost(host);
  if (!normalised) throw new DomainError(`"${host}" is not a hostname.`);

  await withSystem(async (tx) => {
    const row = await tx.tenantDomain.findUnique({
      where: { host: normalised },
      select: { id: true, tenantId: true, isVerified: true },
    });
    if (!row || row.tenantId !== tenantId) {
      throw new DomainError(`${normalised} is not attached to this university.`);
    }
    if (row.isVerified) return;

    await tx.tenantDomain.update({ where: { id: row.id }, data: { isVerified: true } });
    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'TenantDomain',
      resourceId: row.id,
      before: { isVerified: false },
      after: { isVerified: true },
    });
  });
}

/**
 * Make one of a tenant's hosts the canonical one.
 *
 * A canonical host must be verified — `chk_canonical_is_verified` — because
 * the canonical host is what every other host redirects to, and redirecting
 * traffic to an address nobody has proved control of is worse than serving
 * the request where it landed.
 */
export async function setCanonicalDomain(
  principal: Principal,
  tenantId: string,
  host: string,
): Promise<void> {
  requirePermission(principal, 'tenant.manage');
  const normalised = normaliseHost(host);
  if (!normalised) throw new DomainError(`"${host}" is not a hostname.`);

  await withSystem(async (tx) => {
    const row = await tx.tenantDomain.findUnique({
      where: { host: normalised },
      select: { id: true, tenantId: true, isVerified: true },
    });
    if (!row || row.tenantId !== tenantId) {
      throw new DomainError(`${normalised} is not attached to this university.`);
    }
    if (!row.isVerified) {
      throw new DomainError(
        `${normalised} has not been verified. Every other address redirects to the canonical ` +
          `one, so it cannot be a host nobody has proved control of.`,
      );
    }

    await tx.tenantDomain.updateMany({
      where: { tenantId, isCanonical: true },
      data: { isCanonical: false },
    });
    await tx.tenantDomain.update({ where: { id: row.id }, data: { isCanonical: true } });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'TenantDomain',
      resourceId: row.id,
      after: { isCanonical: true },
    });
  });
}

export interface DomainRow {
  id: string;
  host: string;
  isCanonical: boolean;
  isVerified: boolean;
}

export async function listDomains(
  principal: Principal,
  tenantId?: string,
): Promise<DomainRow[]> {
  requirePermission(principal, 'tenant.manage');
  const scope = tenantId ?? principal.tenantId;
  return withSystem((tx) =>
    tx.tenantDomain.findMany({
      where: { tenantId: scope },
      orderBy: [{ isCanonical: 'desc' }, { host: 'asc' }],
      select: { id: true, host: true, isCanonical: true, isVerified: true },
    }),
  );
}

/** Detach a host. The tenant's content is untouched; only the address goes. */
export async function removeDomain(
  principal: Principal,
  tenantId: string,
  host: string,
): Promise<void> {
  requirePermission(principal, 'tenant.manage');
  const normalised = normaliseHost(host);
  if (!normalised) throw new DomainError(`"${host}" is not a hostname.`);

  await withSystem(async (tx) => {
    const row = await tx.tenantDomain.findUnique({
      where: { host: normalised },
      select: { id: true, tenantId: true, isCanonical: true },
    });
    if (!row || row.tenantId !== tenantId) {
      throw new DomainError(`${normalised} is not attached to this university.`);
    }
    await tx.tenantDomain.delete({ where: { id: row.id } });
    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'DELETE',
      resourceType: 'TenantDomain',
      resourceId: row.id,
      before: { host: normalised, isCanonical: row.isCanonical },
    });
  });
}

/** Used by the request-scoped paths that already know their tenant. */
export async function canonicalHostFor(tenantId: string, tx?: Tx): Promise<string | null> {
  const read = async (t: Tx) => {
    const row = await t.tenantDomain.findFirst({
      where: { tenantId, isCanonical: true },
      select: { host: true },
    });
    return row?.host ?? null;
  };
  return tx ? read(tx) : withTenant(tenantId, read);
}
