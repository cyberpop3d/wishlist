# Patreon Live Wishlist Vote

A small Vite/React app for wishlist voting and live result display.

Pages:
- Vote page: `/`
- Live results page: `/?results=1`
- Wix/embed-friendly live results page: `/?results=1&embed=1`
- Debug mode: add `&debug=1`

Before publishing, run `sql/final-policy.sql` in Supabase SQL Editor to ensure the insert policy and results view are correct.


Update: The embedded results page now includes a matching VOTE NOW button inside the Vercel UI, so Wix does not need a separate button.
