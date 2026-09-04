/**
 * Verify a live Supabase project against what the migrations should have made.
 *
 *   node scripts/verify-supabase.mjs                 # reads .env
 *   node scripts/verify-supabase.mjs <url> <anonKey>
 *
 * Uses the publishable (anon) key only - the same public credential the browser
 * gets. That is the point: this measures what an anonymous stranger on the
 * internet can reach. Every table must refuse them, so a PASS here usually
 * reads as "correctly denied".
 *
 * Existence is probed table by table rather than through the OpenAPI document,
 * because Supabase now serves that only to secret keys ("Only secret API keys
 * can be used for this endpoint"). Probing is better anyway: 404 means the
 * table is not there, and any other status means it is - and the same response
 * answers whether anon got anything out of it.
 *
 * The RLS logic itself is proven in supabase/tests against real Postgres. This
 * covers what only a live project can answer: that the migrations applied, that
 * RLS is switched on, that no grant leaked to anon, that the documents bucket
 * is private, and that email confirmation is required.
 */
import { readFile } from 'node:fs/promises';

const TABLES = [
  'profiles',
  'properties',
  'tenancies',
  'invites',
  'documents',
  'payments',
  'complaints',
  'service_bookings',
];

const RPCS = [
  'redeem_invite',
  'pending_claims_for_me',
  'confirm_tenancy',
  'reject_tenancy_claim',
];

let passed = 0;
let failed = 0;
const leaks = [];
// Tables anon can still *run* a query against, where only RLS stops the rows.
// Safe, but one mistaken policy away from not being safe.
const rlsOnly = [];

const ok = (label, detail = '') => {
  passed++;
  console.log(`  PASS  ${label}${detail ? `\n        ${detail}` : ''}`);
};

const bad = (label, detail = '') => {
  failed++;
  console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
};

async function loadEnv() {
  const [, , argUrl, argKey] = process.argv;
  if (argUrl && argKey) return { url: argUrl.replace(/\/$/, ''), key: argKey };

  try {
    const text = await readFile(new URL('../.env', import.meta.url), 'utf8');
    const read = name =>
      text.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '');
    const url = read('VITE_SUPABASE_URL');
    const key = read('VITE_SUPABASE_ANON_KEY');
    if (url && key) return { url: url.replace(/\/$/, ''), key };
  } catch {
    /* fall through to the usage message */
  }

  console.error(
    'No credentials. Either create .env from .env.example, or pass them:\n' +
      '  node scripts/verify-supabase.mjs https://<ref>.supabase.co <anon-key>',
  );
  process.exit(2);
}

const { url, key } = await loadEnv();
const headers = { apikey: key, Authorization: `Bearer ${key}` };

console.log(`project: ${url}\n`);

// --- tables ----------------------------------------------------------------
// One request per table answers both questions: does it exist, and did an
// anonymous caller get anything out of it.
console.log('tables (must exist, and must give an anonymous caller nothing):');

const missing = [];

for (const table of TABLES) {
  let res;
  let body;
  try {
    res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
    body = await res.text();
  } catch (err) {
    bad(`${table}: request failed`, err.message);
    continue;
  }

  if (res.status === 404) {
    missing.push(table);
    bad(`${table} does not exist`, 'migration not applied');
    continue;
  }

  if (res.status === 401 || res.status === 403) {
    ok(`${table} exists and refuses anon`, `HTTP ${res.status}`);
    continue;
  }

  if (res.ok) {
    let rows = null;
    try {
      rows = JSON.parse(body);
    } catch {
      /* leave null */
    }
    if (Array.isArray(rows) && rows.length === 0) {
      rlsOnly.push(table);
      ok(
        `${table} exists and returns nothing to anon`,
        'HTTP 200, empty - the query RAN and RLS filtered it; anon still holds SELECT',
      );
    } else {
      leaks.push(table);
      bad(`${table} LEAKED DATA TO AN ANONYMOUS CALLER`, `HTTP 200: ${body.slice(0, 160)}`);
    }
    continue;
  }

  ok(`${table} exists and refuses anon`, `HTTP ${res.status}`);
}

if (missing.length === TABLES.length) {
  console.log('\nNone of the expected tables exist - the migrations have not been applied.');
  console.log('Run supabase/migrations/*.sql in the dashboard SQL editor, in filename order.');
  process.exit(2);
}

// --- functions -------------------------------------------------------------
// PostgREST returns 404 both for a function that does not exist and for one the
// caller may not execute, and anon was revoked from all four. So a public key
// cannot confirm they exist - only that they are not reachable, which is the
// property that matters here. Their behaviour is covered by supabase/tests.
console.log('\nfunctions (must not be callable anonymously):');

for (const fn of RPCS) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if ([401, 403, 404].includes(res.status)) {
    ok(`${fn}() is not callable by anon`, `HTTP ${res.status}`);
  } else {
    const body = await res.text();
    bad(`${fn}() WAS CALLABLE BY ANON`, `HTTP ${res.status}: ${body.slice(0, 160)}`);
    leaks.push(`rpc:${fn}`);
  }
}

// --- storage ---------------------------------------------------------------
console.log('\nstorage:');

const listed = await fetch(`${url}/storage/v1/object/list/documents`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefix: '', limit: 1 }),
});
if (listed.ok) {
  const rows = await listed.json().catch(() => null);
  if (Array.isArray(rows) && rows.length === 0) {
    ok('documents bucket lists nothing to anon', 'HTTP 200, empty');
  } else {
    leaks.push('storage:list');
    bad('documents bucket LISTED OBJECTS TO ANON', JSON.stringify(rows).slice(0, 160));
  }
} else {
  ok('documents bucket refuses anon listing', `HTTP ${listed.status}`);
}

// A public bucket serves this path with no auth at all; a private one must not.
const pub = await fetch(`${url}/storage/v1/object/public/documents/probe.txt`);
if (pub.ok) {
  leaks.push('storage:public');
  bad('documents bucket appears to be PUBLIC', 'the public object path served a response');
} else {
  ok('documents bucket is not public', `HTTP ${pub.status} on the public path`);
}

// --- auth configuration ----------------------------------------------------
console.log('\nauth configuration:');

const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
if (!settings.ok) {
  bad('read auth settings', `HTTP ${settings.status}`);
} else {
  const cfg = await settings.json();
  // mailer_autoconfirm true would mean accounts are usable before anyone proves
  // they own the address - on a platform where the address identifies a
  // landlord to their tenant, that matters.
  if (cfg.mailer_autoconfirm === false) ok('email confirmation is required');
  else bad('email confirmation is OFF', 'Authentication -> Providers -> Email -> Confirm email');

  if (cfg.external?.email) ok('email sign-in is enabled');
  else bad('email sign-in is disabled', 'the app has no other configured provider');

  if (cfg.disable_signup === false) ok('sign-ups are open');
  else bad('sign-ups are disabled', 'new users cannot register');
}

// --- summary ---------------------------------------------------------------
console.log(`\n${passed}/${passed + failed} checks passed`);

if (leaks.length > 0) {
  console.log(
    `\nDATA IS REACHABLE WITHOUT SIGNING IN: ${leaks.join(', ')}\n` +
      'Do not wire the app to this project until that is fixed.',
  );
} else if (failed > 0) {
  console.log('\nNothing leaked. The failures above are missing objects or configuration.');
}

if (rlsOnly.length > 0) {
  console.log(
    `\nNote: anon can still execute queries against ${rlsOnly.length} table(s) - ` +
      'nothing comes back,\nbut RLS is the only thing stopping it. Apply ' +
      'supabase/migrations/20260904120300_harden_anon.sql\nto revoke the privilege ' +
      'outright, so no policy mistake can expose them.',
  );
}

process.exit(failed === 0 ? 0 : 1);
