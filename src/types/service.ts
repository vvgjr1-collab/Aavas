/**
 * Shared service-provider type.
 *
 * Previously copy-pasted identically into AuthContainer, UtilityServices and
 * ServiceBookingConfirmation.
 */
/**
 * A trade a tenant can ask for.
 *
 * Once carried a rating, a review count, an hourly price, a response time and
 * a phone number - none of which the app has any way to know, because it has
 * no vendors. What it does is pass a request to the landlord, so those fields
 * are gone rather than filled with plausible numbers.
 */
export interface ServiceProvider {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Common jobs under this trade, offered as a starting point. */
  services: string[];
}
