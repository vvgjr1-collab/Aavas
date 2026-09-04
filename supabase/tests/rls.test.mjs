/**
 * Proves the Row Level Security policies.
 *
 * The anon key is public on a static host, so these policies are the whole
 * security model. Each case below is a claim about what one signed-in user can
 * and cannot reach, checked against real Postgres.
 *
 *   node --run db:test
 */
import { createDatabase, createUser, asUser, expectDenied } from './harness.mjs';

let passed = 0;
let failed = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) passed++;
  else {
    failed++;
    console.log(`  FAIL  ${label}`);
    console.log(`        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return false;
  }
  console.log(`  PASS  ${label}`);
  return true;
}

/** A denial is any error; assert one happened and show why. */
function checkDenied(label, message) {
  if (message) {
    passed++;
    console.log(`  PASS  ${label}`);
    console.log(`        denied: ${message.split('\n')[0].slice(0, 92)}`);
    return true;
  }
  failed++;
  console.log(`  FAIL  ${label} - the operation was ALLOWED`);
  return false;
}

const main = async () => {
  const { db, migrations } = await createDatabase();
  console.log(`migrations applied: ${migrations.length}`);
  for (const m of migrations) console.log(`  ${m}`);

  // --- cast -----------------------------------------------------------------
  const landlordA = await createUser(db, 'landlord.a@example.com', 'Asha Landlord');
  const landlordB = await createUser(db, 'landlord.b@example.com', 'Bala Landlord');
  const tenantA = await createUser(db, 'tenant.a@example.com', 'Tara Tenant');
  const tenantB = await createUser(db, 'tenant.b@example.com', 'Tom Tenant');
  const stranger = await createUser(db, 'nosy@example.com', 'Nosy Parker');

  console.log('\nprofile rows created by the auth trigger:');
  const profiles = await db.query('select count(*)::int as n from public.profiles');
  check('one profile per auth user', profiles.rows[0].n, 5);

  // --- landlord-first onboarding -------------------------------------------
  console.log('\nlandlord-first onboarding:');

  const propA = await asUser(db, landlordA, async () => {
    const r = await db.query(
      `insert into public.properties (landlord_id, title, address_line, city, rent, deposit)
       values ($1, 'Modern 2BHK', 'Sector 18', 'Noida', 25000, 50000) returning id`,
      [landlordA],
    );
    return r.rows[0].id;
  });
  check('landlord can create a property', typeof propA, 'string');

  checkDenied(
    'landlord cannot create a property owned by someone else',
    await expectDenied(db, landlordB, () =>
      db.query(
        `insert into public.properties (landlord_id, title, address_line)
         values ($1, 'Not mine', 'Somewhere')`,
        [landlordA],
      ),
    ),
  );

  const tenancyA = await asUser(db, landlordA, async () => {
    const r = await db.query(
      `insert into public.tenancies
         (property_id, landlord_id, source, status, rent, deposit, start_date, end_date, created_by)
       values ($1, $2, 'landlord', 'pending', 25000, 50000, '2026-01-01', '2026-12-31', $2)
       returning id`,
      [propA, landlordA],
    );
    return r.rows[0].id;
  });

  const inviteCode = 'AAVAS-TEST-01';
  await asUser(db, landlordA, () =>
    db.query(
      `insert into public.invites (tenancy_id, code, email, created_by)
       values ($1, $2, 'tenant.a@example.com', $3)`,
      [tenancyA, inviteCode, landlordA],
    ),
  );

  checkDenied(
    'a tenant cannot read the invites table to harvest codes',
    await expectDenied(db, tenantA, async () => {
      const r = await db.query('select code from public.invites');
      if (r.rows.length === 0) throw new Error('no rows visible (RLS filtered them)');
      return r;
    }),
  );

  const redeemed = await asUser(db, tenantA, async () => {
    const r = await db.query('select public.redeem_invite($1) as id', [inviteCode]);
    return r.rows[0].id;
  });
  check('tenant redeems the invite and joins the tenancy', redeemed, tenancyA);

  const activated = await asUser(db, landlordA, async () => {
    const r = await db.query(
      'select status, tenant_id, confirmed_at is not null as confirmed from public.tenancies where id = $1',
      [tenancyA],
    );
    return r.rows[0];
  });
  check('tenancy is active on the landlord figures', activated, {
    status: 'active',
    tenant_id: tenantA,
    confirmed: true,
  });

  checkDenied(
    'the same invite cannot be redeemed twice',
    await expectDenied(db, tenantB, () =>
      db.query('select public.redeem_invite($1)', [inviteCode]),
    ),
  );

  // --- the landlord's number wins ------------------------------------------
  console.log("\nthe landlord's figures are authoritative:");

  checkDenied(
    'tenant cannot rewrite the agreed rent',
    await expectDenied(db, tenantA, () =>
      db.query('update public.tenancies set rent = 1 where id = $1', [tenancyA]),
    ),
  );

  checkDenied(
    'tenant cannot change the lease dates',
    await expectDenied(db, tenantA, () =>
      db.query("update public.tenancies set end_date = '2099-01-01' where id = $1", [tenancyA]),
    ),
  );

  checkDenied(
    'tenant cannot end the tenancy',
    await expectDenied(db, tenantA, () =>
      db.query("update public.tenancies set status = 'ended' where id = $1", [tenancyA]),
    ),
  );

  const rentAfterLandlordEdit = await asUser(db, landlordA, async () => {
    await db.query('update public.tenancies set rent = 27000 where id = $1', [tenancyA]);
    const r = await db.query('select rent::int as rent from public.tenancies where id = $1', [
      tenancyA,
    ]);
    return r.rows[0].rent;
  });
  check('landlord can revise the agreed rent', rentAfterLandlordEdit, 27000);

  // --- tenant-first onboarding ---------------------------------------------
  console.log('\ntenant-first onboarding (landlord has not signed up yet):');

  const claim = await asUser(db, tenantB, async () => {
    const r = await db.query(
      `insert into public.tenancies
         (tenant_id, source, status, claimed_address, claimed_landlord_email,
          proposed_rent, proposed_deposit, created_by)
       values ($1, 'tenant', 'pending', '123 Sunset Blvd, Mumbai',
               'landlord.b@example.com', 45000, 90000, $1)
       returning id`,
      [tenantB],
    );
    return r.rows[0].id;
  });
  check('tenant can declare a tenancy with no landlord attached', typeof claim, 'string');

  checkDenied(
    'a tenant claim cannot grant itself agreed terms',
    await expectDenied(db, tenantB, () =>
      db.query(
        `insert into public.tenancies
           (tenant_id, source, status, claimed_address, rent, created_by)
         values ($1, 'tenant', 'pending', 'Nice try', 1, $1)`,
        [tenantB],
      ),
    ),
  );

  checkDenied(
    'a tenant cannot open a tenancy that starts out active',
    await expectDenied(db, tenantB, () =>
      db.query(
        `insert into public.tenancies
           (tenant_id, source, status, claimed_address, confirmed_at, created_by)
         values ($1, 'tenant', 'active', 'Nice try', now(), $1)`,
        [tenantB],
      ),
    ),
  );

  const visibleClaims = await asUser(db, landlordB, async () => {
    const r = await db.query('select id from public.pending_claims_for_me()');
    return r.rows.map(x => x.id);
  });
  check('landlord sees the claim addressed to their email', visibleClaims, [claim]);

  const notMyClaims = await asUser(db, landlordA, async () => {
    const r = await db.query('select id from public.pending_claims_for_me()');
    return r.rows.map(x => x.id);
  });
  check('a different landlord sees none of it', notMyClaims, []);

  const propB = await asUser(db, landlordB, async () => {
    const r = await db.query(
      `insert into public.properties (landlord_id, title, address_line, city)
       values ($1, 'Sunset Apartment', '123 Sunset Blvd', 'Mumbai') returning id`,
      [landlordB],
    );
    return r.rows[0].id;
  });

  const confirmed = await asUser(db, landlordB, async () => {
    const r = await db.query(
      `select rent::int as rent, deposit::int as deposit, status, landlord_id,
              proposed_rent::int as proposed_rent
         from public.confirm_tenancy($1, $2, 47000, 94000, '2026-02-01', '2027-01-31')`,
      [claim, propB],
    );
    return r.rows[0];
  });
  check("landlord's figures overwrite the tenant's proposal", confirmed, {
    rent: 47000,
    deposit: 94000,
    status: 'active',
    landlord_id: landlordB,
    proposed_rent: 45000,
  });

  checkDenied(
    'a landlord cannot confirm a claim onto a property they do not own',
    await expectDenied(db, landlordA, () =>
      db.query('select public.confirm_tenancy($1, $2, 1, 1, null, null)', [claim, propB]),
    ),
  );

  // --- withdrawing a claim -------------------------------------------------
  console.log('\nwithdrawing a pending tenancy:');

  const throwaway = await asUser(db, tenantB, async () => {
    const r = await db.query(
      `insert into public.tenancies
         (tenant_id, source, status, claimed_address, created_by)
       values ($1, 'tenant', 'pending', 'Typo Street', $1) returning id`,
      [tenantB],
    );
    return r.rows[0].id;
  });

  checkDenied(
    'someone else cannot delete your pending claim',
    await expectDenied(db, stranger, async () => {
      const r = await db.query('delete from public.tenancies where id = $1 returning id', [
        throwaway,
      ]);
      if (r.rows.length === 0) throw new Error('no rows deleted (RLS filtered them)');
      return r;
    }),
  );

  const withdrawn = await asUser(db, tenantB, async () => {
    const r = await db.query('delete from public.tenancies where id = $1 returning id', [
      throwaway,
    ]);
    return r.rows.length;
  });
  check('a tenant can withdraw their own pending claim', withdrawn, 1);

  checkDenied(
    'an active tenancy cannot be deleted, only ended',
    await expectDenied(db, landlordA, async () => {
      const r = await db.query('delete from public.tenancies where id = $1 returning id', [
        tenancyA,
      ]);
      if (r.rows.length === 0) throw new Error('no rows deleted (RLS filtered them)');
      return r;
    }),
  );

  // --- isolation between tenancies -----------------------------------------
  console.log('\nisolation between unrelated users:');

  await asUser(db, tenantA, () =>
    db.query(
      `insert into public.documents (tenancy_id, kind, storage_path, file_name, uploaded_by)
       values ($1, 'agreement', $2, 'lease.pdf', $3)`,
      [tenancyA, `tenancies/${tenancyA}/agreement/lease.pdf`, tenantA],
    ),
  );

  const ownDocs = await asUser(db, landlordA, async () => {
    const r = await db.query('select count(*)::int as n from public.documents');
    return r.rows[0].n;
  });
  check("landlord reads their own tenancy's agreement", ownDocs, 1);

  for (const [who, id] of [
    ['the other tenant', tenantB],
    ['the other landlord', landlordB],
    ['an unrelated user', stranger],
  ]) {
    const n = await asUser(db, id, async () => {
      const r = await db.query('select count(*)::int as n from public.documents');
      return r.rows[0].n;
    });
    check(`${who} sees no documents at all`, n, 0);
  }

  const strangerSees = await asUser(db, stranger, async () => {
    const r = await db.query(`
      select
        (select count(*)::int from public.tenancies)        as tenancies,
        (select count(*)::int from public.properties)       as properties,
        (select count(*)::int from public.payments)         as payments,
        (select count(*)::int from public.complaints)       as complaints,
        (select count(*)::int from public.invites)          as invites
    `);
    return r.rows[0];
  });
  check('an unrelated signed-in user sees nothing anywhere', strangerSees, {
    tenancies: 0,
    properties: 0,
    payments: 0,
    complaints: 0,
    invites: 0,
  });

  // Assert the strong form. "Zero rows" would also pass a weaker check, but it
  // means the only thing standing between anon and the data is a policy - and
  // one mistaken `using (true)` would be enough. After the hardening migration
  // anon holds no SELECT privilege at all, so the request is refused outright.
  const anonAttempt = await expectDenied(db, null, async () => {
    const r = await db.query('select count(*)::int as n from public.tenancies');
    throw new Error(`readable: the query ran and returned ${r.rows[0].n} rows`);
  });
  check(
    'a signed-out caller is refused outright, not merely filtered',
    /permission denied/.test(anonAttempt || ''),
    true,
  );
  if (anonAttempt) console.log(`        ${anonAttempt.split('\n')[0].slice(0, 92)}`);

  // --- profile visibility ---------------------------------------------------
  console.log('\nprofile visibility:');

  const counterparty = await asUser(db, tenantA, async () => {
    const r = await db.query('select full_name from public.profiles where id = $1', [landlordA]);
    return r.rows.map(x => x.full_name);
  });
  check('tenant can read their own landlord (Contact Landlord needs this)', counterparty, [
    'Asha Landlord',
  ]);

  const otherPeople = await asUser(db, tenantA, async () => {
    const r = await db.query('select count(*)::int as n from public.profiles where id = $1', [
      landlordB,
    ]);
    return r.rows[0].n;
  });
  check('but not an unrelated landlord', otherPeople, 0);

  // --- payments -------------------------------------------------------------
  console.log('\npayments:');

  await asUser(db, tenantA, () =>
    db.query(
      `insert into public.payments (tenancy_id, amount, status, recorded_by)
       values ($1, 27000, 'reported', $2)`,
      [tenancyA, tenantA],
    ),
  );
  check('tenant can report a payment', true, true);

  checkDenied(
    'tenant cannot record a payment as received',
    await expectDenied(db, tenantA, () =>
      db.query(
        `insert into public.payments (tenancy_id, amount, status, recorded_by)
         values ($1, 27000, 'paid', $2)`,
        [tenancyA, tenantA],
      ),
    ),
  );

  const marked = await asUser(db, landlordA, async () => {
    await db.query(
      `update public.payments set status = 'paid', paid_at = now() where tenancy_id = $1`,
      [tenancyA],
    );
    const r = await db.query('select status from public.payments where tenancy_id = $1', [
      tenancyA,
    ]);
    return r.rows[0].status;
  });
  check('landlord confirms receipt', marked, 'paid');

  checkDenied(
    'tenant cannot flip a payment to paid afterwards',
    await expectDenied(db, tenantA, async () => {
      const r = await db.query(
        `update public.payments set status = 'paid' where tenancy_id = $1 returning id`,
        [tenancyA],
      );
      if (r.rows.length === 0) throw new Error('no rows updated (RLS filtered them)');
      return r;
    }),
  );

  // --- storage paths --------------------------------------------------------
  console.log('\nstorage path authorisation:');

  const pathCases = await asUser(db, tenantA, async () => {
    const r = await db.query(
      `select
         app.can_access_document_path($1) as own,
         app.can_access_document_path($2) as other,
         app.can_access_document_path('tenancies/not-a-uuid/agreement/x.pdf') as junk,
         app.can_access_document_path('../../etc/passwd')                     as traversal,
         app.can_access_document_path($3)                                     as bare,
         app.can_access_document_path(null)                                   as nul`,
      [
        `tenancies/${tenancyA}/agreement/lease.pdf`,
        `tenancies/${claim}/agreement/lease.pdf`,
        `tenancies/${tenancyA}`,
      ],
    );
    return r.rows[0];
  });
  check('tenant can reach their own tenancy folder', pathCases.own, true);
  check("but not another tenancy's folder", pathCases.other, false);
  check('a malformed uuid is refused, not raised', pathCases.junk, false);
  check('a traversal-shaped path is refused', pathCases.traversal, false);
  check('a bare tenancy folder is refused', pathCases.bare, false);
  check('a null path is refused', pathCases.nul, false);

  // --- co-tenants ----------------------------------------------------------
  console.log('\nco-tenants sharing one lease:');

  const secondCode = 'AAVAS-TEST-02';
  await asUser(db, landlordA, () =>
    db.query(
      'insert into public.invites (tenancy_id, code, created_by) values ($1, $2, $3)',
      [tenancyA, secondCode, landlordA],
    ),
  );

  const joinedSecond = await asUser(db, stranger, async () => {
    const r = await db.query('select public.redeem_invite($1) as id', [secondCode]);
    return r.rows[0].id;
  });
  check('a second tenant joins the same tenancy', joinedSecond, tenancyA);

  const members = await asUser(db, landlordA, async () => {
    const r = await db.query(
      'select count(*)::int as n from public.tenancy_members where tenancy_id = $1',
      [tenancyA],
    );
    return r.rows[0].n;
  });
  check('the tenancy has two members', members, 2);

  const coTenantSees = await asUser(db, stranger, async () => {
    const r = await db.query('select rent::int as rent from public.tenancies where id = $1', [tenancyA]);
    return r.rows[0] ? r.rows[0].rent : null;
  });
  check('the co-tenant reads the same tenancy and rent', coTenantSees, 27000);

  const coSeesLandlord = await asUser(db, stranger, async () => {
    const r = await db.query('select full_name from public.profiles where id = $1', [landlordA]);
    return r.rows.map(x => x.full_name);
  });
  check('and can see the landlord', coSeesLandlord, ['Asha Landlord']);

  checkDenied(
    'a co-tenant still cannot rewrite the rent',
    await expectDenied(db, stranger, () =>
      db.query('update public.tenancies set rent = 1 where id = $1', [tenancyA]),
    ),
  );

  checkDenied(
    'the same person cannot join twice',
    await expectDenied(db, stranger, () =>
      db.query('select public.redeem_invite($1)', [secondCode]),
    ),
  );

  // --- leaving -------------------------------------------------------------
  console.log('\nleaving needs both sides:');

  checkDenied(
    'a tenant cannot end the tenancy directly',
    await expectDenied(db, tenantA, () =>
      db.query("update public.tenancies set status = 'ended' where id = $1", [tenancyA]),
    ),
  );

  checkDenied(
    'a landlord cannot end one that was never requested',
    await expectDenied(db, landlordA, () =>
      db.query('select public.approve_end_tenancy($1)', [tenancyA]),
    ),
  );

  const requested = await asUser(db, tenantA, async () => {
    await db.query('select public.request_end_tenancy($1)', [tenancyA]);
    const r = await db.query(
      'select end_requested_at is not null as asked, status from public.tenancies where id = $1',
      [tenancyA],
    );
    return r.rows[0];
  });
  check('a tenant can ask to leave, and nothing ends yet', requested, { asked: true, status: 'active' });

  checkDenied(
    'an unrelated landlord cannot approve it',
    await expectDenied(db, landlordB, () =>
      db.query('select public.approve_end_tenancy($1)', [tenancyA]),
    ),
  );

  const ended = await asUser(db, landlordA, async () => {
    await db.query('select public.approve_end_tenancy($1)', [tenancyA]);
    const r = await db.query(
      'select status, ended_at is not null as closed from public.tenancies where id = $1',
      [tenancyA],
    );
    const p = await db.query('select status from public.properties where id = $1', [propA]);
    return Object.assign({}, r.rows[0], { property: p.rows[0].status });
  });
  check('approving ends it and frees the property', ended, { status: 'ended', closed: true, property: 'vacant' });

  const kept = await asUser(db, tenantA, async () => {
    const r = await db.query('select count(*)::int as n from public.payments where tenancy_id = $1', [tenancyA]);
    return r.rows[0].n;
  });
  check('payments survive the tenancy ending', kept > 0, true);

  console.log(`\n${passed}/${passed + failed} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
};



main().catch(err => {
  console.error('\nharness error:', err.message);
  process.exit(1);
});
