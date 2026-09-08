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

  // --- whose portfolio is it -----------------------------------------------
  console.log('\nreadable is not the same as owned:');

  // The policy deliberately lets a tenant read the property they rent - their
  // own dashboard has to show the address. So an unfiltered select is not a
  // portfolio, and the app must not treat it as one.
  const tenantSees = await asUser(db, tenantA, async () => {
    const all = await db.query('select id from public.properties');
    const owned = await db.query('select id from public.properties where landlord_id = $1', [tenantA]);
    return { readable: all.rows.length, owned: owned.rows.length };
  });
  check('a tenant can read the property they rent', tenantSees.readable, 1);
  check('but owns none of it, which is what the portfolio must ask', tenantSees.owned, 0);

  const landlordSees = await asUser(db, landlordA, async () => {
    const r = await db.query('select id from public.properties where landlord_id = $1', [landlordA]);
    return r.rows.length;
  });
  check('and the same question still answers the landlord', landlordSees, 1);

  checkDenied(
    'a tenant still cannot edit the property they rent',
    await expectDenied(db, tenantA, async () => {
      const r = await db.query(
        "update public.properties set title = 'Mine now' where id = $1 returning id",
        [propA],
      );
      if (r.rows.length === 0) throw new Error('no rows updated (RLS filtered them)');
      return r;
    }),
  );

  checkDenied(
    'nor delete it',
    await expectDenied(db, tenantA, async () => {
      const r = await db.query('delete from public.properties where id = $1 returning id', [propA]);
      if (r.rows.length === 0) throw new Error('no rows deleted (RLS filtered them)');
      return r;
    }),
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

  // --- messages -------------------------------------------------------------
  console.log('\nmessages are between the parties, and immutable:');

  const sent = await asUser(db, tenantA, async () => {
    const r = await db.query(
      'insert into public.messages (tenancy_id, sender_id, body) values ($1, $2, $3) returning id',
      [tenancyA, tenantA, 'The kitchen tap is dripping.'],
    );
    return r.rows[0].id;
  });
  check('a tenant can write to their landlord', typeof sent, 'string');

  const landlordReads = await asUser(db, landlordA, async () => {
    const r = await db.query('select body from public.messages where tenancy_id = $1', [tenancyA]);
    return r.rows.map(x => x.body);
  });
  check('and the landlord reads it', landlordReads, ['The kitchen tap is dripping.']);

  const outsiderReads = await asUser(db, landlordB, async () => {
    const r = await db.query('select count(*)::int as n from public.messages');
    return r.rows[0].n;
  });
  check('somebody outside the tenancy sees nothing', outsiderReads, 0);

  checkDenied(
    'and cannot write into it either',
    await expectDenied(db, landlordB, () =>
      db.query(
        'insert into public.messages (tenancy_id, sender_id, body) values ($1, $2, $3)',
        [tenancyA, landlordB, 'Hello?'],
      ),
    ),
  );

  checkDenied(
    'nobody can send as somebody else',
    await expectDenied(db, landlordA, () =>
      db.query(
        'insert into public.messages (tenancy_id, sender_id, body) values ($1, $2, $3)',
        [tenancyA, tenantA, 'Words the tenant never wrote'],
      ),
    ),
  );

  checkDenied(
    'an empty message is refused',
    await expectDenied(db, tenantA, () =>
      db.query(
        'insert into public.messages (tenancy_id, sender_id, body) values ($1, $2, $3)',
        [tenancyA, tenantA, '   '],
      ),
    ),
  );

  checkDenied(
    'the recipient cannot rewrite what was said',
    await expectDenied(db, landlordA, () =>
      db.query("update public.messages set body = 'I never said that' where id = $1", [sent]),
    ),
  );

  checkDenied(
    'nor can the sender, once it has gone',
    await expectDenied(db, tenantA, async () => {
      const r = await db.query(
        "update public.messages set body = 'edited' where id = $1 returning id",
        [sent],
      );
      if (r.rows.length === 0) throw new Error('no rows updated (RLS filtered them)');
      return r;
    }),
  );

  const markedRead = await asUser(db, landlordA, async () => {
    await db.query('update public.messages set read_at = now() where id = $1', [sent]);
    const r = await db.query('select read_at is not null as read from public.messages where id = $1', [sent]);
    return r.rows[0].read;
  });
  check('the recipient can mark it read', markedRead, true);

  checkDenied(
    'but cannot mark it unread again',
    await expectDenied(db, landlordA, () =>
      db.query('update public.messages set read_at = null where id = $1', [sent]),
    ),
  );

  checkDenied(
    'and a sender cannot mark their own message read',
    await expectDenied(db, tenantA, async () => {
      const r = await db.query(
        'update public.messages set read_at = now() where id = $1 returning id',
        [sent],
      );
      if (r.rows.length === 0) throw new Error('no rows updated (RLS filtered them)');
      return r;
    }),
  );

  const callEntry = await asUser(db, tenantA, async () => {
    const r = await db.query(
      "insert into public.messages (tenancy_id, sender_id, body, kind) values ($1, $2, '', 'call') returning id",
      [tenancyA, tenantA],
    );
    return r.rows[0].id;
  });
  check('a call can be recorded', typeof callEntry, 'string');

  const bothKinds = await asUser(db, landlordA, async () => {
    const r = await db.query(
      'select kind, count(*)::int as n from public.messages where tenancy_id = $1 group by kind order by kind',
      [tenancyA],
    );
    return r.rows.map(x => x.kind + ':' + x.n);
  });
  // Ordered by the enum, which lists text first.
  check('and sits in the same record as the texts', bothKinds, ['text:1', 'call:1']);

  checkDenied(
    'a call entry cannot carry words nobody said',
    await expectDenied(db, tenantA, () =>
      db.query(
        "insert into public.messages (tenancy_id, sender_id, body, kind) values ($1, $2, 'we agreed on the phone', 'call')",
        [tenancyA, tenantA],
      ),
    ),
  );

  checkDenied(
    'and a text still cannot be empty',
    await expectDenied(db, tenantA, () =>
      db.query(
        "insert into public.messages (tenancy_id, sender_id, body, kind) values ($1, $2, '', 'text')",
        [tenancyA, tenantA],
      ),
    ),
  );

  checkDenied(
    'a call cannot be relabelled as a message afterwards',
    await expectDenied(db, landlordA, () =>
      db.query("update public.messages set kind = 'text' where id = $1", [callEntry]),
    ),
  );

  checkDenied(
    'a call entry cannot be deleted either',
    await expectDenied(db, landlordA, async () => {
      const r = await db.query('delete from public.messages where id = $1 returning id', [callEntry]);
      if (r.rows.length === 0) throw new Error('no rows deleted (RLS filtered them)');
      return r;
    }),
  );


  checkDenied(
    'a message cannot be deleted at all',
    // A delete with no policy matches no rows rather than raising, which reads
    // as success. Ask what it actually removed.
    await expectDenied(db, landlordA, async () => {
      const r = await db.query('delete from public.messages where id = $1 returning id', [sent]);
      if (r.rows.length === 0) throw new Error('no rows deleted (RLS filtered them)');
      return r;
    }),
  );

  const survives = await asUser(db, landlordA, async () => {
    const r = await db.query('select count(*)::int as n from public.messages where id = $1', [sent]);
    return r.rows[0].n;
  });
  check('and it is still there afterwards', survives, 1);

  const anonSees = await db.query("select count(*)::int as n from pg_policies where tablename = 'messages'");
  check('the messages table is governed by policies', anonSees.rows[0].n >= 3, true);


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

  // Property photos are a public-read bucket, so only the write side is
  // guarded - and it is guarded by exactly this.
  const photoPaths = await asUser(db, landlordA, async () => {
    const r = await db.query(
      `select
         app.owns_property_path($1) as own,
         app.owns_property_path($2) as other,
         app.owns_property_path('properties/not-a-uuid/photo.jpg') as junk,
         app.owns_property_path('../../etc/passwd')                as traversal,
         app.owns_property_path($3)                                as bare,
         app.owns_property_path(null)                              as nul`,
      [
        `properties/${propA}/front.jpg`,
        `properties/${propB}/front.jpg`,
        `properties/${propA}`,
      ],
    );
    return r.rows[0];
  });
  check('a landlord can write under their own property folder', photoPaths.own, true);
  check("but not under another landlord's", photoPaths.other, false);
  check('a malformed property uuid is refused, not raised', photoPaths.junk, false);
  check('a traversal-shaped photo path is refused', photoPaths.traversal, false);
  check('the folder root itself is not a photo path', photoPaths.bare, false);
  check('and null is refused', photoPaths.nul, false);

  const tenantPhotoWrite = await asUser(db, tenantA, async () => {
    const r = await db.query('select app.owns_property_path($1) as ok', [
      `properties/${propA}/front.jpg`,
    ]);
    return r.rows[0].ok;
  });
  check('a tenant cannot write photos on the property they rent', tenantPhotoWrite, false);
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
  console.log('\nnotice runs both ways, and needs both sides:');

  const outsider = await createUser(db, 'outsider@example.com', 'Olly Outsider');

  checkDenied(
    'a tenant cannot end the tenancy directly',
    await expectDenied(db, tenantA, () =>
      db.query("update public.tenancies set status = 'ended' where id = $1", [tenancyA]),
    ),
  );

  checkDenied(
    'a landlord cannot end one where no notice was given',
    await expectDenied(db, landlordA, () =>
      db.query('select public.approve_end_tenancy($1)', [tenancyA]),
    ),
  );

  checkDenied(
    'somebody outside the tenancy cannot give notice on it',
    await expectDenied(db, outsider, () =>
      db.query('select public.request_end_tenancy($1, $2, $3)', [tenancyA, 'moving_out', '']),
    ),
  );

  const requested = await asUser(db, tenantA, async () => {
    await db.query('select public.request_end_tenancy($1, $2, $3)', [
      tenancyA, 'moving_out', 'Job is moving to Bengaluru.',
    ]);
    const r = await db.query(
      'select end_requested_at is not null as asked, status from public.tenancies where id = $1',
      [tenancyA],
    );
    return r.rows[0];
  });
  check('a tenant can give notice, and nothing ends yet', requested, { asked: true, status: 'active' });

  const stored = await asUser(db, landlordA, async () => {
    const r = await db.query(
      'select end_reason, end_notes from public.tenancies where id = $1',
      [tenancyA],
    );
    return r.rows[0];
  });
  check('the reason and the words reach the other side', stored, {
    end_reason: 'moving_out',
    end_notes: 'Job is moving to Bengaluru.',
  });

  checkDenied(
    'an unrelated landlord cannot approve it',
    await expectDenied(db, landlordB, () =>
      db.query('select public.approve_end_tenancy($1)', [tenancyA]),
    ),
  );

  checkDenied(
    'the party who gave notice cannot approve their own',
    await expectDenied(db, tenantA, () =>
      db.query('select public.approve_end_tenancy($1)', [tenancyA]),
    ),
  );

  checkDenied(
    'and the party who received it cannot withdraw it',
    await expectDenied(db, landlordA, () =>
      db.query('select public.cancel_end_request($1)', [tenancyA]),
    ),
  );

  const notOverwritten = await asUser(db, landlordA, async () => {
    await db.query('select public.request_end_tenancy($1, $2, $3)', [
      tenancyA, 'rent_arrears', 'Overwritten?',
    ]);
    const r = await db.query(
      'select end_reason, end_requested_by = $2 as by_tenant from public.tenancies where id = $1',
      [tenancyA, tenantA],
    );
    return r.rows[0];
  });
  check('notice already given is not rewritten by the other party', notOverwritten, {
    end_reason: 'moving_out',
    by_tenant: true,
  });

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

  // The other direction: the landlord gives notice, and the tenant agrees.
  const propD = await asUser(db, landlordB, async () => {
    const r = await db.query(
      `insert into public.properties (landlord_id, title, address_line, city, rent, deposit)
       values ($1, 'Notice Flat', '7 Church Street', 'Bengaluru', 30000, 60000) returning id`,
      [landlordB],
    );
    return r.rows[0].id;
  });
  const codeD = await asUser(db, landlordB, async () => {
    const r = await db.query('select code from public.current_join_code($1)', [propD]);
    return r.rows[0].code;
  });
  const tenancyD = await asUser(db, outsider, async () => {
    const r = await db.query('select public.redeem_invite($1) as id', [codeD]);
    return r.rows[0].id;
  });

  const landlordNotice = await asUser(db, landlordB, async () => {
    await db.query('select public.request_end_tenancy($1, $2, $3)', [
      tenancyD, 'rent_arrears', 'Two months outstanding.',
    ]);
    const r = await db.query('select status, end_reason from public.tenancies where id = $1', [tenancyD]);
    return r.rows[0];
  });
  check('a landlord can give notice too, and nothing ends yet', landlordNotice, {
    status: 'active',
    end_reason: 'rent_arrears',
  });

  checkDenied(
    'the landlord cannot then approve their own notice',
    await expectDenied(db, landlordB, () =>
      db.query('select public.approve_end_tenancy($1)', [tenancyD]),
    ),
  );

  const withdrawnNotice = await asUser(db, landlordB, async () => {
    await db.query('select public.cancel_end_request($1)', [tenancyD]);
    const r = await db.query(
      'select end_requested_at is null as clear, end_reason from public.tenancies where id = $1',
      [tenancyD],
    );
    return r.rows[0];
  });
  check('whoever gave notice can withdraw it', withdrawnNotice, { clear: true, end_reason: '' });

  const endedByTenant = await asUser(db, landlordB, async () => {
    await db.query('select public.request_end_tenancy($1, $2, $3)', [tenancyD, 'end_of_term', '']);
    return true;
  }).then(() => asUser(db, outsider, async () => {
    await db.query('select public.approve_end_tenancy($1)', [tenancyD]);
    const r = await db.query('select status from public.tenancies where id = $1', [tenancyD]);
    return r.rows[0].status;
  }));
  check('the tenant agreeing ends it just the same', endedByTenant, 'ended');


  // --- deleting an account -------------------------------------------------
  console.log('\nan account cannot be closed out from under the other party:');

  // propD's tenancy was ended earlier; give landlordB a live one to be held by.
  const propE = await asUser(db, landlordB, async () => {
    const r = await db.query(
      `insert into public.properties (landlord_id, title, address_line, city, rent, deposit)
       values ($1, 'Held Flat', '3 Hill Road', 'Mumbai', 20000, 40000) returning id`,
      [landlordB],
    );
    return r.rows[0].id;
  });
  const codeE = await asUser(db, landlordB, async () => {
    const r = await db.query('select code from public.current_join_code($1)', [propE]);
    return r.rows[0].code;
  });
  const leaver = await createUser(db, 'leaver@example.com', 'Lena Leaver');
  const tenancyE = await asUser(db, leaver, async () => {
    const r = await db.query('select public.redeem_invite($1) as id', [codeE]);
    return r.rows[0].id;
  });

  const landlordBlocked = await asUser(db, landlordB, async () => {
    const r = await db.query('select reason, is_landlord from public.account_deletion_block()');
    return r.rows[0];
  });
  check('the landlord is told why not', landlordBlocked, {
    reason: 'You are the landlord on a live tenancy.',
    is_landlord: true,
  });

  const tenantBlocked = await asUser(db, leaver, async () => {
    const r = await db.query('select reason, is_landlord from public.account_deletion_block()');
    return r.rows[0];
  });
  check('and so is the tenant', tenantBlocked, {
    reason: 'You are the tenant on a live tenancy.',
    is_landlord: false,
  });

  checkDenied(
    'the landlord cannot delete themselves mid-tenancy',
    await expectDenied(db, landlordB, () => db.query('select public.delete_my_account()')),
  );

  checkDenied(
    'nor can the tenant',
    await expectDenied(db, leaver, () => db.query('select public.delete_my_account()')),
  );

  const stillThere = await db.query('select count(*)::int as n from public.properties where id = $1', [propE]);
  check('and the property is untouched by the attempt', stillThere.rows[0].n, 1);

  // End it the way the app does, and the block lifts.
  await asUser(db, leaver, () =>
    db.query('select public.request_end_tenancy($1, $2, $3)', [tenancyE, 'moving_out', '']),
  );
  await asUser(db, landlordB, () => db.query('select public.approve_end_tenancy($1)', [tenancyE]));

  const afterEnding = await asUser(db, leaver, async () => {
    const r = await db.query('select count(*)::int as n from public.account_deletion_block()');
    return r.rows[0].n;
  });
  check('once the tenancy is over, nothing blocks it', afterEnding, 0);

  await asUser(db, leaver, () => db.query('select public.delete_my_account()'));
  const gone = {
    auth: (await db.query('select count(*)::int as n from auth.users where id = $1', [leaver])).rows[0].n,
    profile: (await db.query('select count(*)::int as n from public.profiles where id = $1', [leaver])).rows[0].n,
  };
  check('and the account really goes, profile with it', gone, { auth: 0, profile: 0 });

  const propertySurvives = await db.query('select count(*)::int as n from public.properties where id = $1', [propE]);
  check("the other party's property survives", propertySurvives.rows[0].n, 1);

  // A tenancy row is not the same thing as another person. Listing a flat
  // opens a pending tenancy before anybody has joined it, and a tenant-first
  // claim names a landlord who may never sign up. Neither has a second party
  // to protect, so neither may hold an account shut.
  const soloLandlord = await createUser(db, 'solo.landlord@example.com', 'Sona Solo');
  const emptyListing = await asUser(db, soloLandlord, async () => {
    const prop = await db.query(
      `insert into public.properties (landlord_id, title, address_line, city, rent, deposit)
       values ($1, 'Empty Flat', '9 Quiet Lane', 'Pune', 15000, 30000) returning id`,
      [soloLandlord],
    );
    await db.query(
      `insert into public.tenancies
         (property_id, landlord_id, source, status, rent, deposit, created_by)
       values ($1, $2, 'landlord', 'pending', 15000, 30000, $2)`,
      [prop.rows[0].id, soloLandlord],
    );
    const r = await db.query('select count(*)::int as n from public.account_deletion_block()');
    return r.rows[0].n;
  });
  check('a listing nobody has joined does not hold the landlord', emptyListing, 0);

  await asUser(db, soloLandlord, () => db.query('select public.delete_my_account()'));
  const soloGone = (
    await db.query('select count(*)::int as n from auth.users where id = $1', [soloLandlord])
  ).rows[0].n;
  check('so they can close the account', soloGone, 0);

  const soloTenant = await createUser(db, 'solo.tenant@example.com', 'Tara Solo');
  const unclaimed = await asUser(db, soloTenant, async () => {
    await db.query(
      `insert into public.tenancies
         (tenant_id, source, status, claimed_address, claimed_landlord_email, created_by)
       values ($1, 'tenant', 'pending', '4 Nowhere Street, Pune',
               'never.signed.up@example.com', $1)`,
      [soloTenant],
    );
    const r = await db.query('select count(*)::int as n from public.account_deletion_block()');
    return r.rows[0].n;
  });
  check('nor does a claim against a landlord who never signed up', unclaimed, 0);


  // --- rotating join codes -------------------------------------------------
  console.log('\nrotating join codes:');

  const propC = await asUser(db, landlordB, async () => {
    const r = await db.query(
      `insert into public.properties (landlord_id, title, address_line, city, rent, deposit)
       values ($1, 'Flatshare', '5 Bandra Road', 'Mumbai', 40000, 80000) returning id`,
      [landlordB],
    );
    return r.rows[0].id;
  });

  const firstCode = await asUser(db, landlordB, async () => {
    const r = await db.query('select code, expires_at from public.current_join_code($1)', [propC]);
    return r.rows[0];
  });
  check('a property has a code before it has any tenant', /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(firstCode.code), true);

  const stable = await asUser(db, landlordB, async () => {
    const r = await db.query('select code from public.current_join_code($1)', [propC]);
    return r.rows[0].code;
  });
  check('asking again inside the window returns the same code', stable, firstCode.code);

  checkDenied(
    'another landlord cannot read it',
    await expectDenied(db, landlordA, () =>
      db.query('select code from public.current_join_code($1)', [propC]),
    ),
  );

  const tenantsSeeNothing = await asUser(db, tenantA, async () => {
    const r = await db.query('select count(*)::int as n from public.property_join_codes');
    return r.rows[0].n;
  });
  check('a tenant cannot enumerate codes', tenantsSeeNothing, 0);

  // Two flatmates, one code, one lease.
  const joinedA = await asUser(db, tenantB, async () => {
    const r = await db.query('select public.redeem_invite($1) as id', [firstCode.code]);
    return r.rows[0].id;
  });
  check('the first flatmate joins and a tenancy is created', typeof joinedA, 'string');

  const joinedB = await asUser(db, stranger, async () => {
    const r = await db.query('select public.redeem_invite($1) as id', [firstCode.code]);
    return r.rows[0].id;
  });
  check('the second flatmate reuses the same code', joinedB, joinedA);

  const shared = await asUser(db, landlordB, async () => {
    const r = await db.query(
      'select count(*)::int as n from public.tenancy_members where tenancy_id = $1',
      [joinedA],
    );
    const t = await db.query('select rent::int as rent, status from public.tenancies where id = $1', [joinedA]);
    return { members: r.rows[0].n, ...t.rows[0] };
  });
  check('both are on one lease, on the property terms', shared, {
    members: 2,
    rent: 40000,
    status: 'active',
  });

  checkDenied(
    'the landlord cannot join their own property with it',
    await expectDenied(db, landlordB, () =>
      db.query('select public.redeem_invite($1)', [firstCode.code]),
    ),
  );

  // Rotation retires the old one.
  const rotated = await asUser(db, landlordB, async () => {
    const r = await db.query('select code from public.rotate_join_code($1)', [propC]);
    return r.rows[0].code;
  });
  check('rotating issues a different code', rotated !== firstCode.code, true);

  checkDenied(
    'the retired code no longer works',
    await expectDenied(db, tenantA, () =>
      db.query('select public.redeem_invite($1)', [firstCode.code]),
    ),
  );

  // Expiry, forced by moving the window into the past.
  await db.exec(
    `update public.property_join_codes set expires_at = now() - interval '1 minute'
     where property_id = '${propC}'`,
  );
  const expiredCode = rotated;
  checkDenied(
    'an expired code is refused',
    await expectDenied(db, tenantA, () =>
      db.query('select public.redeem_invite($1)', [expiredCode]),
    ),
  );

  const refreshed = await asUser(db, landlordB, async () => {
    const r = await db.query('select code from public.current_join_code($1)', [propC]);
    return r.rows[0].code;
  });
  check('asking after expiry rotates to a new one', refreshed !== expiredCode, true);


  console.log(`\n${passed}/${passed + failed} checks passed`);
  process.exit(failed === 0 ? 0 : 1);
};



main().catch(err => {
  console.error('\nharness error:', err.message);
  process.exit(1);
});
