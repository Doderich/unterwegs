import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';

import { mediaRequest } from '@/api/client';
import { useCredentials } from '@/auth/session';
import { localUri } from '@/offline/fileCache';

import { useReduceMotion } from './theme';

/**
 * Image from `/media` (needs the API key). Uses the offline copy when there is one; when the signed-in server
 * can't serve a media URL from another host, loads the original (`mediaRequest` → `fallback`).
 */
export function AuthImage({ url, onError, ...props }: Omit<ImageProps, 'source'> & { url: string }) {
  const credentials = useCredentials();
  const reduceMotion = useReduceMotion();
  const [failed, setFailed] = useState<string | null>(null);
  const local = localUri(url);
  const request = mediaRequest(url, credentials);
  const useFallback = request.fallback != null && failed === url;
  const source = local
    ? { uri: local }
    : useFallback
      ? { uri: request.fallback!.url, headers: request.fallback!.headers, cacheKey: request.fallback!.url }
      : { uri: request.url, headers: request.headers, cacheKey: request.url };
  return (
    <Image
      source={source}
      cachePolicy="disk"
      transition={reduceMotion ? 0 : 150}
      contentFit="cover"
      onError={(event) => {
        if (!local && request.fallback && !useFallback) setFailed(url);
        else onError?.(event);
      }}
      {...props}
    />
  );
}
