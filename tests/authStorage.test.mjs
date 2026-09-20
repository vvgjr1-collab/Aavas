/**
 * Where the auth client's storage puts things, and why it matters.
 *
 * "Remember me" decides how long a *session* lives. The PKCE code verifier is
 * not a session: it is written when a recovery link is asked for and read when
 * that link is opened, and a link in an email always opens in a new tab.
 * sessionStorage is per tab, so filing the verifier by the remember-me rule
 * meant that for anybody who had unticked the box, password reset could never
 * work - not on another device, on the same machine, in the same minute.
 *
 * These run the real module against fake Storage objects, so the rule is
 * pinned rather than re-reasoned every time the file is touched.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';

function fakeStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: k => map.delete(k),
    get size() {
      return map.size;
    },
    keys: () => Array.from(map.keys()),
  };
}

let pass = 0;
let fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log('  PASS  ' + label);
  } else {
    fail++;
    console.log(
      '  FAIL  ' + label +
      '\n        expected ' + JSON.stringify(expected) +
      '\n        got      ' + JSON.stringify(actual),
    );
  }
};

/**
 * Load supabase.ts with a browser-shaped global in place.
 *
 * createClient is stubbed: this is about the storage adapter, and building a
 * real client would need a network stack we do not have here.
 */
async function loadModule() {
  const dir = mkdtempSync(join(tmpdir(), 'authstore-'));
  const src = readFileSync(new URL('../src/lib/supabase.ts', import.meta.url), 'utf8');
  const { code } = transformSync(src, { loader: 'ts', format: 'esm' });

  // Capture the options handed to createClient so the adapter can be reached,
  // and drop the import of the real library.
  const stubbed =
    'export let __options = null;\n' +
    'const createClient = (u, k, o) => { __options = o; return {}; };\n' +
    code
      .replace(/import\s*\{[^}]*\}\s*from\s*['"]@supabase\/supabase-js['"];?/g, '')
      .replace(/import\.meta\.env/g, 'globalThis.__env');

  const file = join(dir, 'supabase.mjs');
  writeFileSync(file, stubbed);
  return import(pathToFileURL(file).href);
}

globalThis.__env = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-key',
};

const local = fakeStorage();
const session = fakeStorage();
globalThis.window = {
  localStorage: local,
  sessionStorage: session,
  // The module reads this at load to spot a link arriving with an auth code.
  location: { search: '', hash: '', href: 'https://example.test/' },
};

const mod = await loadModule();
const storage = mod.__options?.auth?.storage;

console.log('\nthe storage adapter is wired up:');
check('the client was built with one', typeof storage?.setItem, 'function');

const VERIFIER = 'sb-abc-auth-token-code-verifier';
const FLOW_VERIFIER = 'sb-abc-auth-token-flow-f1-code-verifier';
const TOKEN = 'sb-abc-auth-token';

console.log('\nwith "remember me" unticked:');
mod.setRememberMe(false);
check('the choice is recorded', mod.getRememberMe(), false);

local.removeItem(VERIFIER);
session.removeItem(VERIFIER);
storage.setItem(TOKEN, 'a-session');
check('the session goes to sessionStorage, as chosen', session.getItem(TOKEN), 'a-session');
check('and is not left in localStorage', local.getItem(TOKEN), null);

storage.setItem(VERIFIER, 'v1');
// The whole point: a new tab has an empty sessionStorage, so a verifier filed
// there is gone by the time the emailed link is opened.
check('the code verifier goes to localStorage anyway', local.getItem(VERIFIER), 'v1');
check('and not to sessionStorage', session.getItem(VERIFIER), null);

storage.setItem(FLOW_VERIFIER, 'v2');
check('a per-flow verifier is treated the same', local.getItem(FLOW_VERIFIER), 'v2');
check('and is readable back', storage.getItem(FLOW_VERIFIER), 'v2');

console.log('\nwith "remember me" left alone:');
mod.setRememberMe(true);
check('remembering is the default', mod.getRememberMe(), true);
storage.setItem(TOKEN, 'b-session');
check('the session goes to localStorage', local.getItem(TOKEN), 'b-session');
check('and is cleared from sessionStorage', session.getItem(TOKEN), null);

console.log('\nsigning out clears both:');
storage.removeItem(VERIFIER);
storage.removeItem(TOKEN);
check('no verifier left anywhere', [local.getItem(VERIFIER), session.getItem(VERIFIER)], [null, null]);
check('no session left anywhere', [local.getItem(TOKEN), session.getItem(TOKEN)], [null, null]);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
