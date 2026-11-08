import { isTrailLink, trailHref } from '../trails';

describe('trail links', () => {
  it('accepts an http link and refuses anything else', () => {
    expect(isTrailLink(' https://example.org/path ')).toBe(true);
    expect(isTrailLink('ftp://example.org')).toBe(false);
    expect(isTrailLink('not a link')).toBe(false);
  });

  it('opens the trail link, or the Wanderer link when the trail has none', () => {
    expect(trailHref({ link: 'https://example.org', wanderer_link: 'https://wanderer.example' })).toBe(
      'https://example.org',
    );
    expect(trailHref({ link: null, wanderer_link: 'https://wanderer.example' })).toBe('https://wanderer.example');
    expect(trailHref({ link: null, wanderer_link: null })).toBeNull();
  });
});
