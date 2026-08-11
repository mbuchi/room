// imageService.test — behavior-parity checks for the shared-typed-client
// migration (openapi-fetch via @aireon/shared/api). The old hand-rolled
// wrappers hit `https://res.zeroo.ch/image/swissnovo/...` with a per-request
// Zitadel Bearer header; these tests pin the SAME request shape out of the
// typed client: exact URL, HTTP verb, Authorization header, FormData
// passthrough, and the thrown-error surfaces components catch.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { userManager } from '@aireon/shared';
import { RES_API_BASE_URL } from '@aireon/shared/api';
import { deleteImage, listImages, uploadImage } from './imageService';

// Full replacement (no importOriginal): the shared package's main entry pulls
// browser-only modules that must not load in this node-env suite.
vi.mock('@aireon/shared', () => ({
  userManager: { getUser: vi.fn() },
}));

const getUser = vi.mocked(userManager.getUser);

function signIn(token = 'jwt-123'): void {
  getUser.mockResolvedValue({
    expired: false,
    id_token: token,
    access_token: 'opaque-access',
  } as never);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Install a fetch mock and return a getter for the captured Request. */
function mockFetch(response: Response): () => Request {
  let captured: Request | undefined;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    captured = input as Request;
    return response;
  });
  return () => {
    if (!captured) throw new Error('fetch was not called');
    return captured;
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  getUser.mockReset();
});

describe('client base URL', () => {
  it('the shared constant is the production RES host the old wrappers hardcoded', () => {
    expect(RES_API_BASE_URL).toBe('https://res.zeroo.ch');
  });
});

describe('listImages', () => {
  it('GETs /image/swissnovo/list with the Bearer id_token and version header', async () => {
    signIn('tok-abc');
    const req = mockFetch(jsonResponse([]));
    await listImages();
    expect(req().url).toBe(`${RES_API_BASE_URL}/image/swissnovo/list`);
    expect(req().method).toBe('GET');
    expect(req().headers.get('authorization')).toBe('Bearer tok-abc');
    expect(req().headers.get('x-res-api-version')).toBe('2');
  });

  it('appends filters as query params only when set', async () => {
    signIn();
    const req = mockFetch(jsonResponse([]));
    await listImages({ appSource: 'groove' });
    const url = new URL(req().url);
    expect(url.pathname).toBe('/image/swissnovo/list');
    expect(url.searchParams.get('app_source')).toBe('groove');
    expect(url.searchParams.has('prm_id')).toBe(false);
  });

  it('returns the parsed image list on success', async () => {
    signIn();
    mockFetch(jsonResponse([{ id: 'img-1' }]));
    const list = await listImages();
    expect(list).toEqual([{ id: 'img-1' }]);
  });

  it('throws the error body text on non-2xx, like the old wrapper', async () => {
    signIn();
    mockFetch(jsonResponse({ error: 'nope' }, 401));
    await expect(listImages()).rejects.toThrow('{"error":"nope"}');
  });

  it('throws before any request when signed out', async () => {
    getUser.mockResolvedValue(null as never);
    const spy = vi.spyOn(globalThis, 'fetch');
    await expect(listImages()).rejects.toThrow('Not authenticated');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('uploadImage', () => {
  it('POSTs multipart FormData with the Bearer header, untouched by the serializer', async () => {
    signIn('tok-up');
    const req = mockFetch(jsonResponse({ id: 'img-9' }, 201));
    const saved = await uploadImage(new Blob(['png-bytes']), { prmId: 'prm-1' });
    expect(saved).toEqual({ id: 'img-9' });
    expect(req().url).toBe(`${RES_API_BASE_URL}/image/swissnovo/upload`);
    expect(req().method).toBe('POST');
    expect(req().headers.get('authorization')).toBe('Bearer tok-up');
    // FormData passthrough: multipart boundary set by the runtime, not JSON.
    expect(req().headers.get('content-type')).toMatch(/^multipart\/form-data/);
    const fd = await req().formData();
    expect(fd.get('app_source')).toBe('groove');
    expect(fd.get('prm_id')).toBe('prm-1');
    // Cross-realm File wrapping is possible, so no instanceof: assert the
    // binary part survived with its bytes intact.
    const file = fd.get('file') as File;
    expect(file).not.toBeNull();
    expect(file.size).toBe(9);
  });

  it('wraps network failures in the CORS/network hint, like the old wrapper', async () => {
    signIn();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadImage(new Blob(['x']))).rejects.toThrow(
      /Could not reach the image server/,
    );
  });
});

describe('deleteImage', () => {
  it('DELETEs /image/swissnovo/{id} with the Bearer header', async () => {
    signIn('tok-del');
    const req = mockFetch(jsonResponse({ message: 'deleted', id: 'img-3' }));
    await deleteImage('img-3');
    expect(req().url).toBe(`${RES_API_BASE_URL}/image/swissnovo/img-3`);
    expect(req().method).toBe('DELETE');
    expect(req().headers.get('authorization')).toBe('Bearer tok-del');
  });

  it('throws the status-coded message when the body is empty', async () => {
    signIn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    await expect(deleteImage('img-3')).rejects.toThrow('Delete failed: 500');
  });
});
