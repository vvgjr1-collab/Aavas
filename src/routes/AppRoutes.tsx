import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

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
import { ResetPassword } from '../components/auth/ResetPassword';

import { useAppState, useDisplayUser } from '../context/AppState';
import { TENANT_PROPERTY_ADDRESS } from '../data/properties';
import { toPropertyData } from '../types/property';
import { MobileTabBar, tabsForPath } from '../components/MobileTabBar';
import { TenantSetup } from '../components/onboarding/TenantSetup';
import { LandlordSetup } from '../components/onboarding/LandlordSetup';
import { useTenancy } from '../context/TenancyProvider';
import { toast } from 'sonner';
import {
  createProperty,
  deleteProperty as deletePropertyRow,
  updateProperty as updatePropertyRow,
} from '../lib/tenancy';


/**
 * Route wrappers. Each one adapts the router to a feature component's existing
 * callback props, so the components themselves stay router-agnostic.
 */

function backgroundClass(role: 'tenant' | 'landlord' | null) {
  const base =
    'relative min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br';
  if (role === 'landlord') return `${base} from-[#f7f2e6] via-[#faf9f7] to-[#eceaf6]`;
  if (role === 'tenant') return `${base} from-[#e9f3f3] via-background to-[#fdfbe9]`;
  return `${base} from-background via-background to-muted/40`;
}

/**
 * Two large, heavily blurred colour fields drifting behind the content. They
 * are what stops a full-bleed light background from reading as dead space -
 * the ambient light under Apple's frosted panels - and they are decorative, so
 * they sit behind everything and take no pointer events.
 */
function AmbientBackdrop({ role }: { role: 'tenant' | 'landlord' | null }) {
  const tint =
    role === 'landlord'
      ? ['var(--landlord-primary)', 'var(--landlord-accent)']
      : role === 'tenant'
        ? ['var(--tenant-primary)', 'var(--tenant-accent-dark)']
        : ['var(--landlord-primary)', 'var(--tenant-primary)'];

  return (
    <div className="ambient" aria-hidden>
      <div
        className="ambient-blob animate-aurora h-[38rem] w-[38rem] -top-40 -left-32 opacity-[0.16]"
        style={{ background: tint[0] }}
      />
      <div
        className="ambient-blob animate-aurora h-[32rem] w-[32rem] -bottom-40 -right-24 opacity-[0.18]"
        style={{ background: tint[1], animationDelay: '-7s' }}
      />
    </div>
  );
}

/** Shared chrome for every screen except the landing page. */
function AppLayout() {
  const { role } = useAppState();
  const { pathname } = useLocation();
  // The tab bar is fixed, so the content column has to reserve its height or
  // the last card sits underneath it.
  const hasTabBar = tabsForPath(pathname) !== null;

  return (
    <div className={backgroundClass(role)}>
      <AmbientBackdrop role={role} />
      <div
        className={`relative z-10 w-full max-w-6xl mx-auto ${
          hasTabBar ? 'pb-24 md:pb-0' : ''
        }`}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>
      <MobileTabBar />
    </div>
  );
}

/**
 * The screen-to-screen transition: the outgoing view drops back slightly and
 * fades, the incoming one rises into place. Small distances and a decelerating
 * curve - the point is continuity, not spectacle.
 *
 * The exit half only works because AnimatePresence in AppRoutes holds the old
 * <Routes> (with its old location) mounted until this finishes; presence is
 * propagated down through context, so this component never needs a key.
 */
function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.995 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function HomeRoute() {
  const navigate = useNavigate();
  return (
    <PageTransition>
      <HomePage
        onGetStarted={() => navigate('/signup')}
        onSignIn={() => navigate('/login')}
      />
    </PageTransition>
  );
}

/** Guest mode stays a local demo path; it never touches the database. */
function useGuestLogin() {
  const navigate = useNavigate();
  const { signInAsGuest } = useAppState();
  return () => {
    signInAsGuest();
    navigate('/role');
  };
}

function LoginRoute() {
  const navigate = useNavigate();
  const { signIn } = useAppState();
  const onGuestLogin = useGuestLogin();
  return (
    <div className="max-w-md mx-auto pt-20">
      <LoginForm
        onSwitchToSignup={() => navigate('/signup')}
        onSubmitCredentials={async input => {
          await signIn(input);
          navigate('/role');
        }}
        onBack={() => navigate('/')}
        onGuestLogin={onGuestLogin}
      />
    </div>
  );
}

