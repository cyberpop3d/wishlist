-- Run this in Supabase SQL Editor.
-- It keeps the current votes, fixes public insert policy, and rebuilds the live results view.

alter table public.wishlist_votes
  add column if not exists selected_ids text[] not null default '{}',
  add column if not exists selected_titles text[] not null default '{}',
  add column if not exists note text;

alter table public.wishlist_votes enable row level security;

drop policy if exists "Anyone can submit wishlist votes" on public.wishlist_votes;

drop policy if exists "Public wishlist vote insert" on public.wishlist_votes;

create policy "Public wishlist vote insert"
on public.wishlist_votes
for insert
to anon
with check (
  array_length(selected_ids, 1) between 1 and 3
  and array_length(selected_titles, 1) between 1 and 3
);

drop view if exists public.wishlist_vote_counts;

create or replace view public.wishlist_vote_counts as
select
  option_id,
  count(*)::int as votes
from public.wishlist_votes,
unnest(selected_ids) as option_id
group by option_id
order by votes desc;

grant insert on public.wishlist_votes to anon;
grant select on public.wishlist_vote_counts to anon;
