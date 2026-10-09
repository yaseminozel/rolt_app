// Copies storage objects between buckets for the database (shared secret), e.g. the photos of
// an approved route suggestion from the private `suggestion-photos` to the public `route-photos`.

import { isInternalCall, json, serviceFetch } from '../_shared/env.ts';

type Body = {
  from: { bucket: string; paths: string[] };
  to: { bucket: string; paths: string[] };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST' || !isInternalCall(req)) {
    return json({ error: 'forbidden' }, 403);
  }
  const body = (await req.json()) as Body;
  if (body.from.paths.length !== body.to.paths.length) {
    return json({ error: 'paths differ in length' }, 400);
  }
  const failed: string[] = [];
  for (let index = 0; index < body.from.paths.length; index += 1) {
    const response = await serviceFetch('/storage/v1/object/copy', {
      method: 'POST',
      body: JSON.stringify({
        bucketId: body.from.bucket,
        sourceKey: body.from.paths[index],
        destinationBucket: body.to.bucket,
        destinationKey: body.to.paths[index],
      }),
    });
    if (!response.ok && response.status !== 409) {
      failed.push(`${body.from.paths[index]}: ${response.status} ${await response.text()}`);
    }
  }
  if (failed.length > 0) {
    console.error('copy-photos failed', failed);
  }
  return json({ copied: body.from.paths.length - failed.length, failed: failed.length });
});
