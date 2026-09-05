import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Droplets,
  Wifi,
  Thermometer,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Edit,
  Send,
  X,
  Download,
  Printer
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TenancyAccess } from './landlord/TenancyAccess';
import { TenantActivity } from './landlord/TenantActivity';
import { useTenancy } from '../context/TenancyProvider';
import { usePayments } from '../hooks/usePayments';
import { rentHistory as rentPeriods, type RentPeriod } from '../lib/rent';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import type { PropertyData } from '../types/property';

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** 'reported' is the tenant's word for it; 'Awaiting confirmation' is the landlord's. */
const STATUS_LABEL: Record<RentPeriod['status'], string> = {
  paid: 'Paid',
  reported: 'Awaiting confirmation',
  due: 'Due',
  late: 'Late',
  upcoming: 'Upcoming',
};

interface PropertyManagementProps {
  property: PropertyData;
  onBack: () => void;
}

export function PropertyManagement({ property, onBack }: PropertyManagementProps) {
  const { tenancies } = useTenancy();
  // The live tenancy for this property, if there is one.
  const tenancy =
    tenancies.find(
      t => t.property_id === property.id && (t.status === 'active' || t.status === 'pending'),
    ) ?? null;

  const { payments } = usePayments(tenancy?.id);

  const [activeTab, setActiveTab] = useState('tenant');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Mock tenant and billing data
  const [tenantData, setTenantData] = useState(property.tenant || {
    name: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    email: 'rajesh.kumar@email.com',
    moveInDate: 'March 15, 2024'
  });

  const [editedTenant, setEditedTenant] = useState({ ...tenantData });

  // Mock chat messages
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'tenant',
      text: 'Hello, the bathroom faucet is leaking. Could you please arrange for a plumber?',
      timestamp: '10:30 AM',
      date: 'Oct 25'
    },
    {
      id: 2,
      sender: 'landlord',
      text: 'Good morning! I\'ll send a plumber tomorrow morning around 10 AM. Will that work for you?',
      timestamp: '11:15 AM',
      date: 'Oct 25'
    },
    {
      id: 3,
      sender: 'tenant',
      text: 'Yes, that works perfectly. Thank you for the quick response!',
      timestamp: '11:20 AM',
      date: 'Oct 25'
    },
    {
      id: 4,
      sender: 'landlord',
      text: 'You\'re welcome! Let me know if you need anything else.',
      timestamp: '11:25 AM',
      date: 'Oct 25'
    }
  ]);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMsg = {
        id: messages.length + 1,
        sender: 'landlord',
        text: newMessage,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        date: 'Today'
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleEditTenant = () => {
    setEditedTenant({ ...tenantData });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    setTenantData(editedTenant);
    setIsEditOpen(false);
  };

  const handleCancelEdit = () => {
    setEditedTenant({ ...tenantData });
    setIsEditOpen(false);
  };

  const generateReportData = () => {
    const overduePayments = rentHistory.filter(r => r.status === 'late' || r.status === 'due');
    const latestRent = rentHistory[0];
    const unpaidUtilities = utilityBills.filter(u => u.status === 'unpaid' || u.status === 'pending');
    
    return {
      property,
      tenant: tenantData,
      latestRent,
      overduePayments,
      rentHistory,
      utilityBills,
      unpaidUtilities,
      messages,
      generatedDate: new Date().toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    };
  };

  // The five invented months this replaced were the same whoever was looking,
  // so the landlord's "Rent Status" could never disagree with what the tenant
  // had actually paid. Both sides now read the payments table.
  const rentHistory = rentPeriods({
    start: tenancy?.start_date,
    rent: Number(tenancy?.rent) || Number(tenancy?.proposed_rent) || 0,
    payments,
  });

  const utilityBills = [
    {
      type: 'Electricity',
      icon: Zap,
      amount: '₹3,245',
      dueDate: 'Dec 15, 2024',
      status: 'unpaid',
      provider: 'Maharashtra State Electricity Board',
      usage: '245 kWh'
    },
    {
      type: 'Water',
      icon: Droplets,
      amount: '₹850',
      dueDate: 'Dec 10, 2024',
      status: 'paid',
      provider: 'Mumbai Municipal Corporation',
      usage: '15,000 L'
    },
    {
      type: 'Internet',
      icon: Wifi,
      amount: '₹1,299',
      dueDate: 'Dec 5, 2024',
      status: 'paid',
      provider: 'Jio Fiber',
      usage: '500 GB'
    },
    {
      type: 'Gas',
      icon: Thermometer,
      amount: '₹645',
      dueDate: 'Dec 20, 2024',
      status: 'pending',
      provider: 'Indraprastha Gas Limited',
      usage: '45 SCM'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'unpaid':
      case 'due': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
      case 'pending':
      case 'reported': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
      case 'late': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
      case 'upcoming': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'unpaid':
      case 'due': return <XCircle className="w-4 h-4" />;
      case 'pending':
      case 'reported':
      case 'upcoming': return <Clock className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex items-center space-x-4 mb-6"
      >
        <Button
          aria-label="Go back"
          variant="ghost"
          onClick={onBack}
          className="p-2 hover:bg-muted rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-[#2e3a8c] dark:text-[#4a5bb0]">
            {property.title}
          </h1>
          <p className="text-muted-foreground flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {property.address}
          </p>
        </div>
      </motion.div>

      <TenancyAccess propertyId={property.id} tenancy={tenancy} />

      <TenantActivity tenancy={tenancy} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-[#f4eedf] dark:bg-[#2e3a8c]/20">
          <TabsTrigger 
            value="tenant" 
            className="text-[#2e3a8c]/70 data-[state=active]:text-[#2e3a8c] dark:text-white/70 dark:data-[state=active]:text-white"
          >
            Tenant Details
          </TabsTrigger>
          <TabsTrigger 
            value="rent" 
            className="text-[#2e3a8c]/70 data-[state=active]:text-[#2e3a8c] dark:text-white/70 dark:data-[state=active]:text-white"
          >
            Rent Status
          </TabsTrigger>
          <TabsTrigger 
            value="utilities" 
            className="text-[#2e3a8c]/70 data-[state=active]:text-[#2e3a8c] dark:text-white/70 dark:data-[state=active]:text-white"
          >
            Utility Bills
          </TabsTrigger>
        </TabsList>

        {/* Tenant Details Tab */}
        <TabsContent value="tenant" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/30 dark:border-[#2e3a8c]/50 bg-gradient-to-br from-[#f4eedf]/30 to-white dark:from-[#2e3a8c]/10 dark:to-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-[#2e3a8c] rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-[#2e3a8c] dark:text-[#4a5bb0]">
                        Current Tenant
                      </CardTitle>
                      <CardDescription>
                        Active lease information
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-11 sm:h-8 border-[#2e3a8c]/30 text-[#2e3a8c] hover:bg-[#f4eedf]"
                    onClick={handleEditTenant}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-2">Personal Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{tenantData.name}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{tenantData.phone}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{tenantData.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-2">Lease Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Move-in: {tenantData.moveInDate}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>Monthly Rent: {property.rent}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            Active Lease
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Rent Status Tab */}
        <TabsContent value="rent" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4"
          >
            <Card className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/30 dark:border-[#2e3a8c]/50 bg-gradient-to-br from-[#f4eedf]/30 to-white dark:from-[#2e3a8c]/10 dark:to-card">
              <CardHeader>
                <CardTitle className="text-[#2e3a8c] dark:text-[#4a5bb0] flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Rent Payment History
                </CardTitle>
                <CardDescription>
                  Track monthly rent payments and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!tenancy ? (
                  <p className="text-sm text-muted-foreground">
                    Nobody has joined this property yet, so there is no rent to track.
                  </p>
                ) : (
                <div className="space-y-4">
                  {rentHistory.map(period => (
                    <div key={period.key} className="flex items-center justify-between p-4 border border-[#2e3a8c]/20 dark:border-[#2e3a8c]/40 rounded-lg bg-[#f4eedf]/20">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(period.status)}
                          <div>
                            <p className="font-medium">{period.label}</p>
                            <p className="text-sm text-muted-foreground">
                              Due {shortDay(period.dueOn)}
                              {period.paidAt ? ` | Paid ${shortDay(period.paidAt)}` : ''}
                              {period.payment ? ` | ${period.payment.method}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(period.status)}>
                          {STATUS_LABEL[period.status]}
                        </Badge>
                        <span className="font-medium">{money(period.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Utilities Tab */}
        <TabsContent value="utilities" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid gap-4"
          >
            {utilityBills.map((bill, index) => {
              const IconComponent = bill.icon;
              return (
                <Card key={index} className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/30 dark:border-[#2e3a8c]/50 bg-gradient-to-br from-[#f4eedf]/30 to-white dark:from-[#2e3a8c]/10 dark:to-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#2e3a8c] rounded-full flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-[#2e3a8c] dark:text-[#4a5bb0]">{bill.type}</h3>
                          <p className="text-sm text-muted-foreground">{bill.provider}</p>
                          <p className="text-xs text-muted-foreground">Usage: {bill.usage}</p>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(bill.status)}>
                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                          </Badge>
                          <span className="font-medium text-lg">{bill.amount}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Due: {bill.dueDate}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-4 justify-center"
      >
        <Button 
          className="bg-[#ff914d] hover:bg-[#e57a38] text-white"
          onClick={() => setIsChatOpen(true)}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Contact Tenant
        </Button>
        <Button 
          variant="outline" 
          className="border-[#2e3a8c]/30 text-[#2e3a8c] hover:bg-[#f4eedf]"
          onClick={() => setIsReportOpen(true)}
        >
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
        <Button variant="outline" className="border-[#2e3a8c]/30 text-[#2e3a8c] hover:bg-[#f4eedf]">
          <Edit className="w-4 h-4 mr-2" />
          Update Property
        </Button>
      </motion.div>

      {/* Chat Dialog */}
      <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
        <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col p-0 gap-0" hideCloseButton>
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#2e3a8c] to-[#4a5bb0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white">
                    {tenantData.name}
                  </DialogTitle>
                  <DialogDescription className="text-white/80">
                    Tenant at {property.title}
                  </DialogDescription>
                </div>
              </div>
              <Button
                aria-label="Close chat"
                variant="ghost"
                size="icon"
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 px-6 py-4 bg-[#f4eedf]/20">
            <div className="space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.sender === 'landlord' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${message.sender === 'landlord' ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.sender === 'landlord'
                          ? 'bg-[#2e3a8c] text-white'
                          : 'bg-white border border-[#2e3a8c]/20'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {message.timestamp}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
                className="flex-1 border-[#2e3a8c]/30 focus-visible:ring-[#2e3a8c]"
              />
              <Button
                aria-label="Send message"
                onClick={handleSendMessage}
                className="bg-[#ff914d] hover:bg-[#e57a38] text-white"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0" hideCloseButton>
          <div className="flex flex-col h-[80vh]">
            {/* Report Header - Not Printed */}
            <div className="print:hidden px-6 py-4 border-b bg-gradient-to-r from-[#2e3a8c] to-[#4a5bb0] shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-white">
                    Property Management Report
                  </DialogTitle>
                  <DialogDescription className="text-white/80">
                    Comprehensive report for {property.title}
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrintReport}
                  className="text-white hover:bg-white/20 mr-8"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>

            {/* Report Content - Scrollable */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 print:space-y-4 px-6 py-6">
                {/* Report Header - For Print */}
                <div className="hidden print:block mb-6">
                  <div className="text-center border-b-2 border-[#2e3a8c] pb-4">
                    <h1 className="text-[#2e3a8c]">Property Management Report</h1>
                    <p className="text-muted-foreground mt-2">
                      Generated on {generateReportData().generatedDate}
                    </p>
                  </div>
                </div>

                {/* Property Information */}
                <div className="bg-[#f4eedf]/50 dark:bg-[#2e3a8c]/10 p-4 rounded-lg print:bg-gray-50">
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3">
                    Property Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Property Name</p>
                      <p>{property.title}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Address</p>
                      <p>{property.address}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Monthly Rent</p>
                      <p>{property.rent}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Report Date</p>
                      <p>{generateReportData().generatedDate}</p>
                    </div>
                  </div>
                </div>

                {/* Tenant Information */}
                <div>
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Current Tenant
                  </h3>
                  <div className="border border-[#2e3a8c]/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p>{tenantData.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p>{tenantData.email}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p>{tenantData.phone}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Move-in Date</p>
                        <p>{tenantData.moveInDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Latest Rent Status */}
                <div>
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Latest Rent Payment
                  </h3>
                  <div className="border border-[#2e3a8c]/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-muted-foreground text-sm">Period</p>
                        <p>{rentHistory[0].label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground text-sm">Amount</p>
                        <p>{money(rentHistory[0].amount)}</p>
                      </div>
                      <Badge className={getStatusColor(rentHistory[0].status)}>
                        {STATUS_LABEL[rentHistory[0].status]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Due Date</p>
                        <p>{shortDay(rentHistory[0].dueOn)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paid Date</p>
                        <p>{rentHistory[0].paidAt ? shortDay(rentHistory[0].paidAt) : 'Not yet'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overdue Payments */}
                {generateReportData().overduePayments.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-red-600 dark:text-red-400 mb-3 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Overdue/Late Payments
                      </h3>
                      <div className="space-y-2">
                        {generateReportData().overduePayments.map((payment, index) => (
                          <div 
                            key={index}
                            className="border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p>{payment.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  Due {shortDay(payment.dueOn)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p>{money(payment.amount)}</p>
                                <Badge className={getStatusColor(payment.status)}>
                                  {STATUS_LABEL[payment.status]}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Rent Payment History */}
                <Separator />
                <div>
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Rent Payment History
                  </h3>
                  <div className="border border-[#2e3a8c]/30 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-[#f4eedf]/50 dark:bg-[#2e3a8c]/10">
                        <tr>
                          <th className="text-left p-3">Period</th>
                          <th className="text-left p-3">Amount</th>
                          <th className="text-left p-3">Due Date</th>
                          <th className="text-left p-3">Paid Date</th>
                          <th className="text-left p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rentHistory.map(period => (
                          <tr key={period.key} className="border-t border-[#2e3a8c]/10">
                            <td className="p-3">{period.label}</td>
                            <td className="p-3">{money(period.amount)}</td>
                            <td className="p-3">{shortDay(period.dueOn)}</td>
                            <td className="p-3">{period.paidAt ? shortDay(period.paidAt) : '--'}</td>
                            <td className="p-3">
                              <Badge className={getStatusColor(period.status)}>
                                {STATUS_LABEL[period.status]}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Utility Bills Status */}
                <Separator />
                <div>
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3 flex items-center">
                    <Zap className="w-5 h-5 mr-2" />
                    Utility Bills Overview
                  </h3>
                  <div className="space-y-3">
                    {utilityBills.map((utility, index) => {
                      const UtilityIcon = utility.icon;
                      return (
                        <div 
                          key={index}
                          className={`border rounded-lg p-4 ${
                            utility.status === 'unpaid' || utility.status === 'pending'
                              ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20'
                              : 'border-[#2e3a8c]/30'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-[var(--shadow-xs)] ${
                                utility.status === 'paid' ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'
                              }`}>
                                <UtilityIcon className={`w-5 h-5 ${
                                  utility.status === 'paid' ? 'text-green-600 dark:text-green-300' : 'text-yellow-600 dark:text-yellow-300'
                                }`} />
                              </div>
                              <div>
                                <p>{utility.type}</p>
                                <p className="text-sm text-muted-foreground">{utility.provider}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p>{utility.amount}</p>
                              <Badge className={getStatusColor(utility.status)}>
                                {utility.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                            <div>Usage: {utility.usage}</div>
                            <div className="text-right">Due: {utility.dueDate}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unpaid Utilities Summary */}
                  {generateReportData().unpaidUtilities.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg">
                      <p className="text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        {generateReportData().unpaidUtilities.length} utility bill(s) pending payment
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Total pending: {generateReportData().unpaidUtilities.reduce((sum, u) => 
                          sum + parseInt(u.amount.replace(/[₹,]/g, '')), 0
                        ).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                      </p>
                    </div>
                  )}
                </div>

                {/* General Comments */}
                <Separator />
                <div>
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Recent Communication
                  </h3>
                  <div className="border border-[#2e3a8c]/30 rounded-lg p-4 space-y-3">
                    {messages.slice(-3).map((message) => (
                      <div 
                        key={message.id}
                        className={`p-3 rounded-lg ${
                          message.sender === 'landlord'
                            ? 'bg-[#2e3a8c]/10 dark:bg-[#2e3a8c]/20 ml-8'
                            : 'bg-gray-100 dark:bg-gray-800 mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm">
                            {message.sender === 'landlord' ? 'Landlord' : 'Tenant'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {message.date} at {message.timestamp}
                          </p>
                        </div>
                        <p className="text-sm">{message.text}</p>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No recent communication
                      </p>
                    )}
                  </div>
                </div>

                {/* Report Footer */}
                <div className="mt-8 pt-4 border-t border-[#2e3a8c]/30 text-center text-sm text-muted-foreground">
                  <p>This report was automatically generated on {generateReportData().generatedDate}</p>
                  <p className="mt-1">For any queries, please contact property management.</p>
                </div>
              </div>
            </ScrollArea>

            {/* Action Buttons - Not Printed */}
            <div className="print:hidden px-6 py-4 border-t bg-muted/30 flex justify-end space-x-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsReportOpen(false)}
                className="border-[#2e3a8c]/30"
              >
                Close
              </Button>
              <Button
                onClick={handlePrintReport}
                className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2e3a8c]">Edit Tenant Details</DialogTitle>
            <DialogDescription>
              Update the tenant information for this property.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[#2e3a8c]">
                Full Name
              </Label>
              <Input
                id="edit-name"
                value={editedTenant.name}
                onChange={(e) => setEditedTenant({ ...editedTenant, name: e.target.value })}
                className="border-[#2e3a8c]/30 focus-visible:ring-[#2e3a8c]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone" className="text-[#2e3a8c]">
                Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={editedTenant.phone}
                onChange={(e) => setEditedTenant({ ...editedTenant, phone: e.target.value })}
                className="border-[#2e3a8c]/30 focus-visible:ring-[#2e3a8c]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email" className="text-[#2e3a8c]">
                Email Address
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editedTenant.email}
                onChange={(e) => setEditedTenant({ ...editedTenant, email: e.target.value })}
                className="border-[#2e3a8c]/30 focus-visible:ring-[#2e3a8c]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-moveInDate" className="text-[#2e3a8c]">
                Move-in Date
              </Label>
              <Input
                id="edit-moveInDate"
                value={editedTenant.moveInDate}
                onChange={(e) => setEditedTenant({ ...editedTenant, moveInDate: e.target.value })}
                className="border-[#2e3a8c]/30 focus-visible:ring-[#2e3a8c]"
                placeholder="e.g., March 15, 2024"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="border-[#2e3a8c]/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}