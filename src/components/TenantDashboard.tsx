import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Home, FileText, AlertCircle, CreditCard, MessageSquare, Settings, LogOut, Calendar, MapPin, Phone, Mail, Building, DollarSign, Clock, CheckCircle, AlertTriangle, User, Download, Wrench, IndianRupee } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { RentDetails } from './RentDetails';
import logoImage from '../assets/f9db841723abccd8e77067ba08099110a512d8fa.png';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import type { TenantPropertyView } from '../lib/tenantView';
import { useTenancy } from '../context/TenancyProvider';
import { useAppState } from '../context/AppState';
import { reportPayment } from '../lib/records';
import { cancelEndRequest, requestEndTenancy, withdrawTenancy } from '../lib/tenancy';
import { Repeat } from 'lucide-react';

interface TenantDashboardProps {
  userName: string;
  userEmail: string;
  /**
   * The tenancy this screen describes. Passed in rather than fetched here so
   * the component stays presentational, and so guest mode can hand it the demo
   * flat instead of an empty screen.
   */
  property: TenantPropertyView;
  /** Absent for guests, who have no account to sign out of. */
  onSignOut?: () => void;
  onNavigateToRentDetails: (initialTab?: 'agreement' | 'history') => void;
  onNavigateToUtilityServices: () => void;
  onNavigateToComplaintRegistration: () => void;
  onNavigateToLandlordContact: (initialTab?: 'message' | 'call' | 'history') => void;
  onBack: () => void;
}

