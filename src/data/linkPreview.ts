export type LinkPreview = {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
};

/** A logged-out social page often has only the network's name or slogan. That is not a place name. */
const SHELL_TITLE =
  /^(instagram|facebook|meta|tiktok|twitter|x|x\.com|youtube|threads|pinterest|linkedin|reddit|bluesky|login|log in|sign in|anmelden|tiktok - make your day)$/i;

const EMPTY: LinkPreview = { title: null, description: null, imageUrl: null };

function decode(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return match ? decode(match[2] ?? match[3] ?? '') : null;
}

function meta(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const prop = (attr(tag, 'property') ?? attr(tag, 'name'))?.toLowerCase();
    if (prop === key) return attr(tag, 'content');
  }
  return null;
}

function isShellTitle(value: string): boolean {
  const text = value.replace(/\s+/g, ' ').trim();
  if (SHELL_TITLE.test(text)) return true;
  return /^(threads|instagram|facebook|tiktok|youtube)\s*[•·|]\s*(log in|sign in|anmelden)$/i.test(text);
}

function usableTitle(value: string | null): string | null {
  const text = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!text || isShellTitle(text)) return null;
  return text;
}

function absolute(image: string | null, pageUrl: string): string | null {
  if (!image) return null;
  try {
    const url = new URL(image, pageUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export type PlaceFields = {
  name: string | null;
  description: string | null;
  imageUrl: string | null;
};

function bareHost(hostname: string): string {
  return hostname.replace(/^(www|m|mobile)\./i, '').toLowerCase();
}

function pathParts(url: URL): string[] {
  return url.pathname.split('/').filter(Boolean);
}

function oneOf(parts: string[], reserved: Set<string>): 'profile' | null {
  return parts.length === 1 && !reserved.has(parts[0].replace(/^@/, '').toLowerCase()) ? 'profile' : null;
}

/**
 * A post (reel, video, pin, status) or an account, page or channel.
 * Anything else is an ordinary web page, and its title can be the place name.
 */
export function socialKind(pageUrl: string): 'post' | 'profile' | null {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return null;
  }
  const host = bareHost(url.hostname);
  const parts = pathParts(url);
  if (host === 'instagram.com') {
    if (/\/(reel|p|tv|stories|share)\//i.test(url.pathname)) return 'post';
    return oneOf(parts, new Set(['explore', 'accounts', 'stories', 'direct', 'about', 'legal', 'developer', 'emails', 'share', 'reel', 'reels', 'p', 'tv']));
  }
  if (host === 'facebook.com' || host === 'fb.com' || host === 'fb.watch') {
    if (host === 'fb.watch') return parts.length > 0 ? 'post' : null;
    const postRoot = parts[0]?.toLowerCase() ?? '';
    if (['reel', 'reels', 'videos', 'posts', 'photos', 'photo', 'watch', 'share'].includes(postRoot)) return 'post';
    if (/\/(reel|reels|videos|posts|photos|photo|watch|permalink|share)\//i.test(url.pathname)) return 'post';
    if (/^(story|permalink)\.php$/i.test(parts[0] ?? '')) return 'post';
    if (/^profile\.php$/i.test(parts[0] ?? '') || parts[0]?.toLowerCase() === 'people') return 'profile';
    return oneOf(
      parts,
      new Set(['watch', 'reel', 'reels', 'share', 'stories', 'login', 'marketplace', 'gaming', 'groups', 'events', 'help', 'privacy', 'pages', 'friends', 'search', 'hashtag', 'dialog', 'sharer']),
    );
  }
  if (host === 'x.com' || host === 'twitter.com') {
    if (parts.includes('status')) return 'post';
    if (parts.length === 2 && ['media', 'with_replies', 'likes', 'highlights', 'photo'].includes(parts[1].toLowerCase())) return 'profile';
    return oneOf(parts, new Set(['home', 'explore', 'search', 'settings', 'i', 'intent', 'share', 'messages', 'notifications', 'compose', 'login', 'signup', 'hashtag']));
  }
  if (host === 'threads.com' || host === 'threads.net') {
    if (parts.includes('post')) return 'post';
    return oneOf(parts, new Set(['login', 'intent', 'search', 'activity']));
  }
  if (host === 'tiktok.com' || host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    if (host !== 'tiktok.com' || parts.includes('video') || parts.includes('photo') || parts[0]?.toLowerCase() === 't') return 'post';
    return oneOf(parts, new Set(['explore', 'discover', 'tag', 'music', 'search', 'live', 'following', 'foryou', 'legal', 'about', 'login', 'embed']));
  }
  if (host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
    if (host === 'youtu.be') return parts.length === 1 ? 'post' : null;
    if (['watch', 'shorts', 'live', 'embed', 'v', 'clip'].includes(parts[0]?.toLowerCase() ?? '')) return 'post';
    if (parts[0]?.startsWith('@') || ['channel', 'c', 'user'].includes(parts[0]?.toLowerCase() ?? '')) return 'profile';
    return null;
  }
  if (host === 'bsky.app') {
    if (parts[0] === 'profile' && parts[2] === 'post') return 'post';
    if (parts[0] === 'profile' && parts.length === 2) return 'profile';
    return null;
  }
  if (host === 'pinterest.com' || host === 'pin.it') {
    if (host === 'pin.it' || parts[0]?.toLowerCase() === 'pin') return 'post';
    return oneOf(parts, new Set(['pin', 'ideas', 'search', 'today', 'settings', 'login', 'business', 'topics']));
  }
  if (host === 'linkedin.com') {
    if (['posts', 'feed', 'pulse'].includes(parts[0]?.toLowerCase() ?? '')) return 'post';
    if (['in', 'company', 'school', 'showcase'].includes(parts[0]?.toLowerCase() ?? '')) return 'profile';
    return null;
  }
  if (host === 'reddit.com') {
    if (parts.includes('comments')) return 'post';
    if ((parts[0] === 'user' || parts[0] === 'u') && parts.length >= 2) return 'profile';
    return null;
  }
  return null;
}

const AUTHOR_TITLE =
  /\(@[\w.-]+\)|\bon\s+(?:Instagram|TikTok|X|Twitter|Threads|Facebook|YouTube|Bluesky|LinkedIn|Pinterest)\b|\s[|•·/]\s*(?:Instagram|TikTok|X|Twitter|Threads|Facebook|YouTube|Bluesky|LinkedIn|Pinterest)(?:\s.*)?$/i;

/** A post's text. An author headline is not the caption; a video title is. */
function postCaption(preview: LinkPreview): string | null {
  const description = preview.description?.replace(/\s+-\s+@[\w.]+ on .+$/i, '').trim() || null;
  const title = preview.title?.replace(/\s+[-–]\s*YouTube$/i, '').trim() || null;
  const quoted = title?.match(/\bon\s+(?:Instagram|TikTok|X|Twitter|Threads|Facebook|YouTube|Bluesky|LinkedIn):\s*"([\s\S]*)"\s*$/i)?.[1]?.trim();
  if (title && !AUTHOR_TITLE.test(title)) {
    if (description && description !== title) return `${title}\n\n${description}`;
    return title;
  }
  if (description && !isShellTitle(description)) return description;
  return quoted || null;
}

function profileName(title: string | null): string | null {
  let text = title?.replace(/\s+/g, ' ').trim() ?? '';
  if (!text || isShellTitle(text)) return null;
  text = text.replace(/\s+[|•·/]\s+.*$/, '').trim();
  text = text.replace(/\s+on\s+(?:X|Twitter|Instagram|TikTok|Threads|Facebook|YouTube|Bluesky|LinkedIn|Pinterest)\s*$/i, '').trim();
  text = text.split(/\s+\(/)[0]?.trim() ?? '';
  text = text.replace(/\s+@[\w.]+$/, '').trim();
  if (!text || isShellTitle(text)) return null;
  return text;
}

/**
 * What a shared page should write onto a new place. A post keeps its caption and picture and leaves the name
 * empty, because the headline is the author or the clip, not a venue. An account, page or channel uses its
 * display name and picture. An ordinary page uses its title as the name.
 */
export function placeFieldsFromPreview(pageUrl: string, preview: LinkPreview): PlaceFields {
  const kind = socialKind(pageUrl);
  if (kind === 'post') return { name: null, description: postCaption(preview), imageUrl: preview.imageUrl };
  if (kind === 'profile') return { name: profileName(preview.title), description: preview.description, imageUrl: preview.imageUrl };
  return { name: preview.title, description: preview.description, imageUrl: preview.imageUrl };
}

const TRACKING_QUERY = new Set([
  'fbclid',
  'igshid',
  'igsh',
  'si',
  'mibextid',
  'ref_src',
  'ref_url',
  'cplk',
  'feature',
  'cbrd',
  'ucbcb',
  'pp',
  '_r',
  '_t',
  'is_from_webapp',
  'sender_device',
  'sender_web_id',
]);

/** Drops tracking from a shared social link. A YouTube `v` and any ordinary page query stay. */
export function cleanSharedLink(url: URL): void {
  const host = bareHost(url.hostname);
  if (host === 'instagram.com' || host === 'threads.com' || host === 'threads.net') {
    url.search = '';
    return;
  }
  if (!socialKind(url.href)) return;
  for (const key of [...url.searchParams.keys()]) {
    const name = key.toLowerCase();
    const xTracking = (host === 'x.com' || host === 'twitter.com') && (name === 's' || name === 't');
    if (TRACKING_QUERY.has(name) || name.startsWith('utm_') || xTracking) url.searchParams.delete(key);
  }
}

/**
 * Name, text and picture published by a page (Open Graph, then a Twitter card, then `<title>`).
 * A page that only names the network itself yields an empty preview; the link can still be stored.
 */
export function linkPreview(html: string, pageUrl: string): LinkPreview {
  const title = usableTitle(
    meta(html, 'og:title') ?? meta(html, 'twitter:title') ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? null,
  );
  const description = meta(html, 'og:description') ?? meta(html, 'twitter:description');
  const imageUrl = absolute(meta(html, 'og:image') ?? meta(html, 'twitter:image'), pageUrl);
  return {
    title,
    description: description?.replace(/\s+/g, ' ').trim() || null,
    imageUrl,
  };
}

/** Reads a public page. A direct image address is itself the picture. Unreachable pages return null. */
export async function fetchLinkPreview(pageUrl: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(pageUrl.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  const response = await fetch(url, {
    headers: { Accept: 'text/html,application/xhtml+xml,image/*' },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const type = response.headers.get('content-type') ?? '';
  if (type.startsWith('image/')) return { ...EMPTY, imageUrl: url.href };
  // YouTube publishes its tags after a large preamble, past the first 500k of the page.
  return linkPreview((await response.text()).slice(0, 1_500_000), url.href);
}
