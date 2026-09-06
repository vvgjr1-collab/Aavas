import React, { useRef, useState } from 'react';
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
import { useAppState } from '../context/AppState';
import { PropertyEditor } from './landlord/PropertyEditor';
import { EndNotice } from './tenancy/EndNotice';
import { usePayments } from '../hooks/usePayments';
import { useMembers } from '../hooks/useMembers';
import { rentHistory as rentPeriods, type RentPeriod } from '../lib/rent';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import type { PropertyData } from '../types/property';

const money = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const shortDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const longDay = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not recorded';

/** A pending lease is not an active one, and the badge should not imply otherwise. */
const LEASE_LABEL: Record<string, string> = {
  active: 'Active lease',
  pending: 'Awaiting a tenant',
  ended: 'Ended',
  rejected: 'Rejected',
};

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
  const { tenancies, properties, refresh } = useTenancy();
  const { userId } = useAppState();
  // The row behind the display shape, for the editor to write back to.
  const dbProperty = properties.find(p => p.id === property.id) ?? null;
  // The live tenancy for this property, if there is one.
  const tenancy =
    tenancies.find(
      t => t.property_id === property.id && (t.status === 'active' || t.status === 'pending'),
    ) ?? null;

  const { payments } = usePayments(tenancy?.id);
  const { members } = useMembers(tenancy?.id);

  const [activeTab, setActiveTab] = useState('tenant');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState('');

  // The tenant is whoever joined this lease, read from their own profile.
  // A landlord cannot edit somebody else's account, so the "Edit Details"
  // dialog that used to sit here only ever changed local state and lost it on
  // reload - an invitation to record something that was never saved.
  const tenant = members[0] ?? null;

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

  /**
   * Print the report, and only the report.
   *
   * window.print() prints the document, which is why this used to come out
   * as a picture of the screen: the dashboard behind the dialog, the dimmed
   * overlay over it, and the report clipped to whatever fitted in the scroll
   * area. The stylesheet can undo all of that, but only if it can tell which
   * part of the page to keep - and the dialog lives in a portal whose wrapper
   * this component never sees. So walk up from the report to the element that
   * sits directly under <body> and mark that.
   */
  const handlePrintReport = () => {
    const node = reportRef.current;
    if (!node) {
      window.print();
      return;
    }

    let root: HTMLElement = node;
    while (root.parentElement && root.parentElement !== document.body) {
      root = root.parentElement;
    }

    root.classList.add('printing-root');
    document.documentElement.classList.add('printing');

    const restore = () => {
      root.classList.remove('printing-root');
      document.documentElement.classList.remove('printing');
    };
    // afterprint covers both printing and cancelling; the timeout is for the
    // browsers that never fire it.
    window.addEventListener('afterprint', restore, { once: true });
    window.setTimeout(restore, 60000);

    window.print();
  };

  const generateReportData = () => {
    const overduePayments = rentHistory.filter(r => r.status === 'late' || r.status === 'due');
    const latestRent = rentHistory[0];
    
    return {
      property,
      tenant,
      latestRent,
      overduePayments,
      rentHistory,
      utilityBills,
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

  // Four invented bills used to sit here - amounts, providers, meter readings,
  // all of it made up and identical on every property. Nothing in the app reads
  // a utility account, so the honest thing is to say which ones are not
  // connected rather than to show a number somebody might act on.
  const utilityBills = [
    { type: 'Electricity', icon: Zap },
    { type: 'Water', icon: Droplets },
    { type: 'Internet', icon: Wifi },
    { type: 'Gas', icon: Thermometer },
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

      {/* Notice runs both ways: the landlord can give it here, and agrees to
          the tenant's here too, on the property it concerns. */}
      {tenancy && tenancy.status === 'active' && (
        <EndNotice
          tenancy={tenancy}
          viewerId={userId}
          role="landlord"
          counterparty={members[0]?.full_name ?? 'Your tenant'}
          onChanged={refresh}
        />
      )}

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
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-[#2e3a8c] rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-[#2e3a8c] dark:text-[#4a5bb0]">
                      {members.length > 1 ? 'Current Tenants' : 'Current Tenant'}
                    </CardTitle>
                    <CardDescription>
                      {members.length > 0
                        ? 'From their own account, not from your notes'
                        : 'Nobody has joined this lease yet'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Share the code in <span className="font-medium">Who lives here</span> above
                    and whoever uses it will appear here, with the details from their
                    own account.
                  </p>
                ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-2">Personal Information</h3>
                    {members.map(m => (
                      <div key={m.tenant_id} className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{m.full_name}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span className={m.phone ? '' : 'text-muted-foreground'}>
                            {m.phone || 'No number given'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{m.email}</span>
                        </div>
                        {members.length > 1 && <Separator />}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-2">Lease Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span>Moved in: {longDay(tenancy?.start_date ?? members[0]?.joined_at)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span>Monthly Rent: {money(Number(tenancy?.rent) || 0)}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          {tenancy?.status === 'active' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-600" />
                          )}
                          <Badge className={getStatusColor(tenancy?.status === 'active' ? 'paid' : 'pending')}>
                            {LEASE_LABEL[tenancy?.status ?? 'pending']}
                          </Badge>
                        </div>
                        {tenancy?.end_requested_at && (
                          <p className="text-sm text-orange-600 dark:text-orange-400">
                            They have asked to end this tenancy - approve it under
                            &ldquo;Requests to leave&rdquo; on your dashboard.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}
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
            <Card className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/30 dark:border-[#2e3a8c]/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-[#2e3a8c] dark:text-[#4a5bb0] text-lg">
                  No utility accounts connected
                </CardTitle>
                <CardDescription>
                  Aavas cannot read a bill until the account details for this
                  property are connected. Nothing below is an amount owed.
                </CardDescription>
              </CardHeader>
            </Card>

            {utilityBills.map(bill => {
              const IconComponent = bill.icon;
              return (
                <Card key={bill.type} className="shadow-[var(--shadow-md)] border border-[#2e3a8c]/30 dark:border-[#2e3a8c]/50 bg-gradient-to-br from-[#f4eedf]/30 to-white dark:from-[#2e3a8c]/10 dark:to-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-[#2e3a8c] rounded-full flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-[#2e3a8c] dark:text-[#4a5bb0]">{bill.type}</h3>
                          <p className="text-sm text-muted-foreground">
                            Account details yet to be connected
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor('upcoming')}>Not connected</Badge>
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
        <Button
          variant="outline"
          className="border-[#2e3a8c]/30 text-[#2e3a8c] hover:bg-[#f4eedf]"
          disabled={!dbProperty}
          onClick={() => setIsEditorOpen(true)}
        >
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
                    {tenant?.full_name ?? 'No tenant yet'}
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
          <div data-print-column className="flex flex-col h-[80vh]">
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
              <div ref={reportRef} data-print-region className="space-y-6 print:space-y-4 px-6 py-6">
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
                        <p>{tenant?.full_name ?? 'Nobody has joined yet'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p>{tenant?.email || '--'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p>{tenant?.phone || 'No number given'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Move-in Date</p>
                        <p>{longDay(tenancy?.start_date ?? tenant?.joined_at)}</p>
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
                    {utilityBills.map(utility => {
                      const UtilityIcon = utility.icon;
                      return (
                        <div key={utility.type} className="border border-[#2e3a8c]/30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-[var(--shadow-xs)] bg-slate-100 dark:bg-slate-800">
                                <UtilityIcon className="w-5 h-5 text-slate-500" />
                              </div>
                              <div>
                                <p>{utility.type}</p>
                                <p className="text-sm text-muted-foreground">
                                  Account details yet to be connected
                                </p>
                              </div>
                            </div>
                            <Badge className={getStatusColor('upcoming')}>Not connected</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-sm text-muted-foreground">
                    No utility account is connected to this property, so this report
                    carries no utility figures.
                  </p>
                </div>

                {/* The four invented chat messages that used to be printed
                    here described a plumber visit last October that never
                    happened. There is no messaging backend yet, and a report a
                    landlord might hand to a tenant is the last place to
                    fabricate a conversation. */}
                <Separator />
                <div>
                  <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0] mb-3 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Recent Communication
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Messages between you and your tenant are not recorded yet, so
                    this report carries none.
                  </p>
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

      {dbProperty && (
        <PropertyEditor
          open={isEditorOpen}
          onOpenChange={setIsEditorOpen}
          property={dbProperty}
          tenancy={tenancy}
          onSaved={refresh}
        />
      )}
    </motion.div>
  );
}