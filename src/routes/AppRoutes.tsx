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
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { arrivedWithAuthCode } from '../lib/supabase';
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
import { EmailConfirmed } from '../components/auth/EmailConfirmed';
import { AccountPage } from '../components/account/AccountPage';
import { completionFor } from '../lib/profileCompletion';
import { attentionFor } from '../lib/attention';
import { useLandlordActivity } from '../hooks/useLandlordActivity';
import { listDocuments } from '../lib/records';
import { PrivacyPolicy } from '../components/legal/PrivacyPolicy';
import { Terms } from '../components/legal/Terms';

import { useAppState, useDisplayUser } from '../context/AppState';
import { TENANT_PROPERTY_ADDRESS } from '../data/properties';
import type { TenantPropertyView } from '../lib/tenantView';

/**
 * The address of the flat this tenant actually rents.
 *
 * Three screens took the seed address instead - a constant naming a flat on
 * Sunset Boulevard - so a tenant filing a complaint, booking a service or
 * contacting their landlord was shown somebody else's home as their own. The
 * demo view still carries the seed flat, which is right for a guest.
 */
function tenantAddress(view: TenantPropertyView): string {
  return [view.address, view.city].filter(Boolean).join(', ') || TENANT_PROPERTY_ADDRESS;
}
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

/** Where a signed-in account belongs: its dashboard, or the menu if unchosen. */
function homeFor(role: 'tenant' | 'landlord' | null): string {
  if (role === 'tenant') return '/tenant';
  if (role === 'landlord') return '/landlord';
  return '/role';
}

/**
 * The landing page, and the decision not to show it twice.
 *
 * It exists for someone deciding whether to sign up, and it is the only page
 * outside every gate that carries the privacy and terms links - so it stays.
 * But it was rendered unconditionally, which meant every returning user, on
 * every visit, was met with "Create Free Account" for an account they already
 * had. A bookmark or a home-screen icon points here, so that was most visits.
 *
 * Anyone with a session goes where they were going instead. The role has been
 * persisted on the profile since it was first chosen, so this can send them
 * the whole way rather than to a menu they have already answered.
 *
 * This is also the single place that decision is made: /login and the
 * catch-all route both come through here rather than each guessing.
 */
function HomeRoute() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingSession, isProfileSettled, role } = useAppState();

  // Deciding before the session and profile are read would either flash the
  // landing page at someone who is signed in, or send them to /role because
  // their role had not arrived yet.
  if (isLoadingSession || !isProfileSettled) return null;

  // A confirmation link lands here carrying a code; the effect in AppRoutes
  // sends it to /welcome, and that must win.
  if (isAuthenticated && !arrivedWithAuthCode) {
    return <Navigate to={homeFor(role)} replace />;
  }

  return (
    <PageTransition>
      <HomePage
        onGetStarted={() => navigate('/signup')}
        onSignIn={() => navigate('/login')}
        onOpenLegal={page => navigate(`/${page}`)}
      />
    </PageTransition>
  );
}

/**
 * Where a confirmation link lands. Sends people on by the role they already
 * chose, so a returning account does not stop at a menu it has answered.
 */
function WelcomeRoute() {
  const navigate = useNavigate();
  const { role } = useAppState();
  return (
    <div className="mx-auto max-w-md">
      <EmailConfirmed
        onContinue={() =>
          navigate(role ? (role === 'tenant' ? '/tenant' : '/landlord') : '/role', {
            replace: true,
          })
        }
        onSignIn={() => navigate('/login', { replace: true })}
      />
    </div>
  );
}

/**
 * Reachable signed out, and outside every gate: someone reading the privacy
 * policy to decide whether to sign up must not be asked to sign in first.
 */
