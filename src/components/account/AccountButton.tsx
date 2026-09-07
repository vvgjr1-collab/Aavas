import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';

import { Button } from '../ui/button';
import { useAppState } from '../../context/AppState';
import { useTenancy } from '../../context/TenancyProvider';
import { completionFor } from '../../lib/profileCompletion';
import { listDocuments } from '../../lib/records';

/**
 * The way into the account screen, carrying how finished it is.
 *
 * The percentage sits in the header rather than on a settings page nobody
 * opens, because the whole point of it is to be seen by someone who does not
 * yet know their account is missing a phone number. It disappears at 100, so
 * it stops being furniture once it has done its job.
 *
 * Self-contained on purpose: the counts come from two providers, and threading
 * them through both dashboards and both routes to render one button would be
 * more plumbing than the button is worth.
 */
export function AccountButton({ tone }: { tone?: string }) {
  const navigate = useNavigate();
  const { profile, role, isAuthenticated } = useAppState();
  const { portfolio, myTenancy } = useTenancy();
  const [hasAgreement, setHasAgreement] = useState(false);

  useEffect(() => {
    if (!myTenancy) {
      setHasAgreement(false);
      return;
    }
    let active = true;
    listDocuments(myTenancy.id, 'agreement')
      .then(rows => {
        if (active) setHasAgreement(rows.length > 0);
      })
      .catch(() => {
        /* counted as missing, which is the safe way round */
      });
    return () => {
      active = false;
    };
  }, [myTenancy?.id]);

  // Guests have no account to complete.
  if (!isAuthenticated) return null;

  const { percent } = completionFor({
    profile,
    role,
    propertyCount: portfolio.length,
    hasTenancy: Boolean(myTenancy),
    hasAgreement,
  });

  return (
    <Button
      variant="ghost"
      onClick={() => navigate('/account')}
      className="rounded-full gap-2 text-muted-foreground"
      title="Your account"
      aria-label={
        percent < 100 ? `Your account, ${percent} percent complete` : 'Your account'
      }
      style={tone ? { color: tone } : undefined}
    >
      <UserRound className="w-4 h-4" />
      <span className="hidden sm:inline text-sm">Account</span>
      {percent < 100 && (
        <span
          className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400"
          aria-hidden
        >
          {percent}%
        </span>
      )}
    </Button>
  );
}
