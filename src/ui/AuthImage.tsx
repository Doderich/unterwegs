import { Image, type ImageProps } from 'expo-image';

import { mediaRequest } from '@/api/client';
import { useCredentials } from '@/auth/session';
import { localUri } from '@/offline/fileCache';

import { useReduceMotion } from './theme';

/** Image from `/media` (needs the API key). Uses the offline copy when there is one. */
export function AuthImage({ url, ...props }: Omit<ImageProps, 'source'> & { url: string }) {
  const credentials = useCredentials();
  const reduceMotion = useReduceMotion();
  const local = localUri(url);
  const request = mediaRequest(url, credentials);
  const source = local ? { uri: local } : { uri: request.url, headers: request.headers, cacheKey: request.url };
  return <Image source={source} cachePolicy="disk" transition={reduceMotion ? 0 : 150} contentFit="cover" {...props} />;
}
