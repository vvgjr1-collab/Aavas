import { LegalPage, Points, Section } from './LegalPage';
import { LEGAL } from '../../lib/legal';

/**
 * What Aavas is, and — more usefully — what it is not.
 *
 * The parts that matter here are the ones a landlord or tenant could
 * reasonably misread: that marking rent paid does not move money, and that
 * giving notice in the app is a record between two people rather than a legal
 * notice. Both are said on the screens too; this is where they are said in
 * full.
 */
export function Terms({ onBack }: { onBack: () => void }) {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro={`The agreement between you and ${LEGAL.operator} for using this service.`}
      onBack={onBack}
    >
      <Section id="what" title="What Aavas is">
        <p>
          {LEGAL.operator} is a record-keeping tool for a rental arrangement
          between a landlord and a tenant. It holds the terms you agree, tracks
          rent you tell it about, and gives both sides the same view of them.
        </p>
        <p>It is not any of the following:</p>
        <Points
          items={[
            'A broker, agent or letting service. It finds nobody a tenant and nobody a home.',
            'A payment processor, escrow or bank. No money passes through it.',
            'A law firm. Nothing here is legal advice.',
            'A party to your tenancy. The agreement is between you and the other person.',
          ]}
        />
      </Section>

      <Section id="money" title="Rent, and what “paid” means here">
        <p>
          Marking rent as paid records that a tenant says a payment was made —
          by bank transfer, UPI, cash or anything else, outside this app. The
          landlord then confirms receipt, and only they can do that.
        </p>
        <p>
          A record in {LEGAL.operator} is evidence of what was entered, not
          proof that money moved. If the two disagree, the bank record decides
          it, not this app.
        </p>
      </Section>

      <Section id="notice" title="Notice and ending a tenancy">
        <p>
          Either party can give notice on a tenancy, choose a reason, and write
          what they want the other to know. The other party has to agree before
          the tenancy is marked as ended. Neither side can end it alone.
        </p>
        <p>
          <strong>
            This is a record between the two of you. It is not a legal notice.
          </strong>{' '}
          It does not shorten, extend or replace any notice period your
          agreement or local law requires, and it does not evict anyone or
          release anyone from their obligations. Serve any notice that has to
          be served in the way your agreement says.
        </p>
      </Section>

      <Section id="agreement" title="The rent agreement document">
        <p>
          The agreement {LEGAL.operator} generates is a plain template built
          from the figures you entered. It has not been drafted for your
          situation, your state, or your property, and it has not been reviewed
          by a lawyer on your behalf. Have one look at it before you rely on it
          for anything that matters.
        </p>
      </Section>

      <Section id="accounts" title="Your account">
        <Points
          items={[
            'Give an email address you can actually receive mail at — it is how you sign in and how a password is reset.',
            'Keep your password to yourself. Anything done from your account is treated as done by you.',
            'One person, one account. Do not sign up on someone else’s behalf.',
            'You must be old enough to enter a tenancy agreement where you live.',
          ]}
        />
      </Section>

      <Section id="codes" title="Join codes">
        <p>
          A property carries a join code that changes every 15 minutes. Anyone
          who uses a valid code joins that lease, which is what lets two
          flatmates join with the same one.
        </p>
        <p>
          Treat it like a key. Give it only to the person you mean to add, and
          issue a new one immediately if it goes somewhere it should not.
        </p>
      </Section>

      <Section id="accuracy" title="Whose numbers are right">
        <p>
          The landlord&rsquo;s figures are the agreed terms — that is deliberate,
          and the app enforces it. A tenant can propose figures when they set
          themselves up before their landlord has joined, but those stay
          proposals until confirmed.
        </p>
        <p>
          Both of you are responsible for what you enter. {LEGAL.operator} does
          not verify that a property exists, that a person is who they say, or
          that a figure is what was agreed.
        </p>
      </Section>

      <Section id="use" title="Acceptable use">
        <Points
          items={[
            'Do not upload anything you do not have the right to share, or anything unlawful.',
            'Do not use the app to harass, threaten or mislead the other party.',
            'Do not attempt to reach records that are not yours, or to interfere with the service.',
            'Do not upload identifying documents as property photos — those are served publicly. Use the document upload, which is private.',
          ]}
        />
        <p>
          Access may be withdrawn from an account being used this way.
        </p>
      </Section>

      <Section id="demo" title="Guest mode">
        <p>
          Guest login shows a demonstration with invented properties, tenants and
          figures. Nothing in it is real and nothing is saved. Do not mistake a
          guest session for your own records.
        </p>
      </Section>

      <Section id="availability" title="Availability, and no warranty">
        <p>
          {LEGAL.operator} is provided as it is. There is no promise that it will
          be available, that it will be free of faults, or that data will never
          be lost. Keep your own copy of anything you cannot afford to lose —
          your signed agreement above all.
        </p>
        <p>
          To the extent the law allows, {LEGAL.operator} is not liable for loss
          arising from use of the service, including a rent record that was
          entered wrongly, a notice that was not acted on, or an interruption to
          the service.
        </p>
      </Section>

      <Section id="changes" title="Changes and closing an account">
        <p>
          These terms may change; the date at the top moves when they do, and
          continuing to use the service means accepting them. You can stop using{' '}
          {LEGAL.operator} at any time, and ask for your account to be removed.
        </p>
      </Section>

      <Section id="law" title="Governing law">
        <p>
          These terms are governed by the law of {LEGAL.jurisdiction}, and its
          courts have jurisdiction over any dispute about them. Your tenancy
          itself is governed by whatever your own agreement and local tenancy law
          say — this page has no bearing on that.
        </p>
      </Section>
    </LegalPage>
  );
}
