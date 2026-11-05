import { formatDateRange, formatDistance, formatPlainDate, collectionCountdown, wikimediaThumb } from '../format';

it('formats plain dates in de-DE without time-zone shifts', () => {
  expect(formatPlainDate('2026-12-17')).toBe('17.12.2026');
  expect(formatDateRange('2026-12-17', '2027-01-08')).toBe('17.12.2026 – 08.01.2027');
  expect(formatDateRange(null, null)).toBe('');
});

it('counts down to a collection and through it', () => {
  expect(collectionCountdown('2026-12-17', '2027-01-08', '2026-11-03')).toBe('Noch 44 Tage');
  expect(collectionCountdown('2026-12-17', '2027-01-08', '2026-12-16')).toBe('Morgen geht’s los');
  expect(collectionCountdown('2026-12-17', '2027-01-08', '2026-12-17')).toBe('Heute geht’s los · 23 Tage');
  expect(collectionCountdown('2026-12-17', '2027-01-08', '2026-12-19')).toBe('Tag 3 von 23');
});

it('formats distances in metres below a kilometre, else in km', () => {
  expect(formatDistance(0.0432)).toBe('40 m');
  expect(formatDistance(0.996)).toBe('1 km');
  expect(formatDistance(1.25)).toBe('1,3 km');
  expect(formatDistance(12.4)).toBe('12 km');
  expect(formatDistance(null)).toBeNull();
});

describe('wikimediaThumb', () => {
  it('turns an original Wikimedia file into a 400 px preview', () => {
    expect(wikimediaThumb('https://upload.wikimedia.org/wikipedia/commons/a/ab/Kinkaku-ji.jpg')).toBe(
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Kinkaku-ji.jpg/400px-Kinkaku-ji.jpg',
    );
    expect(wikimediaThumb('https://upload.wikimedia.org/wikipedia/de/1/12/Plan.svg')).toBe(
      'https://upload.wikimedia.org/wikipedia/de/thumb/1/12/Plan.svg/400px-Plan.svg.png',
    );
  });

  it('leaves thumbnails and other hosts alone', () => {
    const thumb = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.jpg/640px-X.jpg';
    expect(wikimediaThumb(thumb)).toBe(thumb);
    expect(wikimediaThumb('https://example.org/a/ab/X.jpg')).toBe('https://example.org/a/ab/X.jpg');
  });
});
