/**
 * Smoke test: every route renders the right screen, and navigation works.
 *
 *   node .claude/skills/drive-app/scripts/smoke.js [baseUrl]
 *
 * baseUrl defaults to the local preview. Pass the deployed URL to check
 * production, e.g. https://vvgjr1-collab.github.io/Aavas
 */
const { connect, checker } = require('./cdp');

const BASE = process.argv[2] || 'http://localhost:4173';
const SETTLE = BASE.startsWith('http://localhost') ? 3200 : 6500;

// hash route -> a string that must appear on that screen
const ROUTES = [
  ['#/', 'Everything you need'],
  ['#/login', 'Welcome back'],
  ['#/signup', 'Create account'],
  ['#/role', 'Welcome,'],
  ['#/tenant', 'Welcome Home,'],
  ['#/tenant/rent?tab=agreement', 'Rent Agreement Document'],
  ['#/tenant/rent?tab=history', 'UPI Transfer'],
  ['#/tenant/utilities', 'Utility Services'],
  ['#/tenant/complaint', 'Register a Complaint'],
  ['#/tenant/landlord-contact?tab=call', 'Contact Your Landlord'],
  ['#/landlord', 'Property Portfolio'],
  ['#/landlord/properties/new', 'Add New Property Listing'],
  ['#/landlord/properties/1', 'Modern 2BHK Apartment'],
];

// routes that must redirect somewhere else
const GUARDS = [
  ['#/tenant/utilities/book', '#/tenant/utilities', 'Utility Services'],
  ['#/landlord/properties/999', '#/landlord', 'Property Portfolio'],
  ['#/nope-not-a-route', '#/', 'Everything you need'],
];

async function main() {
  const page = await connect();
  const { check, report } = checker();

  console.log('routes render:');
  for (const [route, marker] of ROUTES) {
    await page.load(`${BASE}/${route}`, SETTLE);
    const ok = await page.evaluate(
      `document.body.innerText.includes(${JSON.stringify(marker)})`
    );
    check(`${route} -> "${marker}"`, ok, true);
  }

  console.log('\nredirect guards:');
  for (const [route, , marker] of GUARDS) {
    await page.load(`${BASE}/${route}`, SETTLE);
    const ok = await page.evaluate(
      `document.body.innerText.includes(${JSON.stringify(marker)})`
    );
    check(`${route} redirects`, ok, true);
  }

  console.log('\nnavigation + history:');
  await page.load(`${BASE}/#/`, SETTLE);
  check('landing hash', await page.hash(), '#/');
  await page.clickText('Get Started');
  check('Get Started -> #/signup', await page.hash(), '#/signup');
  await page.evaluate('history.back()');
  await new Promise(r => setTimeout(r, 700));
  check('back -> #/', await page.hash(), '#/');
  await page.evaluate('history.forward()');
  await new Promise(r => setTimeout(r, 700));
  check('forward -> #/signup', await page.hash(), '#/signup');

  console.log('\naccessible names (no unlabelled icon buttons):');
  await page.load(`${BASE}/#/landlord`, SETTLE);
  const unlabelled = await page.evaluate(`(() => {
    return [...document.querySelectorAll('button')].filter(b => {
      const text = (b.innerText || '').trim();
      return !text && !b.getAttribute('aria-label') && !b.getAttribute('aria-labelledby');
    }).length;
  })()`);
  check('landlord dashboard: unlabelled buttons', unlabelled, 0);

  console.log('\ntab semantics + keyboard:');
  await page.load(`${BASE}/#/tenant/rent?tab=agreement`, SETTLE);
  check('tablist present', await page.evaluate(`document.querySelectorAll('[role="tablist"]').length`), 1);
  check('aria-selected',
    await page.evaluate(`[...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected'))`),
    ['true', 'false']);
  await page.evaluate(`document.querySelector('[role="tab"][aria-selected="true"]').focus()`);
  await page.press('ArrowRight');
  check('ArrowRight moves selection',
    await page.evaluate(`[...document.querySelectorAll('[role="tab"]')].map(t => t.getAttribute('aria-selected'))`),
    ['false', 'true']);

  page.close();
  process.exit(report());
}

main().catch(e => { console.error('driver error:', e.message); process.exit(2); });
