import { useEffect, useEffectEvent } from 'react';

import { hasSupabase, supabase } from '@/lib/supabase/client';

import type { CommentTarget } from './types';

type CommentRow = { id?: string; author_id?: string };

/**
 * While a comments sheet is open, listens for new comments on its post or ride (Realtime insert
 * on `post_comments` / `ride_comments`, filtered by the id; RLS decides what reaches the viewer,
 * so blocked riders' comments never arrive). Calls `onInsert` with comments by others; the
 * viewer's own come back through `add_comment`. Unsubscribes when the sheet closes.
 */
export function useLiveComments(
  target: CommentTarget | undefined,
  viewerId: string | undefined,
  onInsert: (commentId: string) => void,
) {
  const onRow = useEffectEvent((row: CommentRow) => {
    if (row.id && row.author_id !== viewerId) {
      onInsert(row.id);
    }
  });
  const type = target?.type;
  const id = target?.id;

  useEffect(() => {
    if (!hasSupabase || !type || !id) {
      return;
    }
    const table = type === 'post' ? 'post_comments' : 'ride_comments';
    const column = type === 'post' ? 'post_id' : 'ride_id';
    const channel = supabase
      .channel(`comments:${type}:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `${column}=eq.${id}` },
        (payload) => onRow(payload.new as CommentRow),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [type, id]);
}
