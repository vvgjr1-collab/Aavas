import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignUpForm } from './SignUpForm';
import { RoleSelection } from './RoleSelection';
import { TenantDashboard } from './TenantDashboard';
import { RentDetails } from './RentDetails';
import { UtilityServices } from './UtilityServices';
import { ServiceBookingConfirmation } from './ServiceBookingConfirmation';
import { ComplaintRegistration } from './ComplaintRegistration';
import { LandlordContact } from './LandlordContact';
import { LandlordDashboard } from './LandlordDashboard';
import { PropertyListing } from './PropertyListing';
import { PropertyManagement } from './PropertyManagement';
import type { Property, PropertyData } from '../types/property';

type AuthView = 'login' | 'signup' | 'roleSelection' | 'tenantDashboard' | 'landlordDashboard' | 'rentDetails' | 'utilityServices' | 'serviceBooking' | 'complaintRegistration' | 'landlordContact' | 'propertyListing' | 'propertyManagement';

interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  responseTime: string;
  phone: string;
  description: string;
  services: string[];
}

interface UserData {
  name: string;
  email: string;
}

interface AuthContainerProps {
  onRoleChange?: (role: 'tenant' | 'landlord' | null) => void;
  initialView?: AuthView;
  onBackToHome?: () => void;
}

