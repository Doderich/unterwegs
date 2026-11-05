import { bookingListUrl } from '../bookingLinks';

it.each([
  'https://secure.booking.com/confirmation.html?bn=123456&pin=9876#details',
  'https://secure.booking.com/confirmation.de.html?token=private',
  'https://secure.booking.com/mybooking.en-gb.html',
])('offers a credential-free bookings list beside %s', (url) => {
  expect(bookingListUrl(url)).toBe('https://www.booking.com/mybookings.html');
});

it.each([
  'https://www.booking.com/hotel/jp/example.html',
  'https://secure.booking.com/hotel/jp/example.html',
  'https://secure.booking.com/mybookings.html',
  'https://secure.booking.com/myreservations',
  'https://secure.booking.com.example.org/confirmation.html',
  'https://secure.booking.com@example.org/confirmation.html',
  'https://www.airbnb.com/rooms/123',
  'booking://hotel/123',
  'not a url',
])('does not add a shortcut to %s', (url) => {
  expect(bookingListUrl(url)).toBeNull();
});
