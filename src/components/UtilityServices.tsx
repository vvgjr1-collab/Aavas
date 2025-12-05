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

interface UtilityServicesProps {
  userName: string;
  onBack: () => void;
  onBookService: (service: ServiceProvider) => void;
}

interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  price: string;
  responseTime: string;
  phone: string;
  description: string;
  services: string[];
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

  const serviceProviders: ServiceProvider[] = [
    {
      id: '1',
      name: 'Quick Fix Plumbing',
      category: 'plumbing',
      rating: 4.8,
      reviews: 127,
      price: '₹500-800/hr',
      responseTime: '1-2 hours',
      phone: '+91 98765 43210',
      description: 'Emergency plumbing services available 24/7. Specializing in leak repairs and installations.',
      services: ['Leak Repair', 'Pipe Installation', 'Drain Cleaning', 'Water Heater Repair']
    },
    {
      id: '2',
      name: 'Elite Electrical Solutions',
      category: 'electrical',
      rating: 4.9,
      reviews: 89,
      price: '₹600-1000/hr',
      responseTime: '2-4 hours',
      phone: '+91 98765 43211',
      description: 'Licensed electricians with 15+ years experience. All work guaranteed.',
      services: ['Outlet Installation', 'Circuit Breaker Repair', 'Lighting Setup', 'Electrical Inspection']
    },
    {
      id: '3',
      name: 'Master Carpentry Works',
      category: 'carpentry',
      rating: 4.7,
      reviews: 156,
      price: '₹400-700/hr',
      responseTime: '4-6 hours',
      phone: '+91 98765 43212',
      description: 'Custom carpentry and repair services. From furniture to structural work.',
      services: ['Furniture Repair', 'Cabinet Installation', 'Door Repair', 'Custom Shelving']
    },
    {
      id: '4',
      name: 'SafeHome Pest Control',
      category: 'pest',
      rating: 4.6,
      reviews: 203,
      price: '₹800-1500/visit',
      responseTime: 'Same day',
      phone: '+91 98765 43213',
      description: 'Eco-friendly pest control solutions. Safe for families and pets.',
      services: ['Ant Control', 'Rodent Removal', 'Termite Treatment', 'General Extermination']
    },
    {
      id: '5',
      name: 'Pro HVAC Services',
      category: 'hvac',
      rating: 4.8,
      reviews: 94,
      price: '₹650-950/hr',
      responseTime: '2-3 hours',
      phone: '+91 98765 43214',
      description: 'Heating and cooling experts. Emergency services available.',
      services: ['AC Repair', 'Heating Repair', 'Duct Cleaning', 'System Installation']
    },
    {
      id: '6',
      name: 'Reliable Plumbers Plus',
      category: 'plumbing',
      rating: 4.7,
      reviews: 178,
      price: '₹450-750/hr',
      responseTime: '1-3 hours',
      phone: '+91 98765 43215',
      description: 'Full-service plumbing with upfront pricing. No hidden fees.',
      services: ['Emergency Repairs', 'Toilet Repair', 'Faucet Installation', 'Sewer Cleaning']
    }
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
      <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.2)' : category.color }}>
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
              <Card key={provider.id} className="border-2 transition-all duration-200" style={{ borderColor: 'var(--tenant-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--tenant-primary-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--tenant-primary)'}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: getCategoryColor(provider.category) }}>
                        <CategoryIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                          {provider.name}
                        </CardTitle>
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
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {provider.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <IndianRupee className="w-4 h-4" style={{ color: 'var(--tenant-success-dark)' }} />
                      <span>{provider.price}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" style={{ color: 'var(--tenant-primary)' }} />
                      <span>{provider.responseTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-purple-600" />
                      <span>{provider.phone}</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Services offered:</p>
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
                    style={{ backgroundColor: 'var(--tenant-accent)', color: 'var(--tenant-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-accent-dark)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-accent)'}
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
        <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
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
