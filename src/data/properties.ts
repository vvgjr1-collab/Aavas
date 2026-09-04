import type { Property } from '../types/property';

/** Address of the tenant's own unit. Hardcoded while there is no backend. */
export const TENANT_PROPERTY_ADDRESS =
  '123 Sunset Boulevard, Apt 4B, Mumbai, MH 400001';

/** Seed data for the landlord's portfolio. */
export const initialProperties: Property[] = [
    {
      id: '1',
      title: 'Modern 2BHK Apartment',
      address: 'Sector 18, Noida, UP 201301',
      type: 'apartment',
      rent: 25000,
      deposit: 50000,
      bedrooms: 2,
      bathrooms: 2,
      area: 1200,
      status: 'occupied',
      tenant: {
        name: 'Rahul Sharma',
        email: 'rahul.sharma@email.com',
        phone: '+91 98765 43210',
        leaseStart: '2024-01-15',
        leaseEnd: '2025-01-14'
      },
      amenities: ['WiFi', 'Parking', 'AC', 'Furnished'],
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'],
      rating: 4.5,
      lastUpdated: '2024-11-15'
    },
    {
      id: '2',
      title: 'Spacious 3BHK Villa',
      address: 'DLF Phase 2, Gurgaon, HR 122002',
      type: 'villa',
      rent: 45000,
      deposit: 90000,
      bedrooms: 3,
      bathrooms: 3,
      area: 2200,
      status: 'vacant',
      amenities: ['Garden', 'Parking', 'Security', 'Pool'],
      images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'],
      rating: 4.8,
      lastUpdated: '2024-11-10'
    },
    {
      id: '3',
      title: 'Cozy Studio Apartment',
      address: 'Koramangala, Bangalore, KA 560034',
      type: 'studio',
      rent: 18000,
      deposit: 36000,
      bedrooms: 1,
      bathrooms: 1,
      area: 600,
      status: 'maintenance',
      amenities: ['WiFi', 'Furnished', 'Gym'],
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400'],
      rating: 4.2,
      lastUpdated: '2024-11-12'
    },
    {
      id: '4',
      title: 'Luxury 4BHK Penthouse',
      address: 'Bandra West, Mumbai, MH 400050',
      type: 'apartment',
      rent: 85000,
      deposit: 170000,
      bedrooms: 4,
      bathrooms: 4,
      area: 3000,
      status: 'occupied',
      tenant: {
        name: 'Priya Patel',
        email: 'priya.patel@email.com',
        phone: '+91 98123 45678',
        leaseStart: '2024-03-01',
        leaseEnd: '2025-02-28'
      },
      amenities: ['Balcony', 'Parking', 'AC', 'Furnished', 'Security'],
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'],
      rating: 4.9,
      lastUpdated: '2024-11-08'
    }
];
