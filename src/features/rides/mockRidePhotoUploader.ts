/**
 * MOCK ride photo upload (until Supabase Storage): ~1.5 s with progress steps; every 4th photo
 * fails once so "Tekrar dene" (08.07 `r75GtO`) can be seen. A retry always succeeds.
 */
let uploadCount = 0;
const STEPS = 6;
const STEP_MS = 250;

export async function uploadRidePhoto(
  _uri: string,
  onProgress: (progress: number) => void,
  isRetry: boolean,
): Promise<void> {
  uploadCount += 1;
  const shouldFail = !isRetry && uploadCount % 4 === 0;
  for (let step = 1; step <= STEPS; step += 1) {
    await new Promise((resolve) => setTimeout(resolve, STEP_MS));
    if (shouldFail && step === Math.ceil(STEPS / 2)) {
      throw new Error('Mock upload failure');
    }
    onProgress(step / STEPS);
  }
}