function SignUpRoute() {
  const navigate = useNavigate();
  const { signUp } = useAppState();
  const onGuestLogin = useGuestLogin();
  return (
    <div className="max-w-md mx-auto pt-20">
      <SignUpForm
        onSwitchToLogin={() => navigate('/login')}
        onSubmitSignUp={async input => {
          const result = await signUp(input);
          // Only navigate when a session actually came back. With email
          // confirmation on it will not, and the form shows its own next step.
          if (result.signedIn) navigate('/role');
          return result;
        }}
        onBack={() => navigate('/')}
        onGuestLogin={onGuestLogin}
      />
    </div>
  );
}

/**
 * Deliberately outside every gate: someone arriving here has a recovery
 * session and no idea what state their account is in, and bouncing them into
 * onboarding would lose the one thing they came to do.
 */
function ResetPasswordRoute() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAppState();
  return (
    <div className="mx-auto max-w-md">
      <ResetPassword onDone={() => navigate(isAuthenticated ? '/role' : '/login', { replace: true })} />
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
        onBack={async () => {
          // Sign-out is now a real call; wait for it so the login screen is
          // never rendered with a session still in place.
          await signOut();
          navigate('/login');
        }}
      />
    </div>
  );
}

/**
 * Signing out returns to the landing page. Staying put would leave someone on
 * a dashboard that has quietly become the guest demo.
 */
function useSignOut() {
  const navigate = useNavigate();
  const { signOut } = useAppState();
  return () => {
    void signOut().then(() => navigate('/', { replace: true }));
  };
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

/**
 * Sends a signed-in account that has nothing set up to its setup screen.
 *
 * Guests and unconfigured builds fall straight through: guest mode is a local
 * demo over the seed data, and pushing a demo user into a form that cannot
 * save would be worse than the fake dashboard.
 *
 * Nothing renders until the check has run, so a returning user never sees a
 * flash of setup on their way to a dashboard they already own.
 */
function RequireSetup({
  need,
  to,
  children,
}: {
  need: 'tenant' | 'landlord';
  to: string;
  children: ReactNode;
}) {
  const { ready, needsTenantSetup, needsLandlordSetup } = useTenancy();
  const { isLoadingSession } = useAppState();

  // Wait for a real answer. Rendering the dashboard early would flash the wrong
  // screen; redirecting early sends a set-up account back into onboarding.
  if (isLoadingSession || !ready) return null;
  const needsSetup = need === 'tenant' ? needsTenantSetup : needsLandlordSetup;
  if (needsSetup) return <Navigate to={to} replace />;
  return <>{children}</>;
}

function TenantSetupRoute() {
  const navigate = useNavigate();
  const { refresh } = useTenancy();
  const { userId, isLoadingSession } = useAppState();
  const { userName } = useDisplayUser();

  // On a direct visit or a reload the session is still being read back, and
  // userId is briefly null for an account that has one. Deciding here would
  // bounce a signed-in user straight back out of their own setup screen.
  if (isLoadingSession) return null;

  // Genuinely no account - a guest, say. There is nothing to attach a tenancy
  // to, so send them to the demo dashboard they came for.
  if (!userId) return <Navigate to="/tenant" replace />;

  return (
    <TenantSetup
      userId={userId}
      userName={userName}
      // Wait for the new tenancy to be in hand. Navigating first sends the
      // gate to judge the data from before it existed, which bounces straight
      // back to this screen.
      onDone={async () => {
        await refresh();
        navigate('/tenant', { replace: true });
      }}
      onBack={() => navigate('/role')}
    />
  );
}

function LandlordSetupRoute() {
  const navigate = useNavigate();
  const { refresh } = useTenancy();
  const { userId, isLoadingSession } = useAppState();
  const { userName } = useDisplayUser();

  if (isLoadingSession) return null;
  if (!userId) return <Navigate to="/landlord" replace />;

  return (
    <LandlordSetup
      userId={userId}
      userName={userName}
      onDone={async () => {
        await refresh();
        navigate('/landlord', { replace: true });
      }}
      onBack={() => navigate('/role')}
    />
  );
}

function TenantDashboardRoute() {
  const navigate = useNavigate();
  const { userName, userEmail } = useDisplayUser();
  const onBack = useBackToRoleSelection();
  const { view, ready } = useTenancy();
  const handleSignOut = useSignOut();

  // Hold rather than paint the demo flat and swap it a moment later.
  if (!ready) return null;

  return (
    <TenantDashboard
      userName={userName}
      userEmail={userEmail}
      property={view}
      onSignOut={handleSignOut}
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
  const { properties: demoProperties, updateProperty, deleteProperty, isAuthenticated } =
    useAppState();
  const { portfolio, pendingClaims, tenancies, refresh, error } = useTenancy();
  const handleSignOut = useSignOut();
  const { userName, userEmail } = useDisplayUser();
  const onBack = useBackToRoleSelection();

  // Guests keep the seed portfolio; the demo has to stay readable.
  const properties = isAuthenticated ? portfolio : demoProperties;

  return (
    <LandlordDashboard
      userName={userName}
      userEmail={userEmail}
      properties={properties}
      onSignOut={isAuthenticated ? handleSignOut : undefined}
      pendingClaims={isAuthenticated ? pendingClaims : []}
      loadError={isAuthenticated ? error : null}
      tenancies={isAuthenticated ? tenancies : []}
      refreshTenancy={refresh}
      onNavigateToPropertyListing={() => navigate('/landlord/properties/new')}
      onNavigateToPropertyManagement={property =>
        navigate(`/landlord/properties/${property.id}`)
      }
      onUpdateProperty={(id, changes) => {
        if (!isAuthenticated) return updateProperty(id, changes);
        updatePropertyRow(id, {
          title: changes.title,
          rent: changes.rent,
          deposit: changes.deposit,
          bedrooms: changes.bedrooms,
          bathrooms: changes.bathrooms,
          area_sqft: changes.area,
          amenities: changes.amenities,
          status: changes.status,
        })
          .then(refresh)
          .catch((err: Error) =>
            toast.error('Could not save the change', { description: err.message }),
          );
      }}
      onDeleteProperty={id => {
        if (!isAuthenticated) return deleteProperty(id);
        deletePropertyRow(id)
          .then(refresh)
          .catch((err: Error) =>
            toast.error('Could not delete the property', { description: err.message }),
          );
      }}
      onBack={onBack}
    />
  );
}

function PropertyListingRoute() {
  const navigate = useNavigate();
  const { addProperty, userId, isAuthenticated } = useAppState();
  const { refresh } = useTenancy();
  const { userName, userEmail } = useDisplayUser();

  return (
    <PropertyListing
      userName={userName}
      userEmail={userEmail}
      onBack={() => navigate('/landlord')}
      onAddProperty={form => {
        if (!isAuthenticated || !userId) return addProperty(form);
        createProperty(userId, {
          title: form.title,
          address_line: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          type: form.type,
          rent: Number(form.rent) || 0,
          deposit: Number(form.deposit) || 0,
          bedrooms: Number(form.bedrooms) || 0,
          bathrooms: Number(form.bathrooms) || 0,
          area_sqft: Number(form.area) || 0,
          amenities: form.amenities,
        })
          .then(refresh)
          .catch((err: Error) =>
            toast.error('Could not add the property', { description: err.message }),
          );
      }}
    />
  );
}

function PropertyManagementRoute() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { properties: demoProperties, isAuthenticated, isLoadingSession } = useAppState();
  const { portfolio, ready } = useTenancy();

  // Looked the id up in the seed array, so a real property was never found and
  // every visit bounced back to the portfolio.
  const properties = isAuthenticated ? portfolio : demoProperties;
  const property = properties.find(p => p.id === id);

  // Deciding before the portfolio has loaded would redirect away from a
  // property that does exist.
  if (isLoadingSession || (isAuthenticated && !ready)) return null;

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
  const location = useLocation();

  // Keying <Routes> by pathname makes each screen a presence child: the old
  // tree stays mounted (still rendering the old location) while it animates
  // out, then the new one animates in. mode="wait" keeps the two from
  // overlapping, and initial={false} stops a first paint from animating.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomeRoute />} />
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignUpRoute />} />
        <Route path="/reset-password" element={<ResetPasswordRoute />} />
        <Route path="/role" element={<RoleSelectionRoute />} />

        <Route path="/tenant/setup" element={<TenantSetupRoute />} />
        <Route
          path="/tenant"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <TenantDashboardRoute />
            </RequireSetup>
          }
        />
        <Route path="/tenant/rent" element={<RentDetailsRoute />} />
        <Route path="/tenant/utilities" element={<UtilityServicesRoute />} />
        <Route path="/tenant/utilities/book" element={<ServiceBookingRoute />} />
        <Route path="/tenant/complaint" element={<ComplaintRoute />} />
        <Route path="/tenant/landlord-contact" element={<LandlordContactRoute />} />

        <Route path="/landlord/setup" element={<LandlordSetupRoute />} />
        <Route
          path="/landlord"
          element={
            <RequireSetup need="landlord" to="/landlord/setup">
              <LandlordDashboardRoute />
            </RequireSetup>
          }
        />
        <Route path="/landlord/properties/new" element={<PropertyListingRoute />} />
        <Route path="/landlord/properties/:id" element={<PropertyManagementRoute />} />
      </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
