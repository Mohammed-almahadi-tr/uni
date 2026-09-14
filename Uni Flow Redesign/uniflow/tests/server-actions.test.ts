import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * What a `'use server'` file may export.
 *
 * **Async functions, and nothing else.** Every export of such a module becomes
 * a server reference, and Next refuses the whole module the moment an action
 * on it is invoked — *"A "use server" file can only export async functions,
 * found object."*
 *
 * The reason this test exists rather than a code review note: that refusal is
 * a **runtime** one. Exporting a plain object beside an action passes
 * `tsc --noEmit`, passes `eslint`, passes `next build`, and passes every one
 * of the suites in this directory, because none of them loads a route through
 * Next's server-actions loader. It then returns 500 the first time somebody
 * presses the button — and the only forms it breaks are the ones nobody can
 * test without a browser.
 *
 * It was found on C2's application wizard and status lookup and on all four of
 * C3's forms, by pressing the buttons against a running development server.
 * Six files, every public form in the product, broken since the day each was
 * written. The initial state each of them was exporting now lives in a plain
 * `state.ts` beside the action, imported by both the action and the component
 * it feeds — one definition, and one that a `'use server'` file may hold.
 *
 * Types are exempt because they are erased before the loader ever sees them.
 */

const ROOT = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** Files whose first statement is the `'use server'` directive. */
function serverActionFiles(): string[] {
  return walk(ROOT).filter((f) => {
    const head = readFileSync(f, 'utf8').slice(0, 200);
    return /^\s*(['"])use server\1;/.test(head);
  });
}

/** Every top-level export in a file, as `kind name` pairs. */
function exportsOf(source: string): Array<{ kind: string; name: string }> {
  const out: Array<{ kind: string; name: string }> = [];
  const re =
    /^export\s+(?:(async\s+function)|(function)|(const)|(let)|(var)|(class)|(type)|(interface)|(default)|(\{))\s*([A-Za-z0-9_$]*)/gm;
  for (const m of source.matchAll(re)) {
    const kind =
      m[1] ? 'async function'
      : m[2] ? 'function'
      : m[3] ? 'const'
      : m[4] ? 'let'
      : m[5] ? 'var'
      : m[6] ? 'class'
      : m[7] ? 'type'
      : m[8] ? 'interface'
      : m[9] ? 'default'
      : 'named re-export';
    out.push({ kind, name: m[11] || '(unnamed)' });
  }
  return out;
}

describe("'use server' modules", () => {
  it('exist, so this test is testing something', () => {
    expect(serverActionFiles().length).toBeGreaterThan(0);
  });

  it('export async functions and nothing else', () => {
    const offenders: string[] = [];

    for (const file of serverActionFiles()) {
      const source = readFileSync(file, 'utf8');
      for (const e of exportsOf(source)) {
        // Types and interfaces are erased before the loader sees the module.
        if (e.kind === 'type' || e.kind === 'interface') continue;
        if (e.kind === 'async function') continue;
        offenders.push(
          `${file.replace(process.cwd(), '.')}: export ${e.kind} ${e.name}`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });
});
