import sample from '../../../docs/samples/collection-detail.json';
import { collectionSchema } from '../schemas';

describe('collectionSchema against the real Japan collection sample (v0.13.1)', () => {
  const result = collectionSchema.safeParse(sample);

  it('parses without issues', () => {
    expect(result.error?.issues ?? []).toEqual([]);
  });

  it('keeps everything the app needs from the one-request bundle', () => {
    const collection = result.data!;
    expect(collection.name).toBe('Japan Familienreise');
    expect(collection.itinerary_days).toHaveLength(23);
    expect(collection.itinerary).toHaveLength(40);
    expect(collection.lodging).toHaveLength(7);
    expect(collection.transportations).toHaveLength(10);
    expect(collection.locations).toHaveLength(21);
  });

  it('can resolve every itinerary item from the embedded arrays', () => {
    const collection = result.data!;
    const byType: Record<string, Set<string>> = {
      location: new Set(collection.locations.map((x) => x.id)),
      lodging: new Set(collection.lodging.map((x) => x.id)),
      transportation: new Set(collection.transportations.map((x) => x.id)),
    };
    const unresolved = collection.itinerary.filter((i) => !byType[i.content_type]?.has(i.object_id));
    expect(unresolved).toEqual([]);
  });

  it('has a time zone on every lodging and transport', () => {
    const collection = result.data!;
    expect(collection.lodging.every((l) => l.timezone)).toBe(true);
    expect(collection.transportations.every((t) => t.start_timezone && t.end_timezone)).toBe(true);
  });
});
