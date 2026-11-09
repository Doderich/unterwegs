import { Image, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';

import { mediaRequest } from '@/api/client';
import { useCredentials } from '@/auth/session';
import { localUri } from '@/offline/fileCache';
import { cachedImageUri, loadKeyedImage } from '@/offline/imageCache';

import { useReduceMotion } from './theme';

/**
 * Image from `/media` (needs the API key). Uses the offline copy when there is one; when the signed-in server
 * can't serve a media URL from another host, loads the original (`mediaRequest` → `fallback`). Requests that carry
 * the key are downloaded by the app (`imageCache.ts`, the key never follows a redirect to another host); only
 * requests without it go to `expo-image` directly.
 */
export function AuthImage({ url, onError, ...props }: Omit<ImageProps, 'source'> & { url: string }) {
  const credentials = useCredentials();
  const reduceMotion = useReduceMotion();
  const local = localUri(url);
  const request = mediaRequest(url, credentials);
  const chain = request.fallback ? [request, request.fallback] : [request];
  // Which entry of the chain is tried, per url: a new url starts again at the first.
  const [attempt, setAttempt] = useState<{ url: string; index: number }>({ url, index: 0 });
  const index = attempt.url === url ? attempt.index : 0;
  const current = chain[Math.min(index, chain.length - 1)];
  const keyed = !local && !!current.headers;
  const [loaded, setLoaded] = useState<{ url: string; uri: string } | null>(null);

  const fail = (error: string) => {
    if (index + 1 < chain.length) setAttempt({ url, index: index + 1 });
    else onError?.({ error });
  };

  useEffect(() => {
    if (!keyed || !current.headers) return;
    let live = true;
    loadKeyedImage(current.url, current.headers).then(
      (uri) => live && setLoaded({ url: current.url, uri }),
      (e: unknown) => live && fail(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
    // `fail` reads the current chain position; the effect only restarts for another request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyed, current.url]);

  const keyedUri = keyed ? (loaded?.url === current.url ? loaded.uri : cachedImageUri(current.url)) : null;
  const source = local
    ? { uri: local }
    : keyed
      ? keyedUri
        ? { uri: keyedUri }
        : null
      : { uri: current.url, cacheKey: current.url };
  return (
    <Image
      source={source}
      cachePolicy="disk"
      transition={reduceMotion ? 0 : 150}
      contentFit="cover"
      onError={(event) => (local || keyed ? onError?.(event) : fail(event.error))}
      {...props}
    />
  );
}