export function TenantDashboard({ userName, userEmail, property, onSignOut, onNavigateToRentDetails, onNavigateToUtilityServices, onNavigateToComplaintRegistration, onNavigateToLandlordContact, onBack }: TenantDashboardProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [bankName, setBankName] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isRentPaid, setIsRentPaid] = useState(false);
  const { myTenancy, refresh } = useTenancy();
  const { userId, isAuthenticated } = useAppState();
  const [isWithdrawing, setIsWithdrawing] = useState(false);


  const [isLeaving, setIsLeaving] = useState(false);
  const endRequested = Boolean(myTenancy?.end_requested_at);

  // Asking is all a tenant can do: ending the tenancy is the landlord's to
  // approve, so nothing changes here until they do.
  const handleLeave = () => {
    if (!myTenancy) return;
    setIsLeaving(true);
    const action = endRequested ? cancelEndRequest : requestEndTenancy;
    action(myTenancy.id)
      .then(() => {
        refresh();
        toast.success(
          endRequested ? 'Request cancelled' : 'Request sent to your landlord',
          {
            description: endRequested
              ? 'Your tenancy carries on as before.'
              : 'Your tenancy continues until they approve it.',
          },
        );
      })
      .catch(err =>
        toast.error('Could not send that', {
          description: err instanceof Error ? err.message : 'Please try again.',
        }),
      )
      .finally(() => setIsLeaving(false));
  };

  const handleWithdraw = () => {
    if (!myTenancy) return;
    setIsWithdrawing(true);
    withdrawTenancy(myTenancy.id)
      .then(() => {
        refresh();
        toast.success('Claim withdrawn', {
          description: 'You can set your tenancy up again from scratch.',
        });
      })
      .catch(err =>
        toast.error('Could not withdraw the claim', {
          description: err instanceof Error ? err.message : 'Please try again.',
        }),
      )
      .finally(() => setIsWithdrawing(false));
  };

  const propertyData = property;

  const actionButtons = [
    {
      id: 'rent-details',
      title: 'Rent Details',
      description: 'View your rent agreement and terms',
      icon: FileText
    },
    {
      id: 'rent',
      title: 'Rent & Bills',
      description: 'Manage payments and view billing history',
      icon: CreditCard
    },
    {
      id: 'utilities',
      title: 'Request Utility Services',
      description: 'Set up or modify utility services',
      icon: Wrench
    },
    {
      id: 'complaint',
      title: 'Register a Complaint',
      description: 'Report issues or maintenance requests',
      icon: MessageSquare
    }
  ];

  const handleActionClick = (actionId: string) => {
    setActiveAction(actionId);
    
    if (actionId === 'rent-details') {
      onNavigateToRentDetails('agreement');
    } else if (actionId === 'rent') {
      onNavigateToRentDetails('history');
    } else if (actionId === 'utilities') {
      onNavigateToUtilityServices();
    } else if (actionId === 'complaint') {
      onNavigateToComplaintRegistration();
    } else {
      // In a real app, other actions would navigate to their specific pages
      toast.info(`Opening ${actionButtons.find(btn => btn.id === actionId)?.title} (This is a demo)`);
    }
  };

  const handlePaymentMethodChange = (method: 'upi' | 'netbanking' | 'card') => {
    setPaymentMethod(method);
  };

  const handlePaymentSubmit = () => {
    // Validate payment details based on method
    if (paymentMethod === 'upi' && !upiId) {
      toast.error('Please enter your UPI ID');
      return;
    }
    if (paymentMethod === 'netbanking' && !bankName) {
      toast.error('Please select your bank');
      return;
    }
    if (paymentMethod === 'card' && (!cardNumber || !cardExpiry || !cardCvv)) {
      toast.error('Please fill in all card details');
      return;
    }

    const clearForm = () => {
      setUpiId('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setBankName('');
    };

    const METHOD_LABEL = {
      upi: 'UPI Transfer',
      netbanking: 'Net Banking',
      card: 'Card',
    } as const;

    setIsProcessingPayment(true);

    // Guest mode has no tenancy to record against, so it keeps the simulated
    // flow rather than failing - the demo has to stay usable.
    if (!myTenancy || !userId) {
      setTimeout(() => {
        setIsProcessingPayment(false);
        setShowPaymentDialog(false);
        clearForm();
        toast.success('Payment recorded (demo)', {
          description: 'Sign in with an account to record real payments.',
          duration: 5000,
        });
        setIsRentPaid(true);
      }, 1200);
      return;
    }

    // Recorded as 'reported', not 'paid'. The tenant is saying they have paid;
    // confirming receipt is the landlord's to do, and the insert policy would
    // refuse anything else.
    reportPayment({
      tenancyId: myTenancy.id,
      userId,
      // A pending tenant-declared tenancy has rent = 0 by policy; the figure
      // the tenant is actually paying against is their proposal, which is what
      // the screen shows them. Recording 0 would be a false record of a real
      // payment.
      amount: Number(myTenancy.rent) || Number(myTenancy.proposed_rent) || 0,
      method: METHOD_LABEL[paymentMethod],
      reference:
        paymentMethod === 'upi'
          ? upiId
          : paymentMethod === 'netbanking'
            ? bankName
            : cardNumber.slice(-4).padStart(4, '*'),
      dueDate: null,
    })
      .then(() => {
        setShowPaymentDialog(false);
        clearForm();
        setIsRentPaid(true);
        refresh();
        toast.success('Payment recorded', {
          description: 'Your landlord will see it and confirm receipt.',
          duration: 5000,
        });
      })
      .catch(err => {
        toast.error('Could not record the payment', {
          description: err instanceof Error ? err.message : 'Please try again.',
        });
      })
      .finally(() => setIsProcessingPayment(false));
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* A frosted toolbar that stays with you as the dashboard scrolls, with
          the page title set below it - the macOS window-title arrangement. */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="material sticky top-3 z-30 flex items-center justify-between rounded-2xl px-3 py-2 shadow-[var(--shadow-sm)]"
      >
        <div className="flex items-center gap-2 pl-1">
          <img src={logoImage} alt="Aavas" className="h-7" />
          <span className="text-xl font-aavas" style={{ color: 'var(--tenant-primary)' }}>Aavas</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Switch role"
            variant="ghost"
            onClick={onBack}
            className="rounded-full gap-2 text-muted-foreground"
            title="Switch Role"
          >
            <Repeat className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Switch role</span>
          </Button>
          {isAuthenticated && onSignOut && (
            <Button
              aria-label="Sign out"
              variant="ghost"
              onClick={onSignOut}
              className="rounded-full gap-2 text-muted-foreground"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Sign out</span>
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="pt-4 pb-2 text-center"
      >
        <h1
          className="text-4xl sm:text-5xl font-semibold tracking-[-0.035em] text-balance"
          style={{ color: 'var(--tenant-primary)' }}
        >
          Welcome Home, {userName}!
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Manage your rental property and stay connected
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Property Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-[var(--shadow-md)] border bg-gradient-to-br" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)', backgroundColor: 'rgba(44, 122, 123, 0.05)' }}>
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl" style={{ color: 'var(--tenant-primary)' }}>
                    Your Property Details
                  </CardTitle>
                  <CardDescription>
                    Current rental information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Address */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--tenant-primary)' }}>
                  <MapPin className="w-4 h-4" />
                  <span>Property Address</span>
                </div>
                <div className="pl-6">
                  <p>{propertyData.address}</p>
                  <p className="text-muted-foreground">{propertyData.city}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" style={{ backgroundColor: 'var(--tenant-accent)', color: 'var(--tenant-primary)' }}>
                      {propertyData.propertyType}
                    </Badge>
                    {propertyData.isUnconfirmed && (
                      <>
                        <Badge
                          variant="secondary"
                          style={{ backgroundColor: 'rgba(255, 165, 0, 0.18)', color: '#b45309' }}
                        >
                          Awaiting landlord confirmation
                        </Badge>
                        {/* Without this a mistyped address is permanent. */}
                        {myTenancy && (
                          <button
                            type="button"
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                            className="rounded-lg px-1 text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-destructive hover:underline disabled:opacity-50"
                          >
                            {isWithdrawing ? 'Withdrawing…' : 'Withdraw'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Separator style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.3 }} />

              {/* Owner Information */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--tenant-primary)' }}>
                  <User className="w-4 h-4" />
                  <span>Property Owner</span>
                </div>
                <div className="pl-6 space-y-2">
                  <p>{propertyData.owner.name}</p>
                  <div className="flex flex-col space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3 h-3" />
                      <span>{propertyData.owner.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3" />
                      <span>{propertyData.owner.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.3 }} />

              {/* Lease Information */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--tenant-primary)' }}>
                  <Calendar className="w-4 h-4" />
                  <span>Lease Information</span>
                </div>
                <div className="pl-6 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Lease Period</p>
                    <p>{propertyData.lease.startDate} - {propertyData.lease.endDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Rent</p>
                    <p style={{ color: 'var(--tenant-primary)' }}>{propertyData.lease.monthlyRent}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Security Deposit</p>
                    <p>{propertyData.lease.deposit}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Next Rent Due</p>
                    <p className="text-orange-600 dark:text-orange-400">{propertyData.nextRentDue}</p>
                  </div>
                </div>
              </div>

              {/* Ending a tenancy takes both sides, so this asks rather than
                  does. Only shown once there is a real, confirmed tenancy. */}
              {myTenancy && !propertyData.isUnconfirmed && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--hairline)] p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {endRequested ? 'You have asked to end this tenancy' : 'Moving out?'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {endRequested
                        ? 'Waiting for your landlord to approve. Nothing changes until they do.'
                        : 'Your landlord has to approve before the tenancy ends.'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11 sm:h-8 shrink-0"
                    disabled={isLeaving}
                    onClick={handleLeave}
                  >
                    {isLeaving
                      ? 'Working…'
                      : endRequested
                        ? 'Cancel request'
                        : 'Request to leave'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card - Moved here */}
          <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage your tenancy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionButtons.map((action) => {
                const IconComponent = action.icon;
                return (
                  <Button
                    key={action.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] border"
                    style={{ 
                      backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 6%, var(--card))', 
                      borderColor: 'color-mix(in srgb, var(--tenant-primary) 16%, transparent)',
                    }}
                    onClick={() => handleActionClick(action.id)}
                  >
                    <div className="flex items-start space-x-3 text-left">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-[var(--shadow-xs)] flex-shrink-0" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>
                          {action.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Account Summary Card */}
          <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                Account Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rent Payment Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Badge 
                  style={{ 
                    backgroundColor: isRentPaid ? 'rgba(122, 216, 158, 0.2)' : 'rgba(255, 165, 0, 0.2)', 
                    color: isRentPaid ? 'var(--tenant-success-dark)' : '#d97706'
                  }}
                >
                  {isRentPaid ? 'Paid' : 'Due'}
                </Badge>
              </div>

              <Separator style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.2 }} />

              {/* Rent Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rent Status</span>
                <Badge 
                  style={{ 
                    backgroundColor: 'rgba(122, 216, 158, 0.2)', 
                    color: 'var(--tenant-success-dark)'
                  }}
                >
                  Active
                </Badge>
              </div>

              <Separator style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.2 }} />

              {/* Open Requests */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Requests</span>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="outline" 
                    style={{ 
                      borderColor: 'var(--tenant-primary)', 
                      color: 'var(--tenant-primary)'
                    }}
                  >
                    0
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pay Rent Card */}
          <Card className="shadow-[var(--shadow-md)] border bg-gradient-to-br" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)', backgroundColor: 'rgba(44, 122, 123, 0.15)' }}>
            <CardContent className="pt-6">
              {!isRentPaid ? (
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                      <IndianRupee className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Next Payment Due</p>
                    <p className="text-2xl" style={{ color: 'var(--tenant-primary)' }}>
                      {propertyData.lease.monthlyRent}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due on {propertyData.nextRentDue}
                    </p>
                  </div>
                  <Button
                    className="w-full text-white transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary)'}
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Pay Rent Now
                  </Button>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="text-center space-y-3"
                >
                  <div className="flex justify-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center bg-green-500">
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xl" style={{ color: 'var(--tenant-primary)' }}>
                      Rent Paid for December
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Nothing due at this time
                    </p>
                  </div>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Amount Paid</span>
                      <span className="font-medium">{propertyData.lease.monthlyRent}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Payment Date</span>
                      <span className="font-medium">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Contact Landlord Card */}
          <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                Contact Landlord
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Landlord Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{propertyData.owner.name}</p>
                    <p className="text-xs text-muted-foreground">Property Owner</p>
                  </div>
                </div>
              </div>

              <Separator style={{ backgroundColor: 'var(--tenant-primary)', opacity: 0.2 }} />

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 6%, var(--card))', 
                    borderColor: 'color-mix(in srgb, var(--tenant-primary) 16%, transparent)',
                  }}
                  onClick={() => onNavigateToLandlordContact('call')}
                >
                  <Phone className="w-4 h-4 mr-3" style={{ color: 'var(--tenant-primary)' }} />
                  <div className="text-left">
                    <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>Call</p>
                    <p className="text-xs text-muted-foreground">{propertyData.owner.phone}</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 6%, var(--card))', 
                    borderColor: 'color-mix(in srgb, var(--tenant-primary) 16%, transparent)',
                  }}
                  onClick={() => onNavigateToLandlordContact('message')}
                >
                  <MessageSquare className="w-4 h-4 mr-3" style={{ color: 'var(--tenant-primary)' }} />
                  <div className="text-left">
                    <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>Send Message</p>
                    <p className="text-xs text-muted-foreground">Chat with landlord</p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
                  style={{ 
                    backgroundColor: 'color-mix(in srgb, var(--tenant-primary) 6%, var(--card))', 
                    borderColor: 'color-mix(in srgb, var(--tenant-primary) 16%, transparent)',
                  }}
                  onClick={() => onNavigateToLandlordContact('history')}
                >
                  <Clock className="w-4 h-4 mr-3" style={{ color: 'var(--tenant-primary)' }} />
                  <div className="text-left">
                    <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>Open History</p>
                    <p className="text-xs text-muted-foreground">View past conversations</p>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span>Pay Your Rent</span>
            </DialogTitle>
            <DialogDescription>
              Complete your rent payment securely through Aavas
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Payment Summary */}
            <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)', backgroundColor: 'rgba(44, 122, 123, 0.05)' }}>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Amount Due</span>
                    <span className="text-2xl" style={{ color: 'var(--tenant-primary)' }}>
                      {propertyData.lease.monthlyRent}
                    </span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>{propertyData.nextRentDue}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Property</span>
                    <span>{propertyData.address}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Landlord</span>
                    <span>{propertyData.owner.name}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label>Select Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={handlePaymentMethodChange}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <RadioGroupItem value="upi" id="upi" />
                  <Label htmlFor="upi" className="flex-1 cursor-pointer">
                    <div className="flex items-center space-x-2">
                      <span>UPI (Recommended)</span>
                      <Badge variant="secondary" className="text-xs">Fast</Badge>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <RadioGroupItem value="netbanking" id="netbanking" />
                  <Label htmlFor="netbanking" className="flex-1 cursor-pointer">
                    Net Banking
                  </Label>
                </div>
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex-1 cursor-pointer">
                    Credit/Debit Card
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Payment Details Form */}
            <motion.div
              key={paymentMethod}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {paymentMethod === 'upi' && (
                <div className="space-y-2">
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your UPI ID (e.g., yourname@paytm, yourname@phonepe)
                  </p>
                </div>
              )}

              {paymentMethod === 'netbanking' && (
                <div className="space-y-2">
                  <Label htmlFor="bankName">Select Bank</Label>
                  <Input
                    id="bankName"
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Enter bank name (e.g., HDFC, ICICI, SBI)"
                    className="transition-all"
                  />
                  <p className="text-xs text-muted-foreground">
                    You will be redirected to your bank's website
                  </p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardExpiry">Expiry Date</Label>
                      <Input
                        id="cardExpiry"
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCvv">CVV</Label>
                      <Input
                        id="cardCvv"
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={3}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your card details are secure and encrypted
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="text-white"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary)'}
              onClick={handlePaymentSubmit}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>Pay {propertyData.lease.monthlyRent}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}