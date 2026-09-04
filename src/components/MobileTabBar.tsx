import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Home,
  Receipt,
  Wrench,
  MessageSquarePlus,
  Phone,
  Building2,
  PlusCircle,
  type LucideIcon,
} from 'lucide-react';

import { cn } from './ui/utils';

interface TabItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Destinations are derived from the path rather than from the chosen role in
 * app state: a direct visit or a reload lands on /tenant with role still null,
 * and the bar has to be right on that first paint.
 */
const TENANT_TABS: TabItem[] = [
  { to: '/tenant', label: 'Home', icon: Home },
  { to: '/tenant/rent', label: 'Rent', icon: Receipt },
  { to: '/tenant/utilities', label: 'Services', icon: Wrench },
  { to: '/tenant/complaint', label: 'Report', icon: MessageSquarePlus },
  { to: '/tenant/landlord-contact', label: 'Contact', icon: Phone },
];

const LANDLORD_TABS: TabItem[] = [
  { to: '/landlord', label: 'Portfolio', icon: Building2 },
  { to: '/landlord/properties/new', label: 'Add', icon: PlusCircle },
];

export function tabsForPath(pathname: string): TabItem[] | null {
  if (pathname.startsWith('/tenant')) return TENANT_TABS;
  if (pathname.startsWith('/landlord')) return LANDLORD_TABS;
  return null;
}

/**
 * The section root ("/tenant") would prefix-match every screen in the section,
 * so it only counts as active on an exact match. Deeper tabs stay active
 * across their own sub-routes - /tenant/utilities/book keeps Services lit.
 */
function isActive(pathname: string, to: string, tabs: TabItem[]) {
  const deepest = tabs
    .filter(t => pathname === t.to || pathname.startsWith(t.to + '/'))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return deepest?.to === to;
}

/**
 * A frosted tab bar pinned to the bottom edge on phones, the way a native app
 * puts its primary destinations under the thumb. Hidden from `md` up, where
 * the in-page navigation already does this job.
 */
export function MobileTabBar() {
  const { pathname } = useLocation();
  const tabs = tabsForPath(pathname);
  if (!tabs) return null;

  const tint =
    tabs === TENANT_TABS ? 'var(--tenant-primary)' : 'var(--landlord-primary)';

  return (
    <nav
      aria-label="Primary"
      // pb-[env(safe-area-inset-bottom)] keeps the row clear of the iPhone home
      // indicator; index.html already sets viewport-fit=cover so the inset is
      // non-zero there.
      className="material-thick fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(15,21,64,0.08)] md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1">
        {tabs.map(tab => {
          const active = isActive(pathname, tab.to, tabs);
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // 56px tall: comfortably past the 44px minimum touch target.
                  'relative flex h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1',
                  'transition-colors duration-200 active:scale-95',
                  active ? '' : 'text-muted-foreground',
                )}
                style={active ? { color: tint } : undefined}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-pill"
                    aria-hidden
                    className="absolute inset-x-1 inset-y-1 -z-10 rounded-2xl"
                    style={{ backgroundColor: `color-mix(in srgb, ${tint} 12%, transparent)` }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                <tab.icon className="h-5 w-5" />
                <span className="text-[11px] leading-none font-medium">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
