import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  Phone,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  User,
  Mail,
  MapPin,
  Calendar,
  PhoneCall,
  MessageCircle,
  AlertCircle,
  Mic,
  Image,
  Paperclip
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Conversation } from './chat/Conversation';
import { toast } from 'sonner';

interface LandlordContactProps {
  userName: string;
  userEmail: string;
  propertyAddress: string;
  initialTab?: 'call' | 'message' | 'history';
  /** The thread this screen writes to. Null for a guest, or before joining. */
  tenancyId: string | null;
  viewerId: string | null;
  /** The actual owner of the property, from their own profile. */
  landlord: { name: string; phone: string; email: string };
  onBack: () => void;
}

export function LandlordContact({ userName, userEmail, propertyAddress, initialTab, tenancyId, viewerId, landlord, onBack }: LandlordContactProps) {
  const [activeTab, setActiveTab] = useState<'call' | 'message' | 'history'>(initialTab || 'call');

  /**
   * The landlord, as they actually are.
   *
   * This was Sarah Johnson, a phone number nobody owns and an office that does
   * not exist - on the one screen whose entire purpose is reaching a real
   * person. A tenant with a burst pipe would have dialled it.
   *
   * "Available", "2 minutes ago" and a response time are gone rather than
   * rewritten: the app has no presence signal and no way to measure how fast
   * anyone replies, so any value there would be another invention.
   */
  const landlordData = {
    name: landlord.name,
    phone: landlord.phone,
    email: landlord.email,
    avatar: (landlord.name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || '?',
  };
  const hasPhone = Boolean(landlordData.phone && landlordData.phone.trim());

  // Mock contact history


  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Actually dial.
   *
   * This used to start a timer and render a "calling..." screen, under the
   * line "Opens your phone with the number ready" - which it did not.
   * A tel: link hands the number to the phone, which is the only thing a web
   * page can honestly do with it.
   */
  const handleCall = () => {
    if (!hasPhone) return;
    window.location.href = `tel:${landlordData.phone.replace(/[^\d+]/g, '')}`;
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
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex items-center space-x-4 mb-6"
      >
        <Button
          aria-label="Go back"
          variant="ghost"
          onClick={onBack}
          className="p-2 rounded-full"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
        </Button>
        <div>
          <h1 style={{ color: 'var(--tenant-primary)' }}>
            Contact Your Landlord
          </h1>
          <p className="text-muted-foreground">
            Call or message {landlordData.name} directly
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Main Contact Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Method Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as 'call' | 'message' | 'history')
              }
            >
            <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                    <span className="text-white">{landlordData.avatar}</span>
                  </div>
                  <div>
                    <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                      {landlordData.name}
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--tenant-success)' }}></div>
                      <span className="text-sm" style={{ color: 'var(--tenant-success-dark)' }}> Property owner
                      </span>
                      <span className="text-xs text-muted-foreground">
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Tab Navigation - an iOS segmented control (see ui/tabs.tsx). */}
                <TabsList
                  className="w-full mt-4"
                  style={{ backgroundColor: 'rgba(44, 122, 123, 0.1)' }}
                >
                  {[
                    { id: 'call', icon: Phone, label: 'Call' },
                    // No separate history: the thread is the history.
                    { id: 'message', icon: MessageSquare, label: 'Text' },
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="text-[color:var(--tenant-primary)]/70 data-[state=active]:text-[color:var(--tenant-primary)]"
                      >
                        <IconComponent className="w-4 h-4" />
                        {tab.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </CardHeader>

              <CardContent>
                {/* Call Interface */}
                <TabsContent value="call">
                  <div className="space-y-6">
                    {true && (
                      <div className="text-center space-y-4">
                        <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                          <Phone className="w-12 h-12 text-white" />
                        </div>
                        <div>
                          <p className="text-lg mb-2">
                            {hasPhone
                              ? `Ready to call ${landlordData.name}`
                              : `${landlordData.name} has not added a phone number`}
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {hasPhone
                              ? landlordData.phone
                              : 'Send a message instead - it reaches them either way.'}
                          </p>
                        </div>
                        <Button
                          disabled={!hasPhone}
                          onClick={handleCall}
                          className="px-8 py-3 text-lg text-white"
                          style={{ backgroundColor: 'var(--tenant-success)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-success-dark)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-success)'}
                        >
                          <PhoneCall className="w-6 h-6 mr-2" />
                          Call Now
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          This will initiate a call through your device
                        </p>
                      </div>
                    )}
                  </div>

                </TabsContent>

                {/* Text Interface */}
                <TabsContent value="message">
                  {/* The same thread the landlord sees on the property page. */}
                  <div className="flex min-h-[22rem] flex-col">
                    <Conversation
                      tenancyId={tenancyId}
                      viewerId={viewerId}
                      counterparty={landlordData.name}
                      disabled={
                        tenancyId
                          ? undefined
                          : 'Join a tenancy first, and this becomes a line to your landlord.'
                      }
                      emptyHint="No messages yet. Anything you send appears on your landlord's dashboard."
                    />
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
            </Tabs>
          </motion.div>
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
              <CardHeader>
                <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p>{hasPhone ? landlordData.phone : 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p>{landlordData.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                  <div>
                    <p className="text-muted-foreground">Property</p>
                    <p>{propertyAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Emergency Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, #fb923c 30%, transparent)', backgroundColor: 'rgba(251, 146, 60, 0.05)' }}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-lg text-orange-700">
                    Emergency Contact
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-orange-600">
                  A gas leak, a fire or a flood is not something to raise with
                  your landlord first. Call the emergency services.
                </p>
                {/* 112 is India's single emergency number, and it is a real
                    one. What stood here was a button that raised a toast
                    saying it was a demo - on the control somebody would
                    press during a gas leak. */}
                <a
                  href="tel:112"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md border text-orange-700"
                  style={{ borderColor: '#fb923c' }}
                >
                  <Phone className="w-4 h-4" />
                  Call 112
                </a>
                <p className="text-xs text-muted-foreground">
                  Aavas does not route this call, and cannot reach anyone on
                  your behalf. Tell your landlord afterwards using the message
                  box above, so there is a record of it.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Communication Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)', backgroundColor: 'rgba(74, 189, 172, 0.05)' }}>
              <CardHeader>
                <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                  Communication Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Be clear and specific about any issues</p>
                <p>• Include photos for maintenance requests</p>
                <p>• Respect business hours (9 AM - 6 PM)</p>
                <p>• Keep records of all communication</p>
                <p>• Use text for non-urgent matters</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}