function LegalRoute({ page }: { page: 'privacy' | 'terms' }) {
  const navigate = useNavigate();
  // Back to wherever they came from, or home if the page was opened directly.
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));
  return (
    <PageTransition>
      {page === 'privacy' ? <PrivacyPolicy onBack={back} /> : <Terms onBack={back} />}
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
          // Not straight to /role: the role is on the profile, which has not
          // been read back yet at this point. HomeRoute waits for it and
          // sends a returning account to its own dashboard.
          navigate('/', { replace: true });
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

/**
 * The account screen, and the completion figure that drives it.
 *
 * The counts it needs live in two different places - properties and tenancies
 * in the tenancy provider, the agreement in storage - so they are gathered
 * here rather than inside a presentational component.
 */
function AccountRoute() {
  const navigate = useNavigate();
  const { profile, saveProfile, role, user, clearRole } = useAppState();
  const { portfolio, myTenancy } = useTenancy();
  const handleSignOut = useSignOut();
  const [saving, setSaving] = useState(false);
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
        /* treated as not uploaded, which is the safe way round */
      });
    return () => {
      active = false;
    };
  }, [myTenancy?.id]);

  const completion = completionFor({
    profile,
    role,
    propertyCount: portfolio.length,
    hasTenancy: Boolean(myTenancy),
    hasAgreement,
  });

  return (
    <AccountPage
      profile={profile}
      email={user?.email ?? ''}
      role={role}
      completion={completion}
      saving={saving}
      onSave={async changes => {
        setSaving(true);
        try {
          await saveProfile(changes);
          toast.success('Saved');
        } catch (err) {
          toast.error('Could not save that', {
            description: err instanceof Error ? err.message : 'Please try again.',
          });
        } finally {
          setSaving(false);
        }
      }}
      onSwitchRole={() => {
        clearRole();
        navigate('/role');
      }}
      onSignOut={handleSignOut}
      onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
      onGo={href => navigate(href)}
      // Straight to where notice is actually given, on the side that blocks:
      // the landlord gives it on the property page, the tenant on their
      // dashboard. Being told "end the tenancy first" and left to find it is
      // half an answer.
      onGoToNotice={block =>
        navigate(
          block.is_landlord && block.property_id
            ? `/landlord/properties/${block.property_id}`
            : '/tenant',
        )
      }
      onDeleted={() => navigate('/', { replace: true })}
    />
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
  const { view } = useTenancy();

  // Reached directly (or after a reload) with no provider chosen.
  if (!bookingProvider) return <Navigate to="/tenant/utilities" replace />;

  return (
    <ServiceBookingConfirmation
      provider={bookingProvider}
      userName={userName}
      userEmail={userEmail}
      propertyAddress={tenantAddress(view)}
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
  const { view } = useTenancy();
  return (
    <ComplaintRegistration
      userName={userName}
      userEmail={userEmail}
      // The seed flat, 123 Sunset Boulevard, was shown to every real tenant
      // filing a complaint about their own home.
      propertyAddress={tenantAddress(view)}
      onBack={() => navigate('/tenant')}
    />
  );
}

function LandlordContactRoute() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { userName, userEmail } = useDisplayUser();
  const { userId } = useAppState();
  const { myTenancy, view } = useTenancy();
  const raw = params.get('tab');
  const tab = raw === 'call' || raw === 'history' ? raw : 'message';
  return (
    <LandlordContact
      userName={userName}
      userEmail={userEmail}
      propertyAddress={tenantAddress(view)}
      initialTab={tab}
      tenancyId={myTenancy?.id ?? null}
      viewerId={userId}
      landlord={view.owner}
      onBack={() => navigate('/tenant')}
    />
  );
}

function LandlordDashboardRoute() {
  const navigate = useNavigate();
  const { properties: demoProperties, updateProperty, deleteProperty, isAuthenticated } =
    useAppState();
  const { portfolio, pendingClaims, landlordTenancies, refresh, error } = useTenancy();
  // The strip needs every tenancy at once; the panels below it each read one.
  const { payments, complaints } = useLandlordActivity(isAuthenticated ? landlordTenancies : []);
  const attention = attentionFor({
    properties: isAuthenticated ? portfolio : [],
    tenancies: isAuthenticated ? landlordTenancies : [],
    pendingClaims: isAuthenticated ? pendingClaims : [],
    payments,
    complaints,
  });
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
      attention={attention}
      onNavigate={href => navigate(href)}
      loadError={isAuthenticated ? error : null}
      tenancies={isAuthenticated ? landlordTenancies : []}
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
  const navigate = useNavigate();

  // Confirmation emails sent before the link pointed into the app come back to
  // the homepage carrying a code. The session is established either way; this
  // is only about not leaving somebody who has just confirmed staring at
  // "Create Free Account".
  useEffect(() => {
    if (!arrivedWithAuthCode) return;
    const route = window.location.hash.replace(/^#/, '');
    if (route === '' || route === '/') navigate('/welcome', { replace: true });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keying <Routes> by pathname makes each screen a presence child: the old
  // tree stays mounted (still rendering the old location) while it animates
  // out, then the new one animates in. mode="wait" keeps the two from
  // overlapping, and initial={false} stops a first paint from animating.
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/privacy" element={<LegalRoute page="privacy" />} />
      <Route path="/terms" element={<LegalRoute page="terms" />} />
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<SignUpRoute />} />
        <Route path="/reset-password" element={<ResetPasswordRoute />} />
        <Route path="/welcome" element={<WelcomeRoute />} />
        <Route path="/role" element={<RoleSelectionRoute />} />
        <Route path="/account" element={<AccountRoute />} />

        <Route path="/tenant/setup" element={<TenantSetupRoute />} />
        <Route
          path="/tenant"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <TenantDashboardRoute />
            </RequireSetup>
          }
        />
        {/*
          Gated for the same reason the dashboard is, and it was not.
          Only /tenant carried the gate, so a signed-in account with no
          tenancy could reach every other tenant screen - one tap away on
          the mobile tab bar - and each of them falls back to the demo flat
          when there is no tenancy to read. Somebody with no tenancy was
          shown Sarah Johnson's rent, her agreement and her landlord, laid
          out as their own.

          A guest is unaffected: the demo is what a guest is here for, and
          needsTenantSetup is only ever true for a real account.
        */}
        <Route
          path="/tenant/rent"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <RentDetailsRoute />
            </RequireSetup>
          }
        />
        <Route
          path="/tenant/utilities"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <UtilityServicesRoute />
            </RequireSetup>
          }
        />
        <Route
          path="/tenant/utilities/book"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <ServiceBookingRoute />
            </RequireSetup>
          }
        />
        <Route
          path="/tenant/complaint"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <ComplaintRoute />
            </RequireSetup>
          }
        />
        <Route
          path="/tenant/landlord-contact"
          element={
            <RequireSetup need="tenant" to="/tenant/setup">
              <LandlordContactRoute />
            </RequireSetup>
          }
        />

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
