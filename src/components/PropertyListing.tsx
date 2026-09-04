import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  Home,
  Building2,
  MapPin,
  Camera,
  Upload,
  CheckCircle,
  DollarSign,
  Bed,
  Bath,
  Square,
  Wifi,
  Car,
  Shield,
  Zap,
  Droplets,
  Wind,
  Trees,
  Dumbbell,
  Waves,
  Plus,
  X,
  Star
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';

interface PropertyListingProps {
  userName: string;
  userEmail: string;
  onBack: () => void;
  onAddProperty: (propertyData: PropertyFormData) => void;
}

export interface PropertyFormData {
  title: string;
  description: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  rent: string;
  deposit: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  furnished: string;
  amenities: string[];
  rules: string[];
  images: string[];
}

export function PropertyListing({ userName, userEmail, onBack, onAddProperty }: PropertyListingProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState<PropertyFormData>({
    title: '',
    description: '',
    type: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    rent: '',
    deposit: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    furnished: '',
    amenities: [],
    rules: [],
    images: []
  });

  const propertyTypes = [
    { value: 'apartment', label: '1BHK/2BHK/3BHK Apartment', icon: Building2 },
    { value: 'house', label: 'Independent House', icon: Home },
    { value: 'villa', label: 'Villa', icon: Home },
    { value: 'studio', label: 'Studio Apartment', icon: Building2 },
    { value: 'penthouse', label: 'Penthouse', icon: Building2 }
  ];

  const availableAmenities = [
    { id: 'wifi', label: 'Wi-Fi', icon: Wifi },
    { id: 'parking', label: 'Parking', icon: Car },
    { id: 'security', label: '24/7 Security', icon: Shield },
    { id: 'power_backup', label: 'Power Backup', icon: Zap },
    { id: 'water_supply', label: '24/7 Water Supply', icon: Droplets },
    { id: 'ac', label: 'Air Conditioning', icon: Wind },
    { id: 'garden', label: 'Garden/Balcony', icon: Trees },
    { id: 'gym', label: 'Gym/Fitness Center', icon: Dumbbell },
    { id: 'pool', label: 'Swimming Pool', icon: Waves }
  ];

  const propertyRules = [
    { id: 'no_smoking', label: 'No Smoking' },
    { id: 'no_pets', label: 'No Pets' },
    { id: 'no_parties', label: 'No Loud Parties' },
    { id: 'family_only', label: 'Family Tenants Only' },
    { id: 'professionals_only', label: 'Working Professionals Only' },
    { id: 'students_allowed', label: 'Students Allowed' },
    { id: 'bachelors_allowed', label: 'Bachelors Allowed' }
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
    'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
  ];

  const steps = [
    { number: 1, title: 'Property Details', description: 'Basic information about your property' },
    { number: 2, title: 'Location & Pricing', description: 'Address and rental terms' },
    { number: 3, title: 'Features & Amenities', description: 'Property features and facilities' },
    { number: 4, title: 'Photos & Rules', description: 'Images and tenant guidelines' }
  ];

  const handleInputChange = (field: keyof PropertyFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAmenityToggle = (amenityId: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(id => id !== amenityId)
        : [...prev.amenities, amenityId]
    }));
  };

  const handleRuleToggle = (ruleId: string) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.includes(ruleId)
        ? prev.rules.filter(id => id !== ruleId)
        : [...prev.rules, ruleId]
    }));
  };

  const handleImageUpload = () => {
    // Simulate image upload
    const newImage = `property_${Date.now()}.jpg`;
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, newImage]
    }));
  };

  const removeImage = (imageToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== imageToRemove)
    }));
  };

  const handleSubmit = () => {
    // Add the property to the main list
    onAddProperty(formData);
    setIsSubmitted(true);
    // Simulate form processing
    window.setTimeout(() => {
      onBack();
    }, 3000);
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title && formData.type && formData.description;
      case 2:
        return formData.address && formData.city && formData.state && formData.rent && formData.deposit;
      case 3:
        return formData.bedrooms && formData.bathrooms && formData.area;
      case 4:
        return formData.images.length > 0;
      default:
        return false;
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mx-auto space-y-6"
      >
        <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/30 dark:to-green-900/20">
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl mb-2 text-green-700 dark:text-green-300">
              Property Listed Successfully!
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Your property "{formData.title}" has been added to your portfolio.
            </p>
            
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div className="bg-white/50 dark:bg-green-950/30 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Property ID:</span>
                  <span className="text-sm">#PROP-{Date.now().toString().slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm">{propertyTypes.find(t => t.value === formData.type)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Rent:</span>
                  <span className="text-sm">₹{parseInt(formData.rent || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-sm">Active - Available for Rent</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Your property is now live and visible to potential tenants.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard in a few seconds...
              </p>
              <Button
                onClick={onBack}
                className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white"
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

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
          className="p-2 hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30 rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-[#2e3a8c] dark:text-[#4a5bb0]" />
        </Button>
        <div>
          <h1 className="text-[#2e3a8c] dark:text-[#4a5bb0]">
            Add New Property Listing
          </h1>
          <p className="text-muted-foreground">
            Create a comprehensive listing for your rental property
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Progress Steps */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="border-2 border-[#2e3a8c]/30 dark:border-[#2e3a8c] sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg text-[#2e3a8c] dark:text-[#4a5bb0]">
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      currentStep === step.number 
                        ? 'bg-[#f4eedf] dark:bg-[#2e3a8c]/30 border border-[#2e3a8c]/30 dark:border-[#2e3a8c]' 
                        : currentStep > step.number 
                          ? 'bg-green-50 dark:bg-green-950/30' 
                          : 'bg-gray-50 dark:bg-gray-950/30'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        currentStep === step.number 
                          ? 'bg-[#2e3a8c] text-white' 
                          : currentStep > step.number 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${
                        currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-2 border-[#ff914d]/30 dark:border-[#ff914d]/50">
              <CardHeader>
                <CardTitle className="text-lg text-[#e57a38] dark:text-[#ff914d]">
                  {steps[currentStep - 1].title}
                </CardTitle>
                <CardDescription>
                  {steps[currentStep - 1].description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Property Details */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="title">Property Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Spacious 2BHK Apartment in Sector 18"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Property Type *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {propertyTypes.map((type) => {
                          const IconComponent = type.icon;
                          const isSelected = formData.type === type.value;
                          return (
                            <Button
                              key={type.value}
                              variant={isSelected ? "default" : "ghost"}
                              className={`h-auto p-4 flex items-center space-x-3 justify-start transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-[#ff914d] hover:bg-[#e57a38] text-white' 
                                  : 'hover:bg-[#ff914d]/10 dark:hover:bg-[#ff914d]/20 border border-[#ff914d]/30 dark:border-[#ff914d]/50'
                              }`}
                              onClick={() => handleInputChange('type', type.value)}
                            >
                              <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#ff914d]'}`} />
                              <span className="text-sm">{type.label}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="description">Property Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your property in detail. Include unique features, nearby landmarks, and what makes it special..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.description.length}/500 characters
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Location & Pricing */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="address">Complete Address *</Label>
                      <Textarea
                        id="address"
                        placeholder="House/Flat Number, Building Name, Street, Area"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          placeholder="e.g., Mumbai"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="state">State *</Label>
                        <Select value={formData.state} onValueChange={(value) => handleInputChange('state', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {indianStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="pincode">PIN Code</Label>
                        <Input
                          id="pincode"
                          placeholder="e.g., 400001"
                          value={formData.pincode}
                          onChange={(e) => handleInputChange('pincode', e.target.value)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="rent">Monthly Rent (₹) *</Label>
                        <Input
                          id="rent"
                          type="number"
                          placeholder="e.g., 25000"
                          value={formData.rent}
                          onChange={(e) => handleInputChange('rent', e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="deposit">Security Deposit (₹) *</Label>
                        <Input
                          id="deposit"
                          type="number"
                          placeholder="e.g., 50000"
                          value={formData.deposit}
                          onChange={(e) => handleInputChange('deposit', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Features & Amenities */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="bedrooms">Bedrooms *</Label>
                        <Select value={formData.bedrooms} onValueChange={(value) => handleInputChange('bedrooms', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'Bedroom' : 'Bedrooms'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="bathrooms">Bathrooms *</Label>
                        <Select value={formData.bathrooms} onValueChange={(value) => handleInputChange('bathrooms', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'Bathroom' : 'Bathrooms'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="area">Area (sq ft) *</Label>
                        <Input
                          id="area"
                          type="number"
                          placeholder="e.g., 1200"
                          value={formData.area}
                          onChange={(e) => handleInputChange('area', e.target.value)}
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="furnished">Furnishing</Label>
                        <Select value={formData.furnished} onValueChange={(value) => handleInputChange('furnished', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unfurnished">Unfurnished</SelectItem>
                            <SelectItem value="semi-furnished">Semi-Furnished</SelectItem>
                            <SelectItem value="fully-furnished">Fully Furnished</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Amenities</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {availableAmenities.map((amenity) => {
                          const IconComponent = amenity.icon;
                          const isSelected = formData.amenities.includes(amenity.id);
                          return (
                            <div
                              key={amenity.id}
                              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-[#f4eedf] dark:bg-[#2e3a8c]/30 border-[#2e3a8c]/30 dark:border-[#2e3a8c]' 
                                  : 'hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30 border-gray-200 dark:border-gray-800'
                              }`}
                              onClick={() => handleAmenityToggle(amenity.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleAmenityToggle(amenity.id)}
                              />
                              <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#ff914d]' : 'text-muted-foreground'}`} />
                              <span className={`text-sm ${isSelected ? 'text-[#2e3a8c] dark:text-[#4a5bb0]' : 'text-muted-foreground'}`}>
                                {amenity.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Photos & Rules */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label>Property Photos *</Label>
                      <div className="border-2 border-dashed border-[#2e3a8c]/30 dark:border-[#2e3a8c] rounded-lg p-6 text-center">
                        <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">
                          Upload high-quality photos of your property
                        </p>
                        <Button
                          variant="outline"
                          onClick={handleImageUpload}
                          className="border-[#2e3a8c]/30 dark:border-[#2e3a8c] hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Photos
                        </Button>
                      </div>
                      
                      {formData.images.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-[#2e3a8c] dark:text-[#4a5bb0]">Uploaded Photos:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {formData.images.map((image, index) => (
                              <div key={index} className="relative">
                                <div className="aspect-square bg-[#f4eedf] dark:bg-[#2e3a8c]/30 rounded-lg flex items-center justify-center border border-[#2e3a8c]/30 dark:border-[#2e3a8c]">
                                  <Camera className="w-6 h-6 text-[#ff914d]" />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-[#ff914d] hover:bg-[#e57a38] text-white rounded-full"
                                  onClick={() => removeImage(image)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Property Rules & Preferences</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {propertyRules.map((rule) => {
                          const isSelected = formData.rules.includes(rule.id);
                          return (
                            <div
                              key={rule.id}
                              className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-[#f4eedf] dark:bg-[#2e3a8c]/30 border-[#2e3a8c]/30 dark:border-[#2e3a8c]' 
                                  : 'hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30 border-gray-200 dark:border-gray-800'
                              }`}
                              onClick={() => handleRuleToggle(rule.id)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onChange={() => handleRuleToggle(rule.id)}
                              />
                              <span className={`text-sm ${isSelected ? 'text-[#2e3a8c] dark:text-[#4a5bb0]' : 'text-muted-foreground'}`}>
                                {rule.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6 border-t">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="text-[#2e3a8c] hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white disabled:opacity-50"
                    >
                      Next Step
                      <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmit}
                      disabled={!canProceed()}
                      className="bg-[#ff914d] hover:bg-[#e57a38] text-white disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Publish Property
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}