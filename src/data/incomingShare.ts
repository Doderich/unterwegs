import type { ResolvedSharePayload } from 'expo-sharing';

import type { UploadFile } from '@/api/client';

export type SharedFile = { key: string; media: 'image' | 'file'; file: UploadFile };

/** Only local files may be uploaded; text and web links are not attachments. */
export function sharedFiles(payloads: ResolvedSharePayload[]): SharedFile[] {
  return payloads.flatMap((p, index) => {
    if (!p.contentUri || !/^(file|content):\/\//i.test(p.contentUri)) return [];
    const type = p.contentMimeType ?? p.mimeType ?? 'application/octet-stream';
    if (p.contentType !== 'image' && type !== 'application/pdf') return [];
    const name = p.originalName?.split(/[\\/]/).pop() || (p.contentType === 'image' ? 'foto.jpg' : 'datei.pdf');
    return [
      {
        key: `${index}:${p.contentUri}`,
        media: p.contentType === 'image' ? ('image' as const) : ('file' as const),
        file: { uri: p.contentUri, name, type },
      },
    ];
  });
}

/** Confirm successes individually so retry never uploads them a second time. */
export async function uploadSharedFiles(
  files: SharedFile[],
  completed: Set<string>,
  upload: (item: SharedFile) => Promise<unknown | null>,
): Promise<boolean> {
  for (const item of files) {
    if (completed.has(item.key)) continue;
    if ((await upload(item)) === null) return false;
    completed.add(item.key);
  }
  return files.length > 0;
}
