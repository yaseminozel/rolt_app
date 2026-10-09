import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { PhotoViewer } from '@/components/media/PhotoViewer';
import { clearPhotoViewer, peekPhotoViewer } from '@/features/media/photoViewer';

/** Back to whatever opened the viewer (the app's entry when it was opened directly). */
function leave() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

function onClosed() {
  clearPhotoViewer();
  leave();
}

/**
 * Full-screen photos from the route and ride detail strips (user decision 2026-10-09; no
 * design). A transparent modal without a native animation: the viewer fades itself in and out
 * (skipped with reduced motion) and pops once faded. Photos come from `openPhotoViewer`.
 */
export default function PhotoViewerScreen() {
  const [state] = useState(peekPhotoViewer);

  // Nothing to show after a reload or a direct link.
  useEffect(() => {
    if (!state) {
      leave();
    }
  }, [state]);

  if (!state) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <PhotoViewer photos={state.photos} initialIndex={state.index} onClosed={onClosed} />
    </>
  );
}
