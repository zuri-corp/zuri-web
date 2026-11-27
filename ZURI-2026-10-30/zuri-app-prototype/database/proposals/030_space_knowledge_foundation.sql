-- Foundation for Space knowledge. Apply only after review and deploy consumers separately.
-- Customer-visible and owner-only entries are separate rows, never fields on public entities.
begin;
create table if not exists public.zuri_space_knowledge (
 id uuid primary key default gen_random_uuid(),
 space_id uuid not null references public.zuri_entities(id) on delete cascade,
 audience text not null check (audience in ('customer','owner')),
 category text not null check (category in ('about','catalog','hours','location','policy','faq','operations')),
 title text not null check (length(trim(title)) between 1 and 120),
 body text not null check (length(trim(body)) between 1 and 4000),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists zuri_space_knowledge_space_audience on public.zuri_space_knowledge(space_id,audience,updated_at desc);
alter table public.zuri_space_knowledge enable row level security;
revoke all on public.zuri_space_knowledge from anon, authenticated;
grant select, insert, update, delete on public.zuri_space_knowledge to authenticated;
-- Owner-only writes; public answers require an explicitly public, published Space.
drop policy if exists zuri_space_knowledge_read on public.zuri_space_knowledge;
create policy zuri_space_knowledge_read on public.zuri_space_knowledge for select to authenticated using (
 exists (select 1 from public.zuri_entities e where e.id=space_id and e.kind='space' and
   (e.owner_id=auth.uid() or (audience='customer' and e.visibility='public' and e.status='published')))
);
drop policy if exists zuri_space_knowledge_insert on public.zuri_space_knowledge;
create policy zuri_space_knowledge_insert on public.zuri_space_knowledge for insert to authenticated with check (
 updated_by=auth.uid() and exists (select 1 from public.zuri_entities e where e.id=space_id and e.kind='space' and e.owner_id=auth.uid())
);
drop policy if exists zuri_space_knowledge_update on public.zuri_space_knowledge;
create policy zuri_space_knowledge_update on public.zuri_space_knowledge for update to authenticated using (
 exists (select 1 from public.zuri_entities e where e.id=space_id and e.kind='space' and e.owner_id=auth.uid())
) with check (
 updated_by=auth.uid() and exists (select 1 from public.zuri_entities e where e.id=space_id and e.kind='space' and e.owner_id=auth.uid())
);
drop policy if exists zuri_space_knowledge_delete on public.zuri_space_knowledge;
create policy zuri_space_knowledge_delete on public.zuri_space_knowledge for delete to authenticated using (
 exists (select 1 from public.zuri_entities e where e.id=space_id and e.kind='space' and e.owner_id=auth.uid())
);
notify pgrst,'reload schema';
commit;
