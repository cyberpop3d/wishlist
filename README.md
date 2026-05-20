# Patreon Live Vote - Branded Wix Links

Use this Vercel app inside Wix embeds so public visitors stay on kiarostudio.com links.

Recommended Wix setup:

Live results page embed URL:
https://wishlist-nu-wheat.vercel.app?results=1&embed=1&voteUrl=https%3A%2F%2Fwww.kiarostudio.com%2Fvote

Vote page embed URL:
https://wishlist-nu-wheat.vercel.app?embed=1&resultsUrl=https%3A%2F%2Fwww.kiarostudio.com%2Flive-vote

If your Wix URLs are different, update the encoded voteUrl/resultsUrl values.


## Models in development

Run `sql/models-in-development.sql` in Supabase SQL Editor once.

After that, edit the section from Supabase > Table Editor > models_in_development.

Columns:
- `model_name`: main name, e.g. SAGAT
- `status`: label, e.g. CORPORATE
- `display_order`: lower numbers appear first
- `is_visible`: set false to hide without deleting
