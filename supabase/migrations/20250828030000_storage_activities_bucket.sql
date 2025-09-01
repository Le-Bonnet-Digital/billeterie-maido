-- Create public bucket 'activities' for activity and variant images
insert into storage.buckets (id, name, public)
values ('activities', 'activities', true)
on conflict (id) do nothing;
-- Public read policy for 'activities' bucket
drop policy if exists "Public read activities" on storage.objects;
create policy "Public read activities"
  on storage.objects for select
  using ( bucket_id = 'activities' );
-- Admins write policy for 'activities' bucket
drop policy if exists "Admins write activities" on storage.objects;
create policy "Admins write activities"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'activities'
    and exists (select 1 from users where id = auth.uid() and role = 'admin')
  )
  with check (
    bucket_id = 'activities'
    and exists (select 1 from users where id = auth.uid() and role = 'admin')
  );
