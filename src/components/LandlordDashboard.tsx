import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Plus,
  Building2,
  Home,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  Settings,
  TrendingUp,
  Users,
  AlertCircle,
  Check,
  Eye,
  Edit,
  Trash2,
  Star,
  Bed,
  Bath,
  Square,
  Wifi,
  Car,
  Zap,
  Droplets,
  LogOut,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import logoImage from "../assets/5552fb9550c2859aaeadad56af03cd7adcd56e69.png";
import { toPropertyData } from "../types/property";
import type { Property, PropertyData } from "../types/property";

interface LandlordDashboardProps {
  userName: string;
  userEmail: string;
  properties: Property[];
  onNavigateToPropertyListing: () => void;
  onNavigateToPropertyManagement: (property: PropertyData) => void;
  onUpdateProperty: (
    propertyId: string,
    updatedData: Partial<Property>
  ) => void;
  onDeleteProperty: (propertyId: string) => void;
  onBack: () => void;
}

export function LandlordDashboard({
  userName,
  userEmail,
  properties,
  onNavigateToPropertyListing,
  onNavigateToPropertyManagement,
  onUpdateProperty,
  onDeleteProperty,
  onBack,
}: LandlordDashboardProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "occupied" | "vacant" | "maintenance"
  >("all");
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletePropertyId, setDeletePropertyId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Property>>({});

  const filteredProperties = properties.filter(
    (property) => filterStatus === "all" || property.status === filterStatus
  );

  const stats = {
    totalProperties: properties.length,
    occupiedProperties: properties.filter((p) => p.status === "occupied")
      .length,
    vacantProperties: properties.filter((p) => p.status === "vacant").length,
    monthlyRevenue: properties
      .filter((p) => p.status === "occupied")
      .reduce((sum, p) => sum + p.rent, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "occupied":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "vacant":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "maintenance":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "apartment":
        return Building2;
      case "house":
        return Home;
      case "villa":
        return Home;
      case "studio":
        return Building2;
      default:
        return Home;
    }
  };

  const handleEditClick = (property: Property) => {
    setEditingProperty(property);
    setEditFormData({
      title: property.title,
      rent: property.rent,
      deposit: property.deposit,
      status: property.status,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (editingProperty && editFormData) {
      onUpdateProperty(editingProperty.id, editFormData);
      toast.success("Property updated successfully!");
      setIsEditDialogOpen(false);
      setEditingProperty(null);
      setEditFormData({});
    }
  };

  const handleDeleteClick = (propertyId: string) => {
    setDeletePropertyId(propertyId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletePropertyId) {
      onDeleteProperty(deletePropertyId);
      toast.success("Property deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletePropertyId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0"
      >
        <div className="flex items-center space-x-4">
          <Button
            aria-label="Switch role"
            variant="ghost"
            onClick={onBack}
            className="p-2 hover:bg-muted rounded-full"
            title="Switch Role"
          >
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src={logoImage} alt="Aavas" className="h-6" />
              <span className="text-xl text-[#2e3a8c] dark:text-[#4a5bb0] font-aavas">
                Aavas
              </span>
            </div>
            <h1 className="text-[#2e3a8c] dark:text-[#4a5bb0]">
              Property Portfolio
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {userName}! Manage your rental properties
            </p>
          </div>
        </div>
        <Button
          onClick={onNavigateToPropertyListing}
          className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white px-6 py-3"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Property
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="border-2 border-[#2e3a8c]/30 dark:border-[#2e3a8c]">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-[#2e3a8c] rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Properties
                </p>
                <p className="text-2xl text-[#2e3a8c] dark:text-[#4a5bb0]">
                  {stats.totalProperties}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl text-green-700 dark:text-green-300">
                  {stats.occupiedProperties}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vacant</p>
                <p className="text-2xl text-blue-700 dark:text-blue-300">
                  {stats.vacantProperties}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl text-purple-700 dark:text-purple-300">
                  ₹{stats.monthlyRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0"
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All Properties", count: properties.length },
            {
              key: "occupied",
              label: "Occupied",
              count: stats.occupiedProperties,
            },
            { key: "vacant", label: "Vacant", count: stats.vacantProperties },
            {
              key: "maintenance",
              label: "Maintenance",
              count: properties.filter((p) => p.status === "maintenance")
                .length,
            },
          ].map((filter) => (
            <Button
              key={filter.key}
              variant={filterStatus === filter.key ? "default" : "ghost"}
              className={`${
                filterStatus === filter.key
                  ? "bg-[#2e3a8c] hover:bg-[#1f2861] text-white"
                  : "hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30 text-[#2e3a8c] dark:text-[#4a5bb0]"
              }`}
              onClick={() => setFilterStatus(filter.key as any)}
            >
              {filter.label} ({filter.count})
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Properties Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {filteredProperties.map((property, index) => {
          const TypeIcon = getTypeIcon(property.type);
          return (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.5 }}
            >
              <Card className="border-2 border-[#2e3a8c]/30 dark:border-[#2e3a8c] hover:shadow-lg transition-all duration-200 group">
                <div className="relative">
                  <ImageWithFallback
                    src={property.images[0]}
                    alt={property.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge className={getStatusColor(property.status)}>
                      {property.status.charAt(0).toUpperCase() +
                        property.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <Button
                      aria-label={`View ${property.title}`}
                      variant="ghost"
                      size="sm"
                      className="bg-white/90 hover:bg-white text-[#2e3a8c]"
                      onClick={() => handleEditClick(property)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      aria-label={`Edit ${property.title}`}
                      variant="ghost"
                      size="sm"
                      className="bg-white/90 hover:bg-white text-[#2e3a8c]"
                      onClick={() => handleEditClick(property)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      aria-label={`Delete ${property.title}`}
                      variant="ghost"
                      size="sm"
                      className="bg-white/90 hover:bg-white text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(property.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Property Info */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <TypeIcon className="w-5 h-5 text-[#ff914d]" />
                        <h3 className="text-[#2e3a8c] dark:text-[#4a5bb0]">
                          {property.title}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{property.address}</span>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Bed className="w-4 h-4 text-[#ff914d]" />
                          <span>{property.bedrooms}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Bath className="w-4 h-4 text-[#ff914d]" />
                          <span>{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Square className="w-4 h-4 text-[#ff914d]" />
                          <span>{property.area} sq ft</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>{property.rating}</span>
                      </div>
                    </div>

                    {/* Rent Info */}
                    <div className="bg-[#f4eedf] dark:bg-[#2e3a8c]/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Monthly Rent
                          </p>
                          <p className="text-lg text-[#2e3a8c] dark:text-[#4a5bb0]">
                            ₹{property.rent.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Deposit
                          </p>
                          <p className="text-sm">
                            ₹{property.deposit.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tenant Info */}
                    {property.tenant && (
                      <div className="border-t pt-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{property.tenant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Lease: {property.tenant.leaseStart} to{" "}
                              {property.tenant.leaseEnd}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              aria-label={`Call ${property.tenant?.name}`}
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                              onClick={() =>
                                toast.info(
                                  `Calling ${property.tenant?.name} (This is a demo)`
                                )
                              }
                            >
                              <Phone className="w-4 h-4" />
                            </Button>
                            <Button
                              aria-label={`Email ${property.tenant?.name}`}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                              onClick={() =>
                                toast.info(
                                  `Emailing ${property.tenant?.name} (This is a demo)`
                                )
                              }
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amenities */}
                    <div className="border-t pt-4">
                      <div className="flex flex-wrap gap-2">
                        {property.amenities
                          .slice(0, 3)
                          .map((amenity, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="text-xs"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        {property.amenities.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{property.amenities.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="border-t pt-4 flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-[#2e3a8c]/30 dark:border-[#2e3a8c] text-[#2e3a8c] hover:bg-[#f4eedf] dark:hover:bg-[#2e3a8c]/30"
                        onClick={() => onNavigateToPropertyManagement(toPropertyData(property))}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                      {property.status === "vacant" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-[#ff914d] hover:bg-[#e57a38] text-white"
                          onClick={() =>
                            toast.info(
                              `Promoting ${property.title} (This is a demo)`
                            )
                          }
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Promote
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty State */}
      {filteredProperties.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center py-12"
        >
          <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-muted-foreground mb-2">No properties found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filterStatus === "all"
              ? "You haven't added any properties yet. Start by adding your first rental property."
              : `No properties with status "${filterStatus}" found.`}
          </p>
          {filterStatus === "all" && (
            <Button
              onClick={onNavigateToPropertyListing}
              className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Property
            </Button>
          )}
        </motion.div>
      )}

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2e3a8c] dark:text-[#4a5bb0]">
              Edit Property Details
            </DialogTitle>
            <DialogDescription>
              Update the property information. Changes will be reflected
              immediately.
            </DialogDescription>
          </DialogHeader>

          {editingProperty && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Property Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title || ""}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  placeholder="Enter property title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rent">Monthly Rent (₹)</Label>
                  <Input
                    id="edit-rent"
                    type="number"
                    value={editFormData.rent || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        rent: parseInt(e.target.value),
                      })
                    }
                    placeholder="Enter rent amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-deposit">Deposit (₹)</Label>
                  <Input
                    id="edit-deposit"
                    type="number"
                    value={editFormData.deposit || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        deposit: parseInt(e.target.value),
                      })
                    }
                    placeholder="Enter deposit amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                  <Input
                    id="edit-bedrooms"
                    type="number"
                    value={editFormData.bedrooms || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bedrooms: parseInt(e.target.value),
                      })
                    }
                    placeholder="Bedrooms"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                  <Input
                    id="edit-bathrooms"
                    type="number"
                    value={editFormData.bathrooms || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        bathrooms: parseInt(e.target.value),
                      })
                    }
                    placeholder="Bathrooms"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-area">Area (sq ft)</Label>
                  <Input
                    id="edit-area"
                    type="number"
                    value={editFormData.area || ""}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        area: parseInt(e.target.value),
                      })
                    }
                    placeholder="Area"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Property Status</Label>
                <Select
                  value={editFormData.status || "vacant"}
                  onValueChange={(
                    value: "occupied" | "vacant" | "maintenance"
                  ) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="maintenance">
                      Under Maintenance
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="border-[#2e3a8c]/30"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              className="bg-[#2e3a8c] hover:bg-[#1f2861] text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2e3a8c] dark:text-[#4a5bb0]">
              Delete Property
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property? This action cannot
              be undone. All property data, including tenant information and
              history, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Property
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
