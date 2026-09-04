import { Navigate, Outlet, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { HomePage } from '../components/HomePage';
import { LoginForm } from '../components/LoginForm';
import { SignUpForm } from '../components/SignUpForm';
import { RoleSelection } from '../components/RoleSelection';
import { TenantDashboard } from '../components/TenantDashboard';
import { RentDetails } from '../components/RentDetails';
import { UtilityServices } from '../components/UtilityServices';
import { ServiceBookingConfirmation } from '../components/ServiceBookingConfirmation';
import { ComplaintRegistration } from '../components/ComplaintRegistration';
import { LandlordContact } from '../components/LandlordContact';
import { LandlordDashboard } from '../components/LandlordDashboard';
import { PropertyListing } from '../components/PropertyListing';
import { PropertyManagement } from '../components/PropertyManagement';

import { useAppState, useDisplayUser } from '../context/AppState';
import type { UserData } from '../context/AppState';
import { TENANT_PROPERTY_ADDRESS } from '../data/properties';
import { toPropertyData } from '../types/property';

/**
 * Route wrappers. Each one adapts the router to a feature component's existing
 * callback props, so the components themselves stay router-agnostic.
 */

function backgroundClass(role: 'tenant' | 'landlord' | null) {
  const base = 'min-h-screen flex items-center justify-center p-4 bg-gradient-to-br';
  if (role === 'landlord') return `${base} from-[#f4eedf] via-[#faf7f0] to-[#2e3a8c]/10`;
  if (role === 'tenant') return `${base} from-[#2C7A7B]/10 via-background to-[#FFFBDE]/20`;
  return `${base} from-background via-background to-muted/20`;
}

/** Shared chrome for every screen except the landing page. */
function AppLayout() {
  const { role } = useAppState();
  return (
    <div className={backgroundClass(role)}>
      <div className="w-full max-w-6xl mx-auto">
        <Outlet />
      </div>
    </div>
  );
}

function HomeRoute() {
  const navigate = useNavigate();
  return (
    <HomePage
      onGetStarted={() => navigate('/signup')}
      onSignIn={() => navigate('/login')}
    />
  );
}

function useAuthSuccess() {
  const navigate = useNavigate();
  const { signIn } = useAppState();
  return (data: UserData) => {
    signIn(data);
    navigate('/role');
  };
}

function useGuestLogin() {
  const onAuthSuccess = useAuthSuccess();
  return () => onAuthSuccess({ name: 'Guest User', email: 'guest@aavas.com' });
}

function LoginRoute() {
  const navigate = useNavigate();
  const onAuthSuccess = useAuthSuccess();
  const onGuestLogin = useGuestLogin();
  return (
    <div className="max-w-md mx-auto pt-20">
      <LoginForm
        onSwitchToSignup={() => navigate('/signup')}
        onAuthSuccess={onAuthSuccess}
        onBack={() => navigate('/')}
        onGuestLogin={onGuestLogin}
      />
    </div>
  );
}

function SignUpRoute() {
  const navigate = useNavigate();
  const onAuthSuccess = useAuthSuccess();
  const onGuestLogin = useGuestLogin();
  return (
    <div className="max-w-md mx-auto pt-20">
      <SignUpForm
        onSwitchToLogin={() => navigate('/login')}
        onAuthSuccess={onAuthSuccess}
        onBack={() => navigate('/')}
        onGuestLogin={onGuestLogin}
      />
    </div>
  );
}

function RoleSelectionRoute() {
  const navigate = useNavigate();
  const { chooseRole, signOut } = useAppState();
  const { userName } = useDisplayUser();
  return (
    <div className="max-w-4xl mx-auto">
      <RoleSelection
        userName={userName}
        onRoleSelect={role => {
          chooseRole(role);
          navigate(role === 'tenant' ? '/tenant' : '/landlord');
        }}
        onBack={() => {
          signOut();
          navigate('/login');
        }}
      />
    </div>
  );
}

/** Leaving a dashboard drops the chosen role, as the old handler did. */
function useBackToRoleSelection() {
  const navigate = useNavigate();
  const { clearRole } = useAppState();
  return () => {
    clearRole();
    navigate('/role');
  };
}

function TenantDashboardRoute() {
  const navigate = useNavigate();
  const { userName, userEmail } = useDisplayUser();
  const onBack = useBackToRoleSelection();
  return (
    <TenantDashboard
      userName={userName}
      userEmail={userEmail}
      onNavigateToRentDetails={(tab = 'agreement') => navigate(`/tenant/rent?tab=${tab}`)}
      onNavigateToUtilityServices={() => navigate('/tenant/utilities')}
      onNavigateToComplaintRegistration={() => navigate('/tenant/complaint')}
      onNavigateToLandlordContact={(tab = 'message') =>
        navigate(`/tenant/landlord-contact?tab=${tab}`)
      }
      onBack={onBack}
    />
  );
}

function RentDetailsRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { userName } = useDisplayUser();
  const tab = params.get('tab') === 'history' ? 'history' : 'agreement';
  return (
    <RentDetails userName={userName} initialTab={tab} onBack={() => navigate('/tenant')} />
  );
}

