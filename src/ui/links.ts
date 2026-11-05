/** A web link (`http`/`https` with a host). Other schemes from server data never open. */
export function isWebLink(url: string): boolean {
  return /^https?:\/\/[^\s/?#]+/i.test(url.trim());
}
