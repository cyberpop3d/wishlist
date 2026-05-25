-- Run this in Supabase SQL Editor.
-- It creates/updates the editable status panel shown under the live vote results.
-- Sections supported by the React app:
--   on-development
--   recently-released

create table if not exists public.models_in_development (
  slug text primary key,
  section text not null default 'on-development',
  model_name text not null,
  status text not null default '',
  display_order int not null default 1,
  is_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.models_in_development
  add column if not exists section text not null default 'on-development';

alter table public.models_in_development
  alter column status set default '';

alter table public.models_in_development enable row level security;

drop policy if exists "Public can read visible development models" on public.models_in_development;

create policy "Public can read visible development models"
on public.models_in_development
for select
to anon
using (is_visible = true);

-- Keep the public panel exact to the current release status.
update public.models_in_development
set is_visible = false, updated_at = now()
where slug not in (
  'liu-kang',
  'sub-zero',
  'sonya-blade',
  'johnny-cage',
  'cammy-sf6',
  'sagat-corporate'
);

insert into public.models_in_development (slug, section, model_name, status, display_order, is_visible)
values
  ('liu-kang', 'on-development', 'LIU KANG', '', 1, true),
  ('sub-zero', 'on-development', 'SUB ZERO', '', 2, true),
  ('sonya-blade', 'recently-released', 'SONYA BLADE', '', 1, true),
  ('johnny-cage', 'recently-released', 'JOHNNY CAGE', '', 2, true),
  ('cammy-sf6', 'recently-released', 'CAMMY', 'SF6', 3, true),
  ('sagat-corporate', 'recently-released', 'SAGAT', 'CORPORATE', 4, true)
on conflict (slug) do update set
  section = excluded.section,
  model_name = excluded.model_name,
  status = excluded.status,
  display_order = excluded.display_order,
  is_visible = excluded.is_visible,
  updated_at = now();

grant select on public.models_in_development to anon;
