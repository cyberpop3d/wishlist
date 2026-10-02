-- Security hardening applied to wishlist-votes on 2026-10-02.
-- Keeps public reads, routes submissions through a validated RPC, hides raw upvote tokens,
-- rate-limits anonymous mutation RPCs, and removes public dashboard writes.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.wishlist_action_rate_limits (
  scope text not null,
  key_hash text not null,
  bucket timestamptz not null,
  actions integer not null default 0,
  primary key (scope, key_hash, bucket)
);
revoke all on table private.wishlist_action_rate_limits from public, anon, authenticated;

alter table public.wishlist_votes add column if not exists voter_token text;

drop policy if exists "Allow public insert wishlist votes" on public.wishlist_votes;
drop policy if exists "Anyone can submit wishlist votes" on public.wishlist_votes;
drop policy if exists "Public wishlist vote insert" on public.wishlist_votes;
drop policy if exists "Reserve cyberpop3d username" on public.wishlist_votes;
revoke insert, update, delete on table public.wishlist_votes from anon, authenticated;
revoke select on table public.wishlist_votes from anon, authenticated;
grant select (id, created_at, selected_ids, selected_titles, note, username)
  on table public.wishlist_votes to anon, authenticated;

create unique index if not exists wishlist_votes_one_slot_per_voter
  on public.wishlist_votes (voter_token, ((selected_ids)[1]))
  where voter_token is not null;

create or replace function public.submit_wishlist_wishes(p_username text,p_titles text[],p_voter_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  v_username text := btrim(coalesce(p_username, ''));
  v_count integer := cardinality(coalesce(p_titles, '{}'::text[]));
  v_i integer; v_title text; v_headers jsonb := '{}'::jsonb;
  v_headers_text text := current_setting('request.headers', true);
  v_ip text := 'unknown'; v_ip_hash text;
  v_bucket timestamptz := date_trunc('hour', now()); v_actions integer;
begin
  if p_voter_token is null or p_voter_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then raise exception 'Invalid voter token'; end if;
  if char_length(v_username) < 2 or char_length(v_username) > 64
    then raise exception 'Username must be between 2 and 64 characters'; end if;
  if lower(ltrim(v_username, '@')) = 'cyberpop3d' then raise exception 'This username is reserved'; end if;
  if v_count < 1 or v_count > 3 then raise exception 'Choose between 1 and 3 wishes'; end if;
  if v_headers_text is not null and v_headers_text <> '' then
    begin v_headers := v_headers_text::jsonb; exception when others then v_headers := '{}'::jsonb; end;
  end if;
  v_ip := coalesce(nullif(btrim(split_part(coalesce(v_headers->>'x-forwarded-for',''), ',', 1)), ''),
                   nullif(btrim(coalesce(v_headers->>'cf-connecting-ip','')), ''),
                   nullif(btrim(coalesce(v_headers->>'x-real-ip','')), ''), 'unknown');
  v_ip_hash := md5(v_ip || '|wishlist-submit-v1');
  insert into private.wishlist_action_rate_limits(scope,key_hash,bucket,actions)
  values ('submit_ip',v_ip_hash,v_bucket,v_count)
  on conflict(scope,key_hash,bucket) do update set actions=private.wishlist_action_rate_limits.actions+excluded.actions
  returning actions into v_actions;
  if v_actions > 30 then raise exception 'Too many wishlist submissions from this network. Try again later.'; end if;
  for v_i in 1..v_count loop
    v_title := btrim(coalesce(p_titles[v_i], ''));
    if char_length(v_title) < 2 or char_length(v_title) > 120
      then raise exception 'Each wish must be between 2 and 120 characters'; end if;
    insert into public.wishlist_votes(id,selected_ids,selected_titles,note,username,voter_token)
    values (gen_random_uuid(),array['wishlist-24h-2026-09-26:portal-'||v_i::text],array[v_title],'',v_username,p_voter_token);
  end loop;
  return jsonb_build_object('ok',true,'submitted',v_count);
end;
$function$;
revoke all on function public.submit_wishlist_wishes(text,text[],text) from public;
grant execute on function public.submit_wishlist_wishes(text,text[],text) to anon, authenticated;

drop view if exists public.wishlist_vote_counts;
create view public.wishlist_vote_counts with (security_invoker = true) as
select option_id,count(*)::int as votes
from public.wishlist_votes,lateral unnest(selected_ids) as option_id
group by option_id;
grant select on public.wishlist_vote_counts to anon, authenticated;

drop policy if exists "Public can create wishlist upvotes" on public.wishlist_vote_upvotes;
drop policy if exists "Public can read wishlist upvotes" on public.wishlist_vote_upvotes;
revoke insert, update, delete, select on table public.wishlist_vote_upvotes from anon, authenticated;

-- toggle_wishlist_upvote and get_wishlist_upvote_summary definitions are kept in live migration history.
-- See Supabase migration wishlist_security_hardening_20261002 for the deployed definitions.

drop policy if exists "Allow public insert portfolio settings" on public.portfolio_settings;
drop policy if exists "Allow public update portfolio settings" on public.portfolio_settings;
revoke insert, update, delete on table public.portfolio_settings from anon;

-- Public site uses the anon role; signed-in users do not need these RPCs.
revoke execute on function public.submit_wishlist_wishes(text,text[],text) from authenticated;
revoke execute on function public.toggle_wishlist_upvote(uuid,text) from authenticated;
revoke execute on function public.get_wishlist_upvote_summary(text) from authenticated;
