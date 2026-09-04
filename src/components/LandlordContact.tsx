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
  History,
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
import { toast } from 'sonner';

interface LandlordContactProps {
  userName: string;
  userEmail: string;
  propertyAddress: string;
  initialTab?: 'call' | 'message' | 'history';
  onBack: () => void;
}

interface ContactHistory {
  id: string;
  type: 'call' | 'text';
  message?: string;
  timestamp: string;
  duration?: string;
  status: 'completed' | 'missed' | 'sent' | 'delivered' | 'read';
}

export function LandlordContact({ userName, userEmail, propertyAddress, initialTab, onBack }: LandlordContactProps) {
  const [activeTab, setActiveTab] = useState<'call' | 'message' | 'history'>(initialTab || 'call');
  const [textMessage, setTextMessage] = useState<string>('');
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Mock landlord data
  const landlordData = {
    name: "Sarah Johnson",
    phone: "+91 98765 43210",
    email: "sarah.johnson@properties.com",
    avatar: "SJ",
    availability: "Available",
    lastSeen: "2 minutes ago",
    responseTime: "Usually responds within 30 minutes"
  };

  // Mock contact history
  const [contactHistory, setContactHistory] = useState<ContactHistory[]>([
    {
      id: '1',
      type: 'call',
      timestamp: '2024-11-15 14:30',
      duration: '5:23',
      status: 'completed'
    },
    {
      id: '2',
      type: 'text',
      message: 'Hi Sarah, just wanted to confirm that the maintenance for the kitchen sink is scheduled for tomorrow at 10 AM. Thanks!',
      timestamp: '2024-11-14 16:45',
      status: 'read'
    },
    {
      id: '3',
      type: 'call',
      timestamp: '2024-11-12 10:15',
      duration: '2:15',
      status: 'completed'
    },
    {
      id: '4',
      type: 'text',
      message: 'Thank you for the quick response regarding the AC repair. The technician will be there Monday morning.',
      timestamp: '2024-11-10 09:30',
      status: 'delivered'
    }
  ]);

  const quickMessages = [
    "Hi! I need to discuss something about the property.",
    "Could you please call me when you have a moment?",
    "Thank you for your quick response!",
    "I have a maintenance request to discuss.",
    "When would be a good time to talk?",
    "Everything is going well with the property."
  ];

  React.useEffect(() => {
    let interval: number;
    if (isCallActive) {
      interval = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [isCallActive]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCall = () => {
    setIsCallActive(true);
    setCallDuration(0);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    // Add to history when call ends
    const newCall: ContactHistory = {
      id: Date.now().toString(),
      type: 'call',
      timestamp: new Date().toLocaleString('en-IN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      duration: formatCallDuration(callDuration),
      status: 'completed'
    };
    setContactHistory(prev => [newCall, ...prev]);
    setCallDuration(0);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    
    setIsSendingMessage(true);
    
    // Add to history
    const newMessage: ContactHistory = {
      id: Date.now().toString(),
      type: 'text',
      message: message,
      timestamp: new Date().toLocaleString('en-IN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      status: 'sent'
    };
    
    setContactHistory(prev => [newMessage, ...prev]);
    setTextMessage('');
    
    // Simulate message sending
    window.setTimeout(() => {
      setIsSendingMessage(false);
      // Update status to delivered
      setContactHistory(prev => 
        prev.map(item => 
          item.id === newMessage.id 
            ? { ...item, status: 'delivered' }
            : item
        )
      );
    }, 1000);
  };

  const handleQuickMessage = (message: string) => {
    setTextMessage(message);
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Contact Interface */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Method Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
                      <span className="text-sm" style={{ color: 'var(--tenant-success-dark)' }}>
                        {landlordData.availability}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {landlordData.lastSeen}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex space-x-1 p-1 rounded-lg mt-4" style={{ backgroundColor: 'rgba(74, 189, 172, 0.1)' }}>
                  {[
                    { id: 'call', icon: Phone, label: 'Call' },
                    { id: 'message', icon: MessageSquare, label: 'Text' },
                    { id: 'history', icon: History, label: 'History' }
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <Button
                        key={tab.id}
                        variant={activeTab === tab.id ? "default" : "ghost"}
                        className="flex-1"
                        style={activeTab === tab.id 
                          ? { backgroundColor: 'var(--tenant-primary)', color: 'white' } 
                          : { color: 'var(--tenant-primary)' }
                        }
                        onMouseEnter={(e) => {
                          if (activeTab !== tab.id) {
                            e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.2)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeTab !== tab.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={() => setActiveTab(tab.id as 'call' | 'message' | 'history')}
                      >
                        <IconComponent className="w-4 h-4 mr-2" />
                        {tab.label}
                      </Button>
                    );
                  })}
                </div>
              </CardHeader>

              <CardContent>
                {/* Call Interface */}
                {activeTab === 'call' && (
                  <div className="space-y-6">
                    {!isCallActive ? (
                      <div className="text-center space-y-4">
                        <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--tenant-primary)' }}>
                          <Phone className="w-12 h-12 text-white" />
                        </div>
                        <div>
                          <p className="text-lg mb-2">Ready to call {landlordData.name}</p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {landlordData.phone}
                          </p>
                        </div>
                        <Button
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
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-32 h-32 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--tenant-success)' }}>
                          <Phone className="w-12 h-12 text-white" />
                        </div>
                        <div>
                          <p className="text-lg mb-2">Calling {landlordData.name}...</p>
                          <p className="text-2xl" style={{ color: 'var(--tenant-success-dark)' }}>
                            {formatCallDuration(callDuration)}
                          </p>
                        </div>
                        <Button
                          onClick={handleEndCall}
                          variant="destructive"
                          className="px-8 py-3 text-lg"
                        >
                          End Call
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Text Interface */}
                {activeTab === 'message' && (
                  <div className="space-y-4">
                    {/* Quick Message Templates */}
                    <div>
                      <Label className="text-sm mb-3 block" style={{ color: 'var(--tenant-primary)' }}>
                        Quick Messages
                      </Label>
                      <div className="grid grid-cols-1 gap-2">
                        {quickMessages.map((message, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            className="justify-start text-left h-auto p-3 text-sm border"
                            style={{ borderColor: 'var(--tenant-primary)' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => handleQuickMessage(message)}
                          >
                            {message}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Custom Message */}
                    <div className="space-y-3">
                      <Label htmlFor="message">Custom Message</Label>
                      <Textarea
                        id="message"
                        placeholder="Type your message here..."
                        value={textMessage}
                        onChange={(e) => setTextMessage(e.target.value)}
                        className="min-h-[120px]"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Image className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mic className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button
                          onClick={() => handleSendMessage(textMessage)}
                          disabled={!textMessage.trim() || isSendingMessage}
                          className="text-white"
                          style={{ backgroundColor: 'var(--tenant-primary)' }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.backgroundColor = 'var(--tenant-primary)';
                            }
                          }}
                        >
                          {isSendingMessage ? (
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {textMessage.length}/500 characters
                      </p>
                    </div>
                  </div>
                )}

                {/* History Interface */}
                {activeTab === 'history' && (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      Recent communication history with {landlordData.name}
                    </div>
                    {contactHistory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No contact history yet</p>
                        <p className="text-sm">Start by calling or sending a message</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {contactHistory.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start space-x-3 p-4 rounded-lg border"
                            style={{ backgroundColor: 'rgba(74, 189, 172, 0.05)', borderColor: 'var(--tenant-primary)' }}
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.type === 'call' ? 'var(--tenant-success)' : 'var(--tenant-primary)' }}>
                              {item.type === 'call' ? (
                                <Phone className="w-4 h-4 text-white" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>
                                  {item.type === 'call' ? 'Phone Call' : 'Text Message'}
                                </p>
                                <div className="flex items-center space-x-2">
                                  {item.status === 'completed' && (
                                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--tenant-success)' }} />
                                  )}
                                  {item.status === 'delivered' && (
                                    <CheckCircle className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                                  )}
                                  {item.status === 'read' && (
                                    <div className="flex">
                                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                                      <CheckCircle className="w-4 h-4 -ml-1" style={{ color: 'var(--tenant-primary)' }} />
                                    </div>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {item.timestamp}
                                  </span>
                                </div>
                              </div>
                              {item.message && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  "{item.message}"
                                </p>
                              )}
                              {item.duration && (
                                <p className="text-xs" style={{ color: 'var(--tenant-success-dark)' }}>
                                  Duration: {item.duration}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
                    <p>{landlordData.phone}</p>
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
                <div className="flex items-center space-x-3">
                  <Clock className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                  <div>
                    <p className="text-muted-foreground">Response Time</p>
                    <p>{landlordData.responseTime}</p>
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
            <Card className="border-2" style={{ borderColor: '#fb923c', backgroundColor: 'rgba(251, 146, 60, 0.05)' }}>
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
                  For urgent emergencies like gas leaks, flooding, or security issues, call immediately:
                </p>
                <Button
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700"
                  style={{ borderColor: '#fb923c' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(251, 146, 60, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => toast.info('Calling emergency line (This is a demo)')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Emergency Line
                </Button>
                <p className="text-xs text-muted-foreground">
                  Available 24/7 for urgent matters only
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
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)', backgroundColor: 'rgba(74, 189, 172, 0.05)' }}>
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