/**
 * Verify a live Supabase project against what the migrations should have made.
 *
 *   node scripts/verify-supabase.mjs                 # reads .env
 *   node scripts/verify-supabase.mjs <url> <anonKey>
 *
 * Uses the anon key only - the same public credential the browser gets. That is
 * the point: this checks what an anonymous stranger on the internet can reach.
 * Every table must refuse them, so a PASS here means "correctly denied".
 *
 * The RLS logic itself is proven in supabase/tests (real Postgres, every
 * signed-in case). This checks the things only a live project can answer: that
 * the migrations actually applied, that RLS is switched on, that no grant leaked
 * to anon, and that the documents bucket is private.
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

function ok(label, detail = '') {
  passed++;
  console.log(`  PASS  ${label}${detail ? `\n        ${detail}` : ''}`);
}

function bad(label, detail = '') {
  failed++;
  console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
}

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

// --- the migrations applied ------------------------------------------------
console.log('schema:');

let spec;
try {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { ...headers, Accept: 'application/openapi+json' },
  });
  spec = await res.json();
} catch (err) {
  bad('reach the REST API', err.message);
  console.log('\nCannot continue without the API. Check the URL and key.');
  process.exit(1);
}

const exposed = new Set(Object.keys(spec?.definitions ?? spec?.components?.schemas ?? {}));
const present = TABLES.filter(t => exposed.has(t));

// Nothing below can be interpreted without the tables. A missing table 404s
// exactly like a protected one, so continuing here would print a screen of
// reassuring passes for a database that does not exist yet.
if (present.length === 0) {
  console.log('  none of the expected tables exist\n');
  console.log('The migrations have not been applied to this project.');
  console.log('Run these in the dashboard SQL editor, in order:');
  console.log('  1. supabase/migrations/20260904120000_schema.sql');
  console.log('  2. supabase/migrations/20260904120100_policies.sql');
  console.log('  3. supabase/migrations/20260904120200_storage.sql');
  console.log('\nThen run this again.');
  process.exit(2);
}

for (const table of TABLES) {
  if (exposed.has(table)) ok(`table ${table} exists`);
  else bad(`table ${table} is MISSING`, 'migrations only partly applied');
}

const rpcPaths = Object.keys(spec?.paths ?? {});
for (const fn of RPCS) {
  if (rpcPaths.includes(`/rpc/${fn}`)) ok(`function ${fn}() is exposed`);
  else bad(`function ${fn}() is missing`);
}

// --- anon is locked out ----------------------------------------------------
console.log('\nanonymous access (every one of these must be refused):');

for (const table of present) {
  const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
  const body = await res.text();

  // 404 here would mean the table vanished between the two calls; it is not
  // evidence of protection, so do not score it as such.
  if (res.status === 404) {
    bad(`${table} returned 404`, 'table missing - this is not proof of protection');
    continue;
  }

  if (res.status === 401 || res.status === 403) {
    ok(`${table} refuses anon`, `HTTP ${res.status}`);
    continue;
  }
  if (res.ok) {
    let rows;
    try {
      rows = JSON.parse(body);
    } catch {
      rows = null;
    }
    // An empty array means RLS filtered everything, which is safe but weaker
    // than a hard refusal - worth seeing in the output.
    if (Array.isArray(rows) && rows.length === 0) {
      ok(`${table} returns nothing to anon`, 'HTTP 200 with an empty result (RLS filtered)');
    } else {
      bad(
        `${table} LEAKED DATA TO AN ANONYMOUS CALLER`,
        `HTTP 200: ${body.slice(0, 160)}`,
      );
    }
    continue;
  }
  ok(`${table} refuses anon`, `HTTP ${res.status}`);
}

console.log('\nanonymous RPC calls (must be refused):');
for (const fn of RPCS) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  // 404 also counts: PostgREST hides a function anon cannot execute.
  if (res.status === 401 || res.status === 403 || res.status === 404) {
    ok(`${fn}() refuses anon`, `HTTP ${res.status}`);
  } else {
    const body = await res.text();
    bad(`${fn}() was callable by anon`, `HTTP ${res.status}: ${body.slice(0, 160)}`);
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
  const rows = await listed.json();
  if (Array.isArray(rows) && rows.length === 0) {
    ok('documents bucket lists nothing to anon', 'HTTP 200, empty');
  } else {
    bad('documents bucket LISTED OBJECTS TO ANON', JSON.stringify(rows).slice(0, 160));
  }
} else {
  ok('documents bucket refuses anon listing', `HTTP ${listed.status}`);
}

// A public bucket serves this path without auth; a private one must not.
const pub = await fetch(`${url}/storage/v1/object/public/documents/probe.txt`);
if (pub.status === 400 || pub.status === 404) {
  ok('documents bucket is not public', `HTTP ${pub.status} on the public path`);
} else if (pub.ok) {
  bad('documents bucket appears to be PUBLIC', 'the public object path served a response');
} else {
  ok('documents bucket is not public', `HTTP ${pub.status}`);
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) {
  console.log(
    '\nA FAIL is either a missing object (migrations incomplete) or data reachable\n' +
      'without signing in. Read the detail line; the second kind blocks wiring the app.',
  );
}
process.exit(failed === 0 ? 0 : 1);
