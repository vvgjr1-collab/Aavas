/**
 * Shared property types.
 *
 * These were previously copy-pasted into AuthContainer, LandlordDashboard and
 * PropertyManagement, which let the definitions drift apart.
 */

export type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'studio'
  | 'penthouse';

export type PropertyStatus = 'occupied' | 'vacant' | 'maintenance';

/** A property as the landlord manages it. Money is stored as a number. */
export interface Property {
  id: string;
  title: string;
  address: string;
  type: PropertyType;
  rent: number;
  deposit: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  status: PropertyStatus;
  tenant?: {
    name: string;
    email: string;
    phone: string;
    leaseStart: string;
    leaseEnd: string;
  };
  amenities: string[];
  images: string[];
  rating: number;
  lastUpdated: string;
}

/**
 * Condensed, display-oriented view of a Property used by the property
 * management screen. `rent` is pre-formatted for rendering.
 */
export interface PropertyData {
  id: string;
  title: string;
  address: string;
  /** Formatted for display, e.g. "₹25,000". */
  rent: string;
  tenant?: {
    name: string;
    phone: string;
    email: string;
    moveInDate: string;
  };
}

/** Format a rent amount the same way the landlord dashboard does. */
export function formatRent(rent: number): string {
  return `₹${rent.toLocaleString()}`;
}

/** Narrow a Property down to the PropertyData the management screen expects. */
export function toPropertyData(property: Property): PropertyData {
  return {
    id: property.id,
    title: property.title,
    address: property.address,
    rent: formatRent(property.rent),
    tenant: property.tenant
      ? {
          name: property.tenant.name,
          phone: property.tenant.phone,
          email: property.tenant.email,
          moveInDate: property.tenant.leaseStart,
        }
      : undefined,
  };
}
