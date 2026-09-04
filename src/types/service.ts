/**
 * Shared service-provider type.
 *
 * Previously copy-pasted identically into AuthContainer, UtilityServices and
 * ServiceBookingConfirmation.
 */
export interface ServiceProvider {
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