function UtilityServicesRoute() {
  const navigate = useNavigate();
  const { setBookingProvider } = useAppState();
  const { userName } = useDisplayUser();
  return (
    <UtilityServices
      userName={userName}
      onBack={() => navigate('/tenant')}
      onBookService={provider => {
        setBookingProvider(provider);
        navigate('/tenant/utilities/book');
      }}
    />
  );
}

function ServiceBookingRoute() {
  const navigate = useNavigate();
  const { bookingProvider, setBookingProvider } = useAppState();
  const { userName, userEmail } = useDisplayUser();

  // Reached directly (or after a reload) with no provider chosen.
  if (!bookingProvider) return <Navigate to="/tenant/utilities" replace />;

  return (
    <ServiceBookingConfirmation
      provider={bookingProvider}
      userName={userName}
      userEmail={userEmail}
      propertyAddress={TENANT_PROPERTY_ADDRESS}
      onBack={() => navigate('/tenant/utilities')}
      onConfirmBooking={() => {
        setBookingProvider(null);
        navigate('/tenant');
      }}
    />
  );
}

function ComplaintRoute() {
  const navigate = useNavigate();
  const { userName, userEmail } = useDisplayUser();
  return (
    <ComplaintRegistration
      userName={userName}
      userEmail={userEmail}
      propertyAddress={TENANT_PROPERTY_ADDRESS}
      onBack={() => navigate('/tenant')}
    />
  );
}

function LandlordContactRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { userName, userEmail } = useDisplayUser();
  const raw = params.get('tab');
  const tab = raw === 'call' || raw === 'history' ? raw : 'message';
  return (
    <LandlordContact
      userName={userName}
      userEmail={userEmail}
      propertyAddress={TENANT_PROPERTY_ADDRESS}
      initialTab={tab}
      onBack={() => navigate('/tenant')}
    />
  );
}

function LandlordDashboardRoute() {
  const navigate = useNavigate();
  const { properties, updateProperty, deleteProperty } = useAppState();
  const { userName, userEmail } = useDisplayUser();
  const onBack = useBackToRoleSelection();
  return (
    <LandlordDashboard
      userName={userName}
      userEmail={userEmail}
      properties={properties}
      onNavigateToPropertyListing={() => navigate('/landlord/properties/new')}
      onNavigateToPropertyManagement={property =>
        navigate(`/landlord/properties/${property.id}`)
      }
      onUpdateProperty={updateProperty}
      onDeleteProperty={deleteProperty}
      onBack={onBack}
    />
  );
}

function PropertyListingRoute() {
  const navigate = useNavigate();
  const { addProperty } = useAppState();
  const { userName, userEmail } = useDisplayUser();
  return (
    <PropertyListing
      userName={userName}
      userEmail={userEmail}
      onBack={() => navigate('/landlord')}
      onAddProperty={addProperty}
    />
  );
}

function PropertyManagementRoute() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { properties } = useAppState();
  const property = properties.find(p => p.id === id);

  // Unknown or deleted property id.
  if (!property) return <Navigate to="/landlord" replace />;

  return (
    <PropertyManagement
      property={toPropertyData(property)}
      onBack={() => navigate('/landlord')}
    />
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignUpRoute />} />
        <Route path="/role" element={<RoleSelectionRoute />} />

        <Route path="/tenant" element={<TenantDashboardRoute />} />
        <Route path="/tenant/rent" element={<RentDetailsRoute />} />
        <Route path="/tenant/utilities" element={<UtilityServicesRoute />} />
        <Route path="/tenant/utilities/book" element={<ServiceBookingRoute />} />
        <Route path="/tenant/complaint" element={<ComplaintRoute />} />
        <Route path="/tenant/landlord-contact" element={<LandlordContactRoute />} />

        <Route path="/landlord" element={<LandlordDashboardRoute />} />
        <Route path="/landlord/properties/new" element={<PropertyListingRoute />} />
        <Route path="/landlord/properties/:id" element={<PropertyManagementRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
