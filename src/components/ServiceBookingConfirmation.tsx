import React, { useState } from 'react';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  CheckCircle,
  Star,
  IndianRupee
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import type { ServiceProvider } from '../types/service';

interface ServiceBookingConfirmationProps {
  provider: ServiceProvider;
  userName: string;
  userEmail: string;
  propertyAddress: string;
  onBack: () => void;
  onConfirmBooking: () => void;
}

export function ServiceBookingConfirmation({ 
  provider, 
  userName, 
  userEmail, 
  propertyAddress, 
  onBack, 
  onConfirmBooking 
}: ServiceBookingConfirmationProps) {
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isBookingConfirmed, setIsBookingConfirmed] = useState<boolean>(false);

  // Mock available time slots for the next few days
  const timeSlots = [
    { id: '1', date: 'Today', time: '2:00 PM - 4:00 PM', available: true },
    { id: '2', date: 'Today', time: '4:00 PM - 6:00 PM', available: false },
    { id: '3', date: 'Tomorrow', time: '9:00 AM - 11:00 AM', available: true },
    { id: '4', date: 'Tomorrow', time: '1:00 PM - 3:00 PM', available: true },
    { id: '5', date: 'Dec 24', time: '10:00 AM - 12:00 PM', available: true },
    { id: '6', date: 'Dec 24', time: '2:00 PM - 4:00 PM', available: true }
  ];

  const handleConfirmBooking = () => {
    if (selectedTimeSlot && selectedService) {
      setIsBookingConfirmed(true);
      // Simulate a delay for booking processing
      setTimeout(() => {
        onConfirmBooking();
      }, 2000);
    }
  };

  if (isBookingConfirmed) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="shadow-[var(--shadow-md)] border bg-gradient-to-br" style={{ borderColor: 'color-mix(in srgb, var(--tenant-success) 22%, transparent)', backgroundColor: 'rgba(122, 216, 158, 0.1)' }}>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--tenant-success-dark)' }} />
            <h2 className="text-2xl mb-2" style={{ color: 'var(--tenant-success-dark)' }}>
              Booking Confirmed!
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Your service request has been submitted successfully.
            </p>
            
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: 'rgba(122, 216, 158, 0.15)' }}>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service Provider:</span>
                  <span className="text-sm">{provider.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Service:</span>
                  <span className="text-sm">{selectedService}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Time Slot:</span>
                  <span className="text-sm">{timeSlots.find(slot => slot.id === selectedTimeSlot)?.date} {timeSlots.find(slot => slot.id === selectedTimeSlot)?.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Booking ID:</span>
                  <span className="text-sm">#SVC-{Date.now().toString().slice(-6)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                You will receive a confirmation call within {provider.responseTime}.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={onBack}
                  style={{ borderColor: 'var(--tenant-success)', color: 'var(--tenant-success-dark)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(122, 216, 158, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Back to Services
                </Button>
                <Button
                  onClick={onConfirmBooking}
                  className="text-white"
                  style={{ backgroundColor: 'var(--tenant-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary)'}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Services
        </Button>
        <div>
          <h1 className="text-3xl" style={{ color: 'var(--tenant-primary)' }}>
            Book Service
          </h1>
          <p className="text-muted-foreground">
            Confirm your service booking details
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Service Provider Info */}
        <div className="lg:col-span-1">
          <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                Service Provider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg">{provider.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{provider.rating}</span>
                    <span className="text-xs text-muted-foreground">
                      ({provider.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2">
                  <IndianRupee className="w-4 h-4" style={{ color: 'var(--tenant-success-dark)' }} />
                  <span>{provider.price}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                  <span>Response time: {provider.responseTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-purple-600" />
                  <span>{provider.phone}</span>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-xs text-muted-foreground mb-2">Available Services:</p>
                <div className="flex flex-wrap gap-1">
                  {provider.services.map((service) => (
                    <Badge key={service} variant="secondary" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-2">
          <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
            <CardHeader>
              <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                Booking Details
              </CardTitle>
              <CardDescription>
                Select your preferred service and time slot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-3">
                <h4 className="text-sm" style={{ color: 'var(--tenant-primary)' }}>Customer Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{userName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{userEmail}</span>
                  </div>
                </div>
                <div className="flex items-start space-x-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <span>{propertyAddress}</span>
                </div>
              </div>

              <Separator />

              {/* Service Selection */}
              <div className="space-y-3">
                <Label htmlFor="service-select">Select Service *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {provider.services.map((service) => (
                    <Button
                      key={service}
                      variant={selectedService === service ? "default" : "outline"}
                      className="h-auto p-3 text-left"
                      style={selectedService === service 
                        ? { backgroundColor: 'var(--tenant-primary)', color: 'white', borderColor: 'var(--tenant-primary)' } 
                        : { borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }
                      }
                      onMouseEnter={(e) => {
                        if (selectedService !== service) {
                          e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedService !== service) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      onClick={() => setSelectedService(service)}
                    >
                      <span className="text-sm">{service}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Time Slot Selection */}
              <div className="space-y-3">
                <Label htmlFor="time-select">Select Time Slot *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedTimeSlot === slot.id ? "default" : "outline"}
                      disabled={!slot.available}
                      className="h-auto p-3 text-left"
                      style={selectedTimeSlot === slot.id 
                        ? { backgroundColor: 'var(--tenant-primary)', color: 'white', borderColor: 'var(--tenant-primary)' } 
                        : slot.available 
                          ? { borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }
                          : { opacity: 0.5, cursor: 'not-allowed' }
                      }
                      onMouseEnter={(e) => {
                        if (slot.available && selectedTimeSlot !== slot.id) {
                          e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (slot.available && selectedTimeSlot !== slot.id) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                      onClick={() => slot.available && setSelectedTimeSlot(slot.id)}
                    >
                      <div className="space-y-1">
                        <div className="text-sm">{slot.date}</div>
                        <div className="text-xs text-muted-foreground">
                          {slot.time}
                        </div>
                        {!slot.available && (
                          <Badge variant="secondary" className="text-xs">
                            Unavailable
                          </Badge>
                        )}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Additional Information */}
              <div className="space-y-3">
                <Label htmlFor="description">Additional Information (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue or specific requirements..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Confirm Button */}
              <div className="pt-4">
                <Button
                  onClick={handleConfirmBooking}
                  disabled={!selectedTimeSlot || !selectedService}
                  className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--tenant-accent)', color: 'var(--tenant-primary)' }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--tenant-accent-dark)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!e.currentTarget.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--tenant-accent)';
                    }
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Confirm Booking
                </Button>
                {(!selectedTimeSlot || !selectedService) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Please select a service and time slot to continue
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
