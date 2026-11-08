/** A Trail link the server will keep. Wanderer Trails may have no link of their own. */
const TRAIL_LINK = /^https?:\/\/\S+$/i;

export function isTrailLink(link: string): boolean {
  return TRAIL_LINK.test(link.trim());
}

/** What to open: the Trail's own link, otherwise its Wanderer link. */
export function trailHref(trail: { link?: string | null; wanderer_link?: string | null }): string | null {
  return trail.link ?? trail.wanderer_link ?? null;
}
