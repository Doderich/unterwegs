/**
 * Confirmation pages are not covered by Booking.com's app-link rules. Offer the general bookings list
 * separately, without forwarding reservation numbers, PINs or other query parameters.
 */
export function bookingListUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'secure.booking.com') return null;
    if (!/^\/(?:confirmation|mybooking)(?:\.[a-z]{2}(?:-[a-z]{2})?)?\.html\/?$/i.test(parsed.pathname)) return null;
    return 'https://www.booking.com/mybookings.html';
  } catch {
    return null;
  }
}
