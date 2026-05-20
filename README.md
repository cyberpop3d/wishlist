# Patreon Wishlist Vote

A small React/Vite voting app for Patreon/Wix.

## Supabase table SQL

Run this in Supabase SQL Editor when you want to collect real votes:

```sql
create table if not exists wishlist_votes (
  id uuid primary key default gen_random_uuid(),
  selected_ids text[] not null,
  selected_titles text[] not null,
  note text,
  created_at timestamptz default now()
);

alter table wishlist_votes enable row level security;

create policy "Allow public vote inserts"
on wishlist_votes
for insert
to anon
with check (true);
```

## Vercel environment variables

Add these in Vercel Project Settings > Environment Variables:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

Without these variables, the app still works visually but votes are not saved to Supabase.
