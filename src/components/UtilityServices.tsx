import React, { useState } from 'react';
import { 
  ArrowLeft,
  Wrench,
  Zap,
  Hammer,
  Bug,
  Droplets,
  Wind,
  Star,
  Clock,
  IndianRupee,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { ServiceProvider } from '../types/service';

interface UtilityServicesProps {
  userName: string;
  onBack: () => void;
  onBookService: (service: ServiceProvider) => void;
}

export function UtilityServices({ userName, onBack, onBookService }: UtilityServicesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const serviceCategories = [
    { id: 'all', title: 'All Services', icon: Wrench, color: '#4abdac' },
    { id: 'plumbing', title: 'Plumbing', icon: Droplets, color: '#06b6d4' },
    { id: 'electrical', title: 'Electrical', icon: Zap, color: '#f6c343' },
    { id: 'carpentry', title: 'Carpentry', icon: Hammer, color: '#fb923c' },
    { id: 'pest', title: 'Pest Control', icon: Bug, color: '#7ad89e' },
    { id: 'hvac', title: 'HVAC', icon: Wind, color: '#a78bfa' }
  ];

  /**
   * The trades a tenant can ask for, not a directory of vendors.
   *
   * This was six invented companies - Quick Fix Plumbing, 4.8 stars, 127
   * reviews, a rate of 500-800 an hour and a phone number nobody owns. A
   * tenant could have rung it. None of them existed, none of the ratings meant
   * anything, and the booking that reached the landlord named a business that
   * was never going to turn up.
   *
   * Aavas has no vendors and no way to rate one. What it does have is a
   * request that reaches the landlord, which is the part that was always real.
   */
  const serviceProviders: ServiceProvider[] = [
    {
      id: 'plumbing',
      name: 'Plumbing',
      category: 'plumbing',
      description:
        'Leaks, blocked drains, taps, water heaters and anything else carrying water.',
      services: ['Leak repair', 'Drain cleaning', 'Tap or mixer', 'Water heater'],
    },
    {
      id: 'electrical',
      name: 'Electrical',
      category: 'electrical',
      description: 'Wiring, sockets, switches, fans, lighting and the meter board.',
      services: ['Wiring fault', 'Socket or switch', 'Lighting', 'Fan'],
    },
    {
      id: 'carpentry',
      name: 'Carpentry',
      category: 'carpentry',
      description: 'Doors, windows, locks, cupboards and fitted furniture.',
      services: ['Door or lock', 'Window', 'Cupboard', 'Fitted furniture'],
    },
    {
      id: 'pest',
      name: 'Pest control',
      category: 'pest',
      description: 'Cockroaches, termites, rodents and mosquito treatment.',
      services: ['Cockroaches', 'Termites', 'Rodents', 'Mosquitoes'],
    },
    {
      id: 'hvac',
      name: 'Air conditioning and ventilation',
      category: 'hvac',
      description: 'Servicing, gas refill, water leaking from a unit, exhaust fans.',
      services: ['AC service', 'Gas refill', 'Leaking unit', 'Exhaust fan'],
    },
    {
      id: 'other',
      name: 'Something else',
      category: 'all',
      description: 'Anything the trades above do not cover. Describe it and it reaches your landlord.',
      services: [],
    },
  ];

  const filteredProviders = selectedCategory === 'all' 
    ? serviceProviders 
    : serviceProviders.filter(provider => provider.category === selectedCategory);

  const getCategoryIcon = (categoryId: string) => {
    const category = serviceCategories.find(cat => cat.id === categoryId);
    return category ? category.icon : Wrench;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = serviceCategories.find(cat => cat.id === categoryId);
    return category ? category.color : '#4abdac';
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-11 sm:h-8"
            onClick={onBack}
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(44, 122, 123, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl" style={{ color: 'var(--tenant-primary)' }}>
              Utility Services
            </h1>
            <p className="text-muted-foreground">
              Book trusted service providers for your home
            </p>
          </div>
        </div>
      </div>

      {/* Service Categories */}
      <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
        <CardHeader>
          <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
            Service Categories
          </CardTitle>
          <CardDescription>
            Select a category to filter available services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {serviceCategories.map((category) => {
              const IconComponent = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <Button
                  key={category.id}
                  variant={isSelected ? "default" : "ghost"}
                  className="h-auto p-4 flex flex-col space-y-2 transition-all duration-200 border"
                  style={isSelected 
                    ? { backgroundColor: 'var(--tenant-primary)', color: 'white', borderColor: 'var(--tenant-primary)' } 
                    : { backgroundColor: 'transparent', borderColor: 'var(--tenant-primary)' }
                  }
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'rgba(44, 122, 123, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="w-8 h-8 rounded-2xl flex items-center justify-center shadow-[var(--shadow-xs)]" style={{ backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : category.color }}>
                    <IconComponent className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-center leading-tight">
                    {category.title}
                  </span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service Providers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl" style={{ color: 'var(--tenant-primary)' }}>
            Available Service Providers
          </h2>
          <Badge variant="secondary" style={{ backgroundColor: 'var(--tenant-accent)', color: 'var(--tenant-primary)' }}>
            {filteredProviders.length} providers found
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filteredProviders.map((provider) => {
            const CategoryIcon = getCategoryIcon(provider.category);
            return (
              <Card key={provider.id} className="shadow-[var(--shadow-md)] lift border transition-all duration-200" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--tenant-primary-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)'}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-[var(--shadow-xs)]" style={{ backgroundColor: getCategoryColor(provider.category) }}>
                        <CategoryIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                          {provider.name}
                        </CardTitle>

                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>

                  {/* A rate, a response time and a phone number stood here.
                      Aavas arranges nothing and knows none of them. */}

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Common jobs:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.services.slice(0, 3).map((service) => (
                        <Badge key={service} variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      ))}
                      {provider.services.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{provider.services.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary)'}
                    onClick={() => onBookService(provider)}
                  >
                    Book Service
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {filteredProviders.length === 0 && (
        <Card className="shadow-[var(--shadow-md)] border" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 22%, transparent)' }}>
          <CardContent className="text-center py-12">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">No providers found</h3>
            <p className="text-muted-foreground mb-4">
              No service providers available for the selected category.
            </p>
            <Button
              variant="outline"
              onClick={() => setSelectedCategory('all')}
              style={{ borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              View All Services
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
