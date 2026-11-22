-- UNAPPLIED proposal: private staging for profile photos, not a public gallery.
-- Apply through the connected project's normal reviewed migration process.
-- No anonymous upload/read policies are added. The server handles uploads and
-- only an authenticated ZURI administrator can request a short-lived view link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pamoja-intake', 'pamoja-intake', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- If a bucket already exists with this ID, verify that it is private.
-- Application intake fails closed when staging is public or unavailable.
