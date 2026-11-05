import { File, UploadType } from 'expo-file-system';

/**
 * Sends one local file as `multipart/form-data` and returns the raw answer. Injected into the client so tests can
 * see exactly what goes over the wire.
 */
export type MultipartUpload = (
  url: string,
  request: {
    file: { uri: string; name: string; type: string };
    fieldName: string;
    fields: Record<string, string>;
    headers: Record<string, string>;
  },
) => Promise<{ status: number; body: string }>;

/**
 * The native upload of `expo-file-system`, streamed from disk. Not `fetch` + `FormData`: Expo's `fetch` (the
 * global one since SDK 52's runtime) only takes Blob-like parts and rejects React Native's `{ uri, name, type }`
 * files with "Unsupported FormDataPart implementation".
 */
export const nativeUpload: MultipartUpload = async (url, { file, fieldName, fields, headers }) => {
  const result = await new File(file.uri).upload(url, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName,
    mimeType: file.type,
    parameters: fields,
    headers,
  });
  return { status: result.status, body: result.body };
};
