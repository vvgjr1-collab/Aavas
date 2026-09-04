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
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { RentDetails } from './RentDetails';
import logoImage from 'figma:asset/f9db841723abccd8e77067ba08099110a512d8fa.png';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface TenantDashboardProps {
  userName: string;
  userEmail: string;
  onNavigateToRentDetails: (initialTab?: 'agreement' | 'history') => void;
  onNavigateToUtilityServices: () => void;
  onNavigateToComplaintRegistration: () => void;
  onNavigateToLandlordContact: (initialTab?: 'message' | 'call' | 'history') => void;
  onBack: () => void;
}

export function TenantDashboard({ userName, userEmail, onNavigateToRentDetails, onNavigateToUtilityServices, onNavigateToComplaintRegistration, onNavigateToLandlordContact, onBack }: TenantDashboardProps) {
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

  // Mock property data
  const propertyData = {
    address: "123 Sunset Boulevard, Apt 4B",
    city: "Mumbai, MH 400001",
    owner: {
      name: "Sarah Johnson",
      phone: "+91 98765 43210",
      email: "sarah.johnson@properties.com"
    },
    lease: {
      startDate: "Jan 15, 2024",
      endDate: "Jan 14, 2025",
      monthlyRent: "₹45,000",
      deposit: "₹90,000"
    },
    nextRentDue: "Dec 1, 2024",
    propertyType: "2BR/2BA Apartment"
  };

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

    setIsProcessingPayment(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPaymentDialog(false);
      // Reset form
      setUpiId('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setBankName('');
      toast.success('Payment of ₹45,000 successful! Transaction ID: TXN' + Math.random().toString(36).substr(2, 9).toUpperCase(), {
        description: 'Your rent payment has been processed successfully.',
        duration: 5000,
      });
      setIsRentPaid(true);
    }, 2000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-full"
          title="Switch Role"
        >
          <LogOut className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div className="text-center flex-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logoImage} alt="Aavas" className="h-8" />
            <span className="text-2xl font-aavas" style={{ color: 'var(--tenant-primary)' }}>Aavas</span>
          </div>
          <h1 className="text-3xl mb-2" style={{ color: 'var(--tenant-primary)' }}>
            Welcome Home, {userName}!
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your rental property and stay connected
          </p>
        </div>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Property Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-2 bg-gradient-to-br" style={{ borderColor: 'var(--tenant-primary)', backgroundColor: 'rgba(44, 122, 123, 0.05)' }}>
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
                  <Badge variant="secondary" className="mt-2" style={{ backgroundColor: 'var(--tenant-accent)', color: 'var(--tenant-primary)' }}>
                    {propertyData.propertyType}
                  </Badge>
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
            </CardContent>
          </Card>

          {/* Quick Actions Card - Moved here */}
          <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
                    className="w-full justify-start h-auto p-4 transition-all duration-200 hover:scale-105 border"
                    style={{ 
                      backgroundColor: 'var(--tenant-accent)', 
                      borderColor: 'var(--tenant-primary)',
                    }}
                    onClick={() => handleActionClick(action.id)}
                  >
                    <div className="flex items-start space-x-3 text-left">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--tenant-primary)' }}>
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
          <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
          <Card className="border-2 bg-gradient-to-br" style={{ borderColor: 'var(--tenant-primary)', backgroundColor: 'rgba(44, 122, 123, 0.15)' }}>
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
                    className="w-full text-white transition-all duration-200 hover:scale-105"
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
          <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
                  className="w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: 'var(--tenant-accent)', 
                    borderColor: 'var(--tenant-primary)',
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
                  className="w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: 'var(--tenant-accent)', 
                    borderColor: 'var(--tenant-primary)',
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
                  className="w-full justify-start h-auto py-3 transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: 'var(--tenant-accent)', 
                    borderColor: 'var(--tenant-primary)',
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
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)', backgroundColor: 'rgba(44, 122, 123, 0.05)' }}>
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
                <>Pay ₹45,000</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}