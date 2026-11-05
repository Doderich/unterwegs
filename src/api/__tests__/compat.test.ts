import { ApiError, SchemaError } from '../client';
import {
  checkServer,
  clearCompatIssues,
  compatIssues,
  compatReport,
  issuePath,
  UnsupportedServerError,
} from '../compat';
import { isMissingEndpoint, isUnreadable, requestErrorText } from '../errors';
import { collectionSchema } from '../schemas';

beforeEach(() => clearCompatIssues());

describe('lenient lists', () => {
  it('keeps the readable entries of a trip and reports the rest', () => {
    const parsed = collectionSchema.parse({
      id: 'c1',
      name: 'Trip',
      locations: [
        { id: 'l1', name: 'Museum' },
        { id: 'l2', name: 42 },
        { id: 'l3', name: 'Harbour' },
      ],
    });
    expect(parsed.locations.map((l) => l.id)).toEqual(['l1', 'l3']);
    expect(compatIssues()).toEqual([expect.objectContaining({ where: 'locations', kind: 'skipped', count: 1 })]);
    expect(compatIssues()[0].detail).toMatch(/^name: /);
  });

  it('reports nothing when everything fits', () => {
    collectionSchema.parse({ id: 'c1', name: 'Trip', locations: [{ id: 'l1', name: 'Museum' }] });
    expect(compatIssues()).toEqual([]);
  });

  it('adds up repeated problems in one entry', () => {
    for (let i = 0; i < 2; i++) collectionSchema.parse({ id: 'c', name: 'T', lodging: [{ id: 1 }] });
    expect(compatIssues()).toEqual([expect.objectContaining({ where: 'lodging', count: 2 })]);
    expect(compatReport()).toContain('skipped lodging ×2');
  });
});

it('replaces ids in reported paths', () => {
  expect(issuePath('/api/collections/0b5c2d1e-aaaa-4bbb-8ccc-123456789abc/x?page=2')).toBe('/api/collections/{id}/x');
  expect(issuePath('/api/regions/12/cities')).toBe('/api/regions/{id}/cities');
});

describe('checkServer', () => {
  const run = (probe: Parameters<typeof checkServer>[0]) => checkServer(probe, isMissingEndpoint, isUnreadable);
  const fields = ['id', 'name', 'locations', 'lodging', 'transportations', 'notes'];

  it('accepts a server with the fields the app needs', async () => {
    await expect(
      run({ listCollections: async () => [{ id: 'c1' }], collectionFields: async () => fields }),
    ).resolves.toBe(undefined);
  });

  it('accepts a new account without collections', async () => {
    const collectionFields = jest.fn();
    await run({ listCollections: async () => [], collectionFields });
    expect(collectionFields).not.toHaveBeenCalled();
  });

  it('rejects a server whose collections use other field names', async () => {
    const old = ['id', 'name', 'adventures', 'transportations', 'notes'];
    await expect(
      run({ listCollections: async () => [{ id: 'c1' }], collectionFields: async () => old }),
    ).rejects.toEqual(new UnsupportedServerError('/api/collections/{id}: locations, lodging'));
  });

  it('rejects a missing or unreadable collection endpoint', async () => {
    const missing = async () => {
      throw new ApiError('HTTP 404 (/api/collections)', 404, '/api/collections');
    };
    await expect(run({ listCollections: missing, collectionFields: async () => fields })).rejects.toBeInstanceOf(
      UnsupportedServerError,
    );
    const unreadable = async () => {
      throw new SchemaError('/api/collections', []);
    };
    await expect(run({ listCollections: unreadable, collectionFields: async () => fields })).rejects.toBeInstanceOf(
      UnsupportedServerError,
    );
  });

  it('passes network errors through, so the screen says the server is unreachable', async () => {
    const offline = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(run({ listCollections: offline, collectionFields: async () => fields })).rejects.toBeInstanceOf(
      TypeError,
    );
  });
});

describe('requestErrorText', () => {
  it('tells server errors, missing features and unreadable answers apart', () => {
    expect(requestErrorText(new ApiError('HTTP 502 (/api/x)', 502, '/api/x'))).toMatch(/502/);
    expect(requestErrorText(new ApiError('HTTP 405 (/api/x)', 405, '/api/x'), { write: true })).toMatch(/405/);
    expect(requestErrorText(new ApiError('Name is required', 400, '/api/x'))).toBe('Name is required');
    expect(requestErrorText(new SchemaError('/api/x', []))).toMatch(/v0\.13\.1/);
    expect(requestErrorText(new UnsupportedServerError('/api/collections'))).toMatch(/\/api\/collections/);
  });
});
