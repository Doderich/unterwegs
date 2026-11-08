import { linkPreview, placeFieldsFromPreview, socialKind } from '../linkPreview';

const page = 'https://example.org/places/cafe';

describe('link preview', () => {
  it('reads the title, text and picture a page publishes', () => {
    const html = `
      <meta property="og:title" content="Café &amp; Bar">
      <meta name="twitter:description" content="A small room.">
      <meta content="/photos/front.jpg" property="og:image">
    `;
    expect(linkPreview(html, page)).toEqual({
      title: 'Café & Bar',
      description: 'A small room.',
      imageUrl: 'https://example.org/photos/front.jpg',
    });
  });

  it('keeps a caption and ignores a page that only names the network', () => {
    expect(linkPreview('<meta property="og:title" content="Ramen on Instagram: &quot;late&quot;">', page).title).toBe(
      'Ramen on Instagram: "late"',
    );
    expect(linkPreview('<title>Instagram</title><meta property="og:image" content="https://cdn.example/a.jpg">', page)).toEqual({
      title: null,
      description: null,
      imageUrl: 'https://cdn.example/a.jpg',
    });
    expect(linkPreview('<title>TikTok - Make Your Day</title>', page).title).toBeNull();
  });

  it('refuses a picture that is not an http address', () => {
    expect(linkPreview('<meta property="og:image" content="javascript:alert(1)">', page).imageUrl).toBeNull();
  });
});

describe('a shared social page', () => {
  const cover = 'https://cdn.example/cover.jpg';

  it('tells a post from an account', () => {
    expect(socialKind('https://www.instagram.com/reel/AbCd/?cplk=1')).toBe('post');
    expect(socialKind('https://www.instagram.com/ada/reel/AbCd/')).toBe('post');
    expect(socialKind('https://www.instagram.com/ada/')).toBe('profile');
    expect(socialKind('https://www.youtube.com/watch?v=AbCdEf')).toBe('post');
    expect(socialKind('https://youtu.be/AbCdEf')).toBe('post');
    expect(socialKind('https://www.youtube.com/shorts/AbCdEf')).toBe('post');
    expect(socialKind('https://www.youtube.com/@cafe')).toBe('profile');
    expect(socialKind('https://www.facebook.com/reel/AbCd/')).toBe('post');
    expect(socialKind('https://www.facebook.com/cafe')).toBe('profile');
    expect(socialKind('https://fb.watch/AbCd/')).toBe('post');
    expect(socialKind('https://x.com/ada/status/1')).toBe('post');
    expect(socialKind('https://x.com/ada')).toBe('profile');
    expect(socialKind('https://www.threads.com/@ada/post/AbCd')).toBe('post');
    expect(socialKind('https://www.threads.com/@ada')).toBe('profile');
    expect(socialKind('https://www.tiktok.com/@ada/video/1')).toBe('post');
    expect(socialKind('https://www.tiktok.com/@ada')).toBe('profile');
    expect(socialKind('https://vm.tiktok.com/Zabc/')).toBe('post');
    expect(socialKind('https://bsky.app/profile/ada.example/post/xyz')).toBe('post');
    expect(socialKind('https://bsky.app/profile/ada.example')).toBe('profile');
    expect(socialKind('https://www.linkedin.com/posts/ada_activity')).toBe('post');
    expect(socialKind('https://www.linkedin.com/in/ada/')).toBe('profile');
    expect(socialKind('https://www.pinterest.com/pin/1/')).toBe('post');
    expect(socialKind('https://www.pinterest.com/ada/')).toBe('profile');
    expect(socialKind('https://example.org/cafe')).toBeNull();
  });

  it('keeps a reel caption and picture and leaves the name for a venue', () => {
    expect(
      placeFieldsFromPreview('https://www.instagram.com/reel/AbCd/', {
        title: 'Ada Example on Instagram: "noodles"',
        description: 'noodles - @ada on October 22, 2026',
        imageUrl: cover,
      }),
    ).toEqual({ name: null, description: 'noodles', imageUrl: cover });
  });

  it('uses an account’s display name and picture', () => {
    expect(
      placeFieldsFromPreview('https://www.instagram.com/ada/', {
        title: 'Ada Example (@ada) • Instagram photos and videos',
        description: '10 Followers, 2 Following, 3 Posts',
        imageUrl: cover,
      }),
    ).toEqual({
      name: 'Ada Example',
      description: '10 Followers, 2 Following, 3 Posts',
      imageUrl: cover,
    });
    expect(
      placeFieldsFromPreview('https://www.facebook.com/cafe', {
        title: 'Café Example | Facebook',
        description: 'A room for lunch.',
        imageUrl: cover,
      }).name,
    ).toBe('Café Example');
    expect(
      placeFieldsFromPreview('https://x.com/ada', {
        title: 'Ada Example (@ada) on X',
        description: 'Eating out.',
        imageUrl: cover,
      }).name,
    ).toBe('Ada Example');
    expect(
      placeFieldsFromPreview('https://www.youtube.com/@cafe', {
        title: 'Café Example',
        description: 'A channel.',
        imageUrl: cover,
      }),
    ).toEqual({ name: 'Café Example', description: 'A channel.', imageUrl: cover });
  });

  it('keeps a video title and a status, and still leaves the venue name empty', () => {
    expect(
      placeFieldsFromPreview('https://www.youtube.com/watch?v=AbCdEf', {
        title: 'Me at the zoo',
        description: 'The first video.',
        imageUrl: cover,
      }),
    ).toEqual({ name: null, description: 'Me at the zoo\n\nThe first video.', imageUrl: cover });
    expect(
      placeFieldsFromPreview('https://x.com/ada/status/1', {
        title: 'Ada Example (@ada) on X',
        description: 'noodles nearby',
        imageUrl: cover,
      }),
    ).toEqual({ name: null, description: 'noodles nearby', imageUrl: cover });
    expect(
      placeFieldsFromPreview('https://www.facebook.com/reel/AbCd/', {
        title: '12 views | noodles | Facebook',
        description: 'noodles',
        imageUrl: cover,
      }),
    ).toEqual({ name: null, description: 'noodles', imageUrl: cover });
    expect(
      placeFieldsFromPreview('https://bsky.app/profile/ada.example/post/xyz', {
        title: 'Ada Example (@ada.example)',
        description: 'noodles nearby',
        imageUrl: cover,
      }),
    ).toEqual({ name: null, description: 'noodles nearby', imageUrl: cover });
  });
});
