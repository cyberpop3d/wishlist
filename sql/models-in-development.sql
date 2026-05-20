-- Run this in Supabase SQL Editor.
-- It creates an editable list for the "Models in development" section.
-- You can edit the rows later from Supabase > Table Editor > models_in_development.

create table if not exists public.models_in_development (
  slug text primary key,
  model_name text not null,
  status text not null,
  display_order int not null default 1,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.models_in_development enable row level security;

drop policy if exists "Public can read visible development models" on public.models_in_development;

create policy "Public can read visible development models"
on public.models_in_development
for select
to anon
using (is_visible = true);

insert into public.models_in_development (slug, model_name, status, display_order, is_visible)
values ('sagat', 'SAGAT', 'CORPORATE', 1, true)
on conflict (slug) do update set
  model_name = excluded.model_name,
  status = excluded.status,
  display_order = excluded.display_order,
  is_visible = excluded.is_visible,
  updated_at = now();

grant select on public.models_in_development to anon;
