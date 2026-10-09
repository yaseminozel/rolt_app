-- A post's shared ride opens the ride (09.06) only for viewers who may see the ride: the card is
-- a snapshot and follows the post's audience, but `rideId` is left out when the ride itself is
-- private, followers-only for a non-follower, or across a block — so the card isn't a dead link.
-- Same as 0004 otherwise.
create or replace function public.post_json(p public.posts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'author', public.author_json(a),
    'createdAt', p.created_at,
    'text', p.text,
    'ride', p.ride_snapshot,
    'rideId', (
      select r.id from public.rides r
      where r.id = p.ride_id and public.can_view_ride(r.owner_id, r.visibility)
    ),
    'photoPaths', to_jsonb(p.photo_paths),
    'likeCount', p.like_count,
    'commentCount', p.comment_count,
    'isLiked', exists (select 1 from public.post_likes l where l.post_id = p.id and l.user_id = auth.uid()),
    'isFollowingAuthor', p.author_id = auth.uid() or public.follows_accepted(auth.uid(), p.author_id),
    'audience', p.audience
  )
  from public.profiles a
  where a.id = p.author_id
$$;
