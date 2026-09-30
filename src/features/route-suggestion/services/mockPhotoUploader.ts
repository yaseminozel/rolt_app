/**
 * MOCK photo upload (until Supabase Storage). Each photo takes ~1.2 s; every 4th photo added in
 * a session fails once so the "1 fotoğraf yüklenemedi · Tekrar" state (04.2, fGq4D) can be seen.
 */
let uploadCount = 0;

export async function uploadRoutePhoto(_uri: string, isRetry: boolean): Promise<void> {
  uploadCount += 1;
  const shouldFail = !isRetry && uploadCount % 4 === 0;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (shouldFail) {
    throw new Error('Mock upload failure');
  }
}
