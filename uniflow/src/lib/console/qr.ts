import 'server-only';
import QRCode from 'qrcode';

/**
 * The registration card's QR code (SRS REQ-REG-05, Track D3).
 *
 * ## Why a dependency, when A7 wrote its own XLSX writer
 *
 * Because the two are not alike. A spreadsheet is a ZIP of XML: if the writer
 * is wrong, the file does not open, and the failure is loud. A QR symbol is
 * Reed-Solomon codewords laid out under one of eight masks, and a wrong
 * implementation produces a picture that **looks exactly like a QR code** and
 * scans as nothing — or, worse, scans as something else. That is the same
 * argument A7 made for not generating Arabic PDF content streams by hand:
 * output that looks right, gets printed, gets signed, and is wrong in a way
 * nobody can see by looking.
 *
 * So the encoder is one with its own conformance tests rather than one
 * written here and eyeballed.
 *
 * ## Why SVG
 *
 * The card is printed at least as often as it is read on screen, and a raster
 * QR at screen resolution is unreliable on paper. SVG scales, embeds inline
 * with no second request, and costs nothing at print time.
 */

/**
 * Encode a verification URL as an inline SVG symbol.
 *
 * Error correction level Q rather than the M default: these cards are folded,
 * stamped and carried in pockets for a term, and Q tolerates about 25% of the
 * symbol being damaged instead of 15%. The cost is a slightly denser symbol,
 * which matters far less than a card that stops scanning in March.
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'Q',
    // One module of quiet zone rather than the default four: the card's own
    // layout provides the white space, and four modules inside a small box
    // shrinks the symbol itself.
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/**
 * The absolute URL a scanner should land on.
 *
 * Built from the tenant's canonical host — `registrationCard` deliberately
 * returns only a path, because the module that knows the fee arithmetic has
 * no business knowing which domain the university publishes under. A card
 * printed with the wrong origin verifies against the wrong site, or none.
 */
export function verifyUrl(canonicalHost: string | null, verifyPath: string): string {
  if (!canonicalHost) return verifyPath;
  const scheme = canonicalHost === 'localhost' || canonicalHost.startsWith('127.')
    ? 'http'
    : 'https';
  return `${scheme}://${canonicalHost}${verifyPath}`;
}
