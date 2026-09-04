import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Clock,
  Upload,
  FileText,
  Wrench,
  Zap,
  Droplets,
  Bug,
  Volume2,
  Shield,
  Home,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';

interface ComplaintRegistrationProps {
  userName: string;
  userEmail: string;
  propertyAddress: string;
  onBack: () => void;
}

interface ComplaintCategory {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

export function ComplaintRegistration({ userName, userEmail, propertyAddress, onBack }: ComplaintRegistrationProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const complaintCategories: ComplaintCategory[] = [
    {
      id: 'maintenance',
      title: 'Maintenance Issues',
      icon: Wrench,
      color: '#4abdac',
      description: 'Repairs, broken fixtures, general maintenance'
    },
    {
      id: 'plumbing',
      title: 'Plumbing',
      icon: Droplets,
      color: '#06b6d4',
      description: 'Leaks, clogs, water pressure issues'
    },
    {
      id: 'electrical',
      title: 'Electrical',
      icon: Zap,
      color: '#f6c343',
      description: 'Power outages, faulty wiring, outlets'
    },
    {
      id: 'pest',
      title: 'Pest Control',
      icon: Bug,
      color: '#7ad89e',
      description: 'Insects, rodents, pest infestations'
    },
    {
      id: 'noise',
      title: 'Noise Complaints',
      icon: Volume2,
      color: '#a78bfa',
      description: 'Loud neighbors, construction noise'
    },
    {
      id: 'security',
      title: 'Security Issues',
      icon: Shield,
      color: '#d9534f',
      description: 'Locks, lighting, safety concerns'
    },
    {
      id: 'structural',
      title: 'Structural',
      icon: Home,
      color: '#fb923c',
      description: 'Walls, floors, windows, doors'
    },
    {
      id: 'other',
      title: 'Other',
      icon: FileText,
      color: '#6b7280',
      description: 'Issues not covered above'
    }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low Priority', color: 'rgba(122, 216, 158, 0.2)', textColor: 'var(--tenant-success-dark)' },
    { value: 'medium', label: 'Medium Priority', color: 'rgba(246, 195, 67, 0.2)', textColor: '#d4a017' },
    { value: 'high', label: 'High Priority', color: 'rgba(251, 146, 60, 0.2)', textColor: '#ea580c' },
    { value: 'urgent', label: 'Urgent', color: 'rgba(217, 83, 79, 0.2)', textColor: 'var(--tenant-error)' }
  ];

  const handleFileUpload = () => {
    // Simulate file upload
    const newFile = `photo_${Date.now()}.jpg`;
    setUploadedFiles([...uploadedFiles, newFile]);
  };

  const handleSubmitComplaint = () => {
    if (selectedCategory && priority && description.trim()) {
      setIsSubmitted(true);
      // Simulate form processing
      window.setTimeout(() => {
        onBack();
      }, 3000);
    }
  };

  const removeFile = (fileToRemove: string) => {
    setUploadedFiles(uploadedFiles.filter(file => file !== fileToRemove));
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mx-auto space-y-6"
      >
        <Card className="border-2 bg-gradient-to-br" style={{ borderColor: 'var(--tenant-success)', backgroundColor: 'rgba(122, 216, 158, 0.1)' }}>
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--tenant-success-dark)' }} />
            <h2 className="text-2xl mb-2" style={{ color: 'var(--tenant-success-dark)' }}>
              Complaint Submitted Successfully!
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Your complaint has been registered and sent to your landlord.
            </p>
            
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: 'rgba(122, 216, 158, 0.15)' }}>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Complaint ID:</span>
                  <span className="text-sm">#COMP-{Date.now().toString().slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <span className="text-sm">{complaintCategories.find(cat => cat.id === selectedCategory)?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Priority:</span>
                  <span className="text-sm">{priorityLevels.find(p => p.value === priority)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="text-sm">Under Review</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                You will receive updates via email and phone within 24 hours.
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard in a few seconds...
              </p>
              <Button
                onClick={onBack}
                className="text-white"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--tenant-primary)'}
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
          className="p-2 rounded-full"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
        </Button>
        <div>
          <h1 style={{ color: 'var(--tenant-primary)' }}>
            Register a Complaint
          </h1>
          <p className="text-muted-foreground">
            Report issues or maintenance requests to your landlord
          </p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Complaint Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
              <CardHeader>
                <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                  Select Complaint Category
                </CardTitle>
                <CardDescription>
                  Choose the category that best describes your issue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {complaintCategories.map((category) => {
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
                            e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)';
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
                {selectedCategory && (
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(74, 189, 172, 0.1)' }}>
                    <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>
                      {complaintCategories.find(cat => cat.id === selectedCategory)?.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Priority and Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
              <CardHeader>
                <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                  Complaint Details
                </CardTitle>
                <CardDescription>
                  Provide detailed information about the issue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Priority Selection */}
                <div className="space-y-3">
                  <Label htmlFor="priority">Priority Level *</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorityLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex items-center space-x-2">
                            <Badge style={{ backgroundColor: level.color, color: level.textColor }}>
                              {level.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Description */}
                <div className="space-y-3">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Please describe the issue in detail. Include when it started, how it affects you, and any steps you've already taken..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {description.length}/500 characters
                  </p>
                </div>

                <Separator />

                {/* File Upload */}
                <div className="space-y-3">
                  <Label>Photo Evidence (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: 'var(--tenant-primary)' }}>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Upload photos to help explain the issue
                    </p>
                    <Button
                      variant="outline"
                      onClick={handleFileUpload}
                      style={{ borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(74, 189, 172, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Choose Files
                    </Button>
                  </div>
                  
                  {uploadedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm" style={{ color: 'var(--tenant-primary)' }}>Uploaded Files:</p>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: 'rgba(74, 189, 172, 0.1)' }}>
                          <span className="text-sm">{file}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(file)}
                            style={{ color: 'var(--tenant-error)' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#b91c1c'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--tenant-error)'}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
              <CardHeader>
                <CardTitle className="text-lg" style={{ color: 'var(--tenant-primary)' }}>
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p>{userName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{userEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Property</p>
                  <p>{propertyAddress}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Emergency Contact */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Card className="border-2" style={{ borderColor: 'var(--tenant-error)', backgroundColor: 'rgba(217, 83, 79, 0.05)' }}>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--tenant-error)' }} />
                  <CardTitle className="text-lg" style={{ color: 'var(--tenant-error)' }}>
                    Emergency?
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm" style={{ color: 'var(--tenant-error)' }}>
                  For urgent issues like gas leaks, flooding, or security emergencies:
                </p>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => toast.info('Calling emergency contact (This is a demo)')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call Emergency Line
                </Button>
                <p className="text-xs text-muted-foreground">
                  Available 24/7 for urgent matters
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Card className="border-2" style={{ borderColor: 'var(--tenant-primary)' }}>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSubmitComplaint}
                  disabled={!selectedCategory || !priority || !description.trim()}
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
                  <FileText className="w-4 h-4 mr-2" />
                  Submit Complaint
                </Button>
                {(!selectedCategory || !priority || !description.trim()) && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Please fill in all required fields
                  </p>
                )}
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <p>• Your landlord will be notified immediately</p>
                  <p>• You'll receive updates via email</p>
                  <p>• Expected response within 24-48 hours</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
