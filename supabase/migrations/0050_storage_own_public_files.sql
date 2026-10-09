-- Riders can delete (and upsert) their own files in the public photo buckets. Storage API deletes
-- and upserts first select the object under RLS; without a select policy for these buckets a
-- replaced avatar (and removed ride / post photos) silently stayed in storage. Public URLs are
-- unaffected: `/object/public` and the image transformer don't use RLS.
create policy "read own public files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('avatars', 'ride-photos', 'post-photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
