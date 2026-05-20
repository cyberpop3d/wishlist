# Patreon Wishlist Vote - Connected Fix

This version does not silently save if Supabase is missing.

## Test

Open your Vercel URL with `?debug=1` at the end.

You should see:

- Supabase URL: found
- Anon key: found
- Client: connected

Then vote and check Supabase > Table Editor > wishlist_votes.

## Required Vercel env variables

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