export function AuthContainer({ onRoleChange, initialView = 'signup', onBackToHome }: AuthContainerProps = {}) {
  const [currentView, setCurrentView] = useState<AuthView>(initialView);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userRole, setUserRole] = useState<'tenant' | 'landlord' | null>(null);
  const [rentDetailsTab, setRentDetailsTab] = useState<'agreement' | 'history'>('agreement');
  const [landlordContactTab, setLandlordContactTab] = useState<'message' | 'call' | 'history'>('message');
  const [selectedServiceProvider, setSelectedServiceProvider] = useState<ServiceProvider | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [properties, setProperties] = useState<Property[]>([
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
  ]);

  const switchToLogin = () => setCurrentView('login');
  const switchToSignup = () => setCurrentView('signup');
  
  const handleAuthSuccess = (data: UserData) => {
    setUserData(data);
    setCurrentView('roleSelection');
  };

  const handleGuestLogin = () => {
    setUserData({ name: 'Guest User', email: 'guest@aavas.com' });
    setCurrentView('roleSelection');
  };

  const handleRoleSelect = (role: 'tenant' | 'landlord') => {
    setUserRole(role);
    onRoleChange?.(role);
    if (role === 'tenant') {
      setCurrentView('tenantDashboard');
    } else {
      setCurrentView('landlordDashboard');
    }
  };

  const handleNavigateToRentDetails = (initialTab: 'agreement' | 'history' = 'agreement') => {
    setRentDetailsTab(initialTab);
    setCurrentView('rentDetails');
  };

  const handleNavigateToUtilityServices = () => {
    setCurrentView('utilityServices');
  };

  const handleNavigateToComplaintRegistration = () => {
    setCurrentView('complaintRegistration');
  };

  const handleNavigateToLandlordContact = (initialTab: 'message' | 'call' | 'history' = 'message') => {
    setLandlordContactTab(initialTab);
    setCurrentView('landlordContact');
  };

  const handleNavigateToPropertyListing = () => {
    setCurrentView('propertyListing');
  };

  const handleBackToLandlordDashboard = () => {
    setCurrentView('landlordDashboard');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
    setUserData(null);
    setUserRole(null);
    onRoleChange?.(null);
  };

  const handleBackToRoleSelection = () => {
    setCurrentView('roleSelection');
    setUserRole(null);
    onRoleChange?.(null);
  };

  const handleBookService = (provider: ServiceProvider) => {
    setSelectedServiceProvider(provider);
    setCurrentView('serviceBooking');
  };

  const handleBackToTenantDashboard = () => {
    setCurrentView('tenantDashboard');
  };

  const handleBackToUtilityServices = () => {
    setCurrentView('utilityServices');
  };

  const handleConfirmBooking = () => {
    setCurrentView('tenantDashboard');
    setSelectedServiceProvider(null);
  };

  const handleNavigateToPropertyManagement = (property: PropertyData) => {
    setSelectedProperty(property);
    setCurrentView('propertyManagement');
  };

  const handleBackToLandlordDashboardFromManagement = () => {
    setCurrentView('landlordDashboard');
    setSelectedProperty(null);
  };

  const handleAddProperty = (propertyData: any) => {
    const newProperty: Property = {
      id: Date.now().toString(),
      title: propertyData.title,
      address: `${propertyData.address}, ${propertyData.city}, ${propertyData.state} ${propertyData.pincode}`,
      type: propertyData.type as 'apartment' | 'house' | 'villa' | 'studio' | 'penthouse',
      rent: parseInt(propertyData.rent),
      deposit: parseInt(propertyData.deposit),
      bedrooms: parseInt(propertyData.bedrooms),
      bathrooms: parseInt(propertyData.bathrooms),
      area: parseInt(propertyData.area),
      status: 'vacant',
      amenities: propertyData.amenities,
      images: propertyData.images.length > 0 ? propertyData.images : ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'],
      rating: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    setProperties(prev => [...prev, newProperty]);
  };

  const handleUpdateProperty = (propertyId: string, updatedData: Partial<Property>) => {
    setProperties(prev => prev.map(property => 
      property.id === propertyId 
        ? { ...property, ...updatedData, lastUpdated: new Date().toISOString().split('T')[0] }
        : property
    ));
  };

  const handleDeleteProperty = (propertyId: string) => {
    setProperties(prev => prev.filter(property => property.id !== propertyId));
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {currentView === 'login' && (
        <div className="max-w-md mx-auto pt-20">
          <LoginForm 
            onSwitchToSignup={switchToSignup}
            onAuthSuccess={handleAuthSuccess}
            onBack={onBackToHome}
            onGuestLogin={handleGuestLogin}
          />
        </div>
      )}
      
      {currentView === 'signup' && (
        <div className="max-w-md mx-auto pt-20">
          <SignUpForm 
            onSwitchToLogin={switchToLogin}
            onAuthSuccess={handleAuthSuccess}
            onBack={onBackToHome}
            onGuestLogin={handleGuestLogin}
          />
        </div>
      )}
      
      {currentView === 'roleSelection' && (
        <div className="max-w-4xl mx-auto">
          <RoleSelection 
            userName={userData?.name || 'User'}
            onRoleSelect={handleRoleSelect}
            onBack={handleBackToLogin}
          />
        </div>
      )}
      
      {currentView === 'tenantDashboard' && (
        <TenantDashboard 
          userName={userData?.name || 'User'}
          userEmail={userData?.email || 'user@example.com'}
          onNavigateToRentDetails={handleNavigateToRentDetails}
          onNavigateToUtilityServices={handleNavigateToUtilityServices}
          onNavigateToComplaintRegistration={handleNavigateToComplaintRegistration}
          onNavigateToLandlordContact={handleNavigateToLandlordContact}
          onBack={handleBackToRoleSelection}
        />
      )}
      
      {currentView === 'rentDetails' && (
        <RentDetails 
          userName={userData?.name || 'User'}
          initialTab={rentDetailsTab}
          onBack={handleBackToTenantDashboard}
        />
      )}
      
      {currentView === 'utilityServices' && (
        <UtilityServices 
          userName={userData?.name || 'User'}
          onBack={handleBackToTenantDashboard}
          onBookService={handleBookService}
        />
      )}
      
      {currentView === 'serviceBooking' && selectedServiceProvider && (
        <ServiceBookingConfirmation 
          provider={selectedServiceProvider}
          userName={userData?.name || 'User'}
          userEmail={userData?.email || 'user@example.com'}
          propertyAddress="123 Sunset Boulevard, Apt 4B, Mumbai, MH 400001"
          onBack={handleBackToUtilityServices}
          onConfirmBooking={handleConfirmBooking}
        />
      )}
      
      {currentView === 'complaintRegistration' && (
        <ComplaintRegistration 
          userName={userData?.name || 'User'}
          userEmail={userData?.email || 'user@example.com'}
          propertyAddress="123 Sunset Boulevard, Apt 4B, Mumbai, MH 400001"
          onBack={handleBackToTenantDashboard}
        />
      )}
      
      {currentView === 'landlordContact' && (
        <LandlordContact 
          userName={userData?.name || 'User'}
          userEmail={userData?.email || 'user@example.com'}
          propertyAddress="123 Sunset Boulevard, Apt 4B, Mumbai, MH 400001"
          initialTab={landlordContactTab}
          onBack={handleBackToTenantDashboard}
        />
      )}
      
      {currentView === 'landlordDashboard' && (
        <LandlordDashboard 
          userName={userData?.name || 'User'}
          userEmail={userData?.email || 'user@example.com'}
          properties={properties}
          onNavigateToPropertyListing={handleNavigateToPropertyListing}
          onNavigateToPropertyManagement={handleNavigateToPropertyManagement}
          onUpdateProperty={handleUpdateProperty}
          onDeleteProperty={handleDeleteProperty}
          onBack={handleBackToRoleSelection}
        />
      )}
      
      {currentView === 'propertyListing' && (
        <PropertyListing 
          userName={userData?.name || 'User'}
          userEmail={userData?.email || 'user@example.com'}
          onBack={handleBackToLandlordDashboard}
          onAddProperty={handleAddProperty}
        />
      )}
      
      {currentView === 'propertyManagement' && selectedProperty && (
        <PropertyManagement 
          property={selectedProperty}
          onBack={handleBackToLandlordDashboardFromManagement}
        />
      )}
    </div>
  );
}