-- PROPOSED ADDITIVE DDL for the approved curated publishing capability.
-- Not a description of the user's existing schema. NOT APPLIED.
-- Inspect the actual schema, grants and staging environment before using this.
-- Fails if this table already exists; do not conceal an unknown schema mismatch.
begin;
create table public.zuri_website_content (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('story','space','person')),
  slug text not null check (char_length(slug) between 1 and 90 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  published_data jsonb check (published_data is null or jsonb_typeof(published_data) = 'object'),
  consent_verified boolean not null default false,
  consent_reference text not null default '' check (char_length(consent_reference) <= 1000),
  revision integer not null default 1 check (revision >= 1),
  published_revision integer check (published_revision >= 1 and published_revision <= revision),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  unique(kind,slug),
  check(kind <> 'space' or slug not in ('tech','select','pamoja','search','about','admin','api','contact','brands','_next','_not-found','auth','login','logout','signin','signup','account','settings','dashboard','claim','requests','moments','privacy','terms','zuri','robots','sitemap','favicon')),
  check (status <> 'published' or (published_data is not null and published_revision is not null and published_at is not null)),
  check (status <> 'published' or kind = 'story' or (consent_verified and char_length(trim(consent_reference)) > 0)),
  check (status = 'published' or published_data is null)
);
create index zuri_website_content_public on public.zuri_website_content(kind,published_at desc) where status='published';
create index zuri_website_content_admin on public.zuri_website_content(kind,updated_at desc);
alter table public.zuri_website_content enable row level security;
-- Server admin APIs use the existing service key only after getUser/admin_users.
-- Browser roles have no mutation privilege and cannot read drafts/private fields.
revoke all on public.zuri_website_content from anon, authenticated;
grant select (kind,slug,status,published_data,published_at) on public.zuri_website_content to anon,authenticated;
grant all on public.zuri_website_content to service_role;
create policy curated_public_snapshot on public.zuri_website_content for select to anon,authenticated
using (status='published' and published_data is not null and (kind='story' or consent_verified));
comment on table public.zuri_website_content is 'Website editorial representations only. No claimed user identity or Member status. Private drafts and consent evidence are never public projections.';
commit;
