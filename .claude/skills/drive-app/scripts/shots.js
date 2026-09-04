/**
 * Screenshot a set of routes, for before/after visual comparison.
 *
 *   node .claude/skills/drive-app/scripts/shots.js <outDir> <prefix> [baseUrl]
 *
 * Take shots BEFORE a styling change, make the change, take them again with a
 * different prefix, then open both and compare. Viewport heights are printed:
 * a consistent delta across every page usually means a spacing or height
 * regression rather than a content change.
 */
const { connect } = require('./cdp');

const OUT = process.argv[2];
const PREFIX = process.argv[3];
const BASE = process.argv[4] || 'http://localhost:4173';

if (!OUT || !PREFIX) {
  console.error('usage: node shots.js <outDir> <prefix> [baseUrl]');
  process.exit(2);
}

const SETTLE = BASE.startsWith('http://localhost') ? 3500 : 6500;

const PAGES = [
  ['home', '#/'],
  ['login', '#/login'],
  ['role', '#/role'],
  ['tenant', '#/tenant'],
  ['rent-agree', '#/tenant/rent?tab=agreement'],
  ['rent-hist', '#/tenant/rent?tab=history'],
  ['utilities', '#/tenant/utilities'],
  ['lc-call', '#/tenant/landlord-contact?tab=call'],
  ['lc-msg', '#/tenant/landlord-contact?tab=message'],
  ['landlord', '#/landlord'],
  ['property-1', '#/landlord/properties/1'],
];

async function main() {
  require('fs').mkdirSync(OUT, { recursive: true });
  const page = await connect();
  for (const [name, route] of PAGES) {
    await page.load(`${BASE}/${route}`, SETTLE);
    const { file, height } = await page.screenshot(`${OUT}/${PREFIX}-${name}.png`);
    const size = require('fs').statSync(file).size;
    console.log(`  ${name.padEnd(12)} ${String(size).padStart(7)} B  (1280x${height})`);
  }
  page.close();
  process.exit(0);
}

main().catch(e => { console.error('shot error:', e.message); process.exit(1); });
