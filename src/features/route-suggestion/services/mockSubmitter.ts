import type { SubmissionProgress, SubmissionStep } from '../types';
import { SubmissionError, type RouteSuggestionSubmitter } from './types';

/**
 * MOCK submitter. `EXPO_PUBLIC_MOCK_SUBMISSION=fail` makes sending stop at the photo upload
 * with "Sunucuya ulaşılamıyor · RT-503" (04.6); anything else succeeds (04.5).
 */
const shouldFail = process.env.EXPO_PUBLIC_MOCK_SUBMISSION === 'fail';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockSubmitter: RouteSuggestionSubmitter = {
  async submit(draft, onProgress) {
    const totalPhotos = draft.photos.length;
    const report = (step: SubmissionStep, fraction: number, uploadedPhotos = 0) =>
      onProgress({ step, fraction, uploadedPhotos, totalPhotos } satisfies SubmissionProgress);

    report('validateLine', 0.1);
    await wait(700);
    report('uploadDetails', 0.3);
    await wait(700);
    for (let uploaded = 0; uploaded <= totalPhotos; uploaded += 1) {
      report('uploadPhotos', 0.3 + (0.6 * uploaded) / Math.max(totalPhotos, 1), uploaded);
      if (shouldFail && uploaded === Math.floor(totalPhotos / 2)) {
        await wait(600);
        throw new SubmissionError('RT-503', 'network');
      }
      await wait(500);
    }
    report('sendToReview', 0.95, totalPhotos);
    await wait(700);
    return {
      trackingId: `RLT-${Math.floor(10000 + Math.random() * 89999)}`,
      submittedAt: new Date().toISOString(),
    };
  },
};
