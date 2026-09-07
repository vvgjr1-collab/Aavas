import { LegalPage, Points, Section } from './LegalPage';
import { LEGAL } from '../../lib/legal';

/**
 * What Aavas actually stores, and who can actually read it.
 *
 * Written against the schema and the policies rather than from a template, so
 * every claim here is one the code can be checked against - which is the only
 * kind of privacy policy worth publishing. If the data model changes, this
 * page is part of the change.
 */
export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`How ${LEGAL.operator} handles the information you put into it.`}
      onBack={onBack}
    >
      <Section id="short" title="The short version">
        <Points
          items={[
            'There is no advertising, no analytics and no tracking of any kind in this app.',
            'Nothing about you is sold or shared for marketing.',
            'Your records are readable only by you and by the other party to your tenancy — enforced by the database, not by the screens.',
            'Property photos are the one exception: they are served publicly, so anyone with the link can open one.',
          ]}
        />
      </Section>

      <Section id="collect" title="What is collected">
        <p>Only what the app needs to do its job. In practice that is:</p>
        <Points
          items={[
            <>
              <strong>Your account.</strong> Email address and the name you give
              at sign-up, plus a phone number if you add one. Your password is
              handled by the authentication service and is never visible to the
              app.
            </>,
            <>
              <strong>Properties.</strong> Address, type, rent and deposit,
              rooms, area, amenities, and any photos you upload.
            </>,
            <>
              <strong>Tenancies.</strong> The agreed rent, deposit and dates,
              who is on the lease, and the join codes used to add someone to it.
            </>,
            <>
              <strong>Rent records.</strong> Amount, date, method, and the
              reference you type — which may include a UPI ID, a bank name, or
              the last four digits of a card. These are notes about a payment
              you made elsewhere.
            </>,
            <>
              <strong>Complaints and service bookings</strong> you raise, and
              their status.
            </>,
            <>
              <strong>Notice.</strong> If either party gives notice on a
              tenancy, the reason chosen and anything written with it.
            </>,
            <>
              <strong>Documents</strong> you upload, such as a rent agreement.
            </>,
          ]}
        />
      </Section>

      <Section id="payments" title="Money is not handled here">
        <p>
          No payment passes through {LEGAL.operator}. There is no card
          processing, no bank connection and no escrow. When a tenant marks rent
          as paid, that records a claim that a payment was made somewhere else;
          the landlord then confirms receipt. Both sides are looking at the same
          record, and that record is all it is.
        </p>
        <p>
          Because of that, no card number, CVV or bank credential is ever stored
          — only the short reference you choose to type against a payment.
        </p>
      </Section>

      <Section id="who" title="Who can see it">
        <p>
          Access is enforced in the database itself, by row-level security, not
          by hiding buttons. That matters: it holds even if someone bypasses the
          app entirely.
        </p>
        <Points
          items={[
            'A landlord can read their own properties and the tenancies on them.',
            'A tenant can read the tenancy they are on, and the property it is for.',
            'The two parties to a tenancy can see each other’s name, email and phone number — a landlord and tenant have to be able to reach each other.',
            'Flatmates on one lease can see each other and the shared records.',
            'Nobody else can read any of it. A signed-out visitor can read nothing at all.',
            'A join code can be read only by the landlord who owns the property. It changes every 15 minutes.',
          ]}
        />
      </Section>

      <Section id="photos" title="Property photos are public">
        <p>
          Photos you upload to a property are stored in a public bucket, so they
          can be shown on a listing card without a link that expires. The path
          contains a random identifier and is not listed anywhere, but{' '}
          <strong>anyone given the URL can open the photo without signing in.</strong>
        </p>
        <p>
          Documents are different: rent agreements and anything else uploaded as
          a document are private, and readable only by the parties to that
          tenancy. Keep anything identifying out of property photos.
        </p>
      </Section>

      <Section id="where" title="Where it is kept">
        <Points
          items={[
            <>
              <strong>Supabase</strong> stores the database, authentication and
              files. The region chosen for the project determines where that
              data physically sits.
            </>,
            <>
              <strong>GitHub Pages</strong> serves the app itself. Serving a
              page means GitHub sees the request, including your IP address.
            </>,
            <>
              <strong>Google Fonts</strong> serves two typefaces, so Google
              receives a request from your browser when the app loads.
            </>,
            <>
              <strong>Unsplash</strong> supplies the stock image shown on a
              property that has no photo of its own, which is a request to
              Unsplash.
            </>,
          ]}
        />
        <p>
          There is no analytics service, no advertising network, no session
          recorder and no crash reporter. Nothing about your use of the app is
          sent anywhere else.
        </p>
      </Section>

      <Section id="browser" title="What is kept in your browser">
        <p>
          Your sign-in session is stored in the browser. Ticking{' '}
          <em>Remember me</em> keeps it after the browser closes; unticking it
          keeps the session only until the tab is closed. That choice is
          remembered on that device.
        </p>
        <p>
          There are no advertising or tracking cookies. Guest mode stores nothing
          at all on the server — it runs on fictional demo data and never writes
          to the database.
        </p>
      </Section>

      <Section id="keep" title="How long it is kept, and removing it">
        <p>
          Records are kept while the account exists. Ending a tenancy does not
          delete its history — payments and complaints stay, because both parties
          may need to refer to what happened.
        </p>
        <Points
          items={[
            'You can delete a property you own, and withdraw a tenancy claim you have made.',
            'A tenant can ask to leave a tenancy; the landlord agrees, and the record is closed rather than erased.',
            <>
              <strong>Deleting an account is not yet self-service.</strong> Ask,
              and it will be done by hand. Deleting a profile also removes the
              properties and tenancies that hang off it.
            </>,
          ]}
        />
      </Section>

      <Section id="security" title="Security, honestly stated">
        <p>
          Passwords are hashed by the authentication service. Traffic is over
          HTTPS. Access rules live in the database and are covered by an
          automated test suite that runs before anything ships.
        </p>
        <p>
          None of that is a guarantee. {LEGAL.operator} is a young application,
          not a bank, and you should not store anything here that would cause you
          serious harm if it were exposed.
        </p>
      </Section>

      <Section id="changes" title="Changes to this page">
        <p>
          If what the app collects changes, this page changes with it, and the
          date at the top moves. Continuing to use {LEGAL.operator} after a
          change means accepting the updated page.
        </p>
      </Section>
    </LegalPage>
  );
}
