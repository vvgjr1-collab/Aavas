import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

import { Button } from '../ui/button';
import { LEGAL, hasLegalContact } from '../../lib/legal';

/**
 * The shell both legal pages sit in.
 *
 * One place for the typography, the back control and the footer, so the two
 * documents cannot drift into looking like they came from different sites.
 */
export function LegalPage({
  title,
  intro,
  onBack,
  children,
}: {
  title: string;
  intro: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-3xl px-4 py-8"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="-ml-2 mb-4 gap-2 rounded-full text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <header className="mb-8 border-b border-[var(--hairline)] pb-6">
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">{title}</h1>
        <p className="mt-2 text-muted-foreground">{intro}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated {LEGAL.lastUpdated}.
        </p>
      </header>

      <div className="space-y-8 leading-relaxed">{children}</div>

      <footer className="mt-12 border-t border-[var(--hairline)] pt-6 text-sm text-muted-foreground">
        {hasLegalContact ? (
          <p>
            Questions about this page? Write to{' '}
            <a className="underline" href={`mailto:${LEGAL.contactEmail}`}>
              {LEGAL.contactEmail}
            </a>
            .
          </p>
        ) : (
          <p>
            A contact address for questions about this page has not been
            published yet.
          </p>
        )}
      </footer>
    </motion.div>
  );
}

/** A titled section. Anchored, so a clause can be linked to directly. */
export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="space-y-3 text-[15px] text-foreground/90">{children}</div>
    </section>
  );
}

/** A plain list, for the enumerations these documents are mostly made of. */
export function Points({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 text-[15px] text-foreground/90">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
