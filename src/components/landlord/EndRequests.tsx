import { EndNotice } from '../tenancy/EndNotice';
import { useAppState } from '../../context/AppState';
import type { DbTenancy } from '../../lib/tenancy';
import type { Property } from '../../types/property';

/**
 * Outstanding notice, surfaced on the portfolio.
 *
 * The panel that can also *give* notice lives on the property page, where the
 * landlord is already looking at one tenancy. This is only the part that needs
 * to find them: something waiting on them, on a property they may not have
 * opened.
 */
export function EndRequests({
  tenancies,
  properties,
  onChanged,
}: {
  tenancies: DbTenancy[];
  properties: Property[];
  onChanged: () => void;
}) {
  const { userId } = useAppState();

  const outstanding = tenancies.filter(t => t.status === 'active' && t.end_requested_at);
  if (outstanding.length === 0) return null;

  return (
    <div className="space-y-4">
      {outstanding.map(t => (
        <EndNotice
          key={t.id}
          tenancy={t}
          viewerId={userId}
          role="landlord"
          propertyLabel={properties.find(p => p.id === t.property_id)?.title}
          counterparty="Your tenant"
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}
