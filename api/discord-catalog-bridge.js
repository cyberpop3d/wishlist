import crypto from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const AUTH_HASH = '856c37d530ea26ea4ee78808e9d42d3366e132444f2f00d87badd6276322c421';

function okToken(value = '') {
  const got = crypto.createHash('sha256').update(String(value)).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(AUTH_HASH));
  } catch {
    return false;
  }
}

function send(res, status, body) {
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

async function sb(path, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase env missing');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data;
}

async function status() {
  const [settings, state, models, sue] = await Promise.all([
    sb('cp_discord_settings?enabled=eq.true&select=guild_id,cults_backfill_after,cults_library_enabled,cults_sync_minutes,cults_library_forum_id&limit=1'),
    sb('cp_cults_sync_state?select=source,last_success_at,last_error,last_probe,updated_at&order=updated_at.desc&limit=2'),
    sb('cp_cults_models?active=eq.true&is_multipart_no_ams=eq.true&select=cults_key,title,published_at,collection_month,image_url,discord_thread_id&order=published_at.desc&limit=500'),
    sb('cp_cults_models?or=(title.ilike.*sue*storm*,slug.ilike.*sue-storm*)&select=cults_key,title,slug,cults_url,published_at,collection_month,image_url,discord_thread_id,discord_starter_message_id,raw_meta&limit=5'),
  ]);

  const byMonth = {};
  for (const m of models || []) byMonth[m.collection_month || 'UNSORTED'] = (byMonth[m.collection_month || 'UNSORTED'] || 0) + 1;
  return {
    settings: settings?.[0] || null,
    state,
    counts: {
      total: (models || []).length,
      with_image: (models || []).filter(x => !!x.image_url).length,
      with_thread: (models || []).filter(x => !!x.discord_thread_id).length,
      by_month: byMonth,
    },
    newest: (models || []).slice(0, 5).map(x => ({ title: x.title, published_at: x.published_at, collection_month: x.collection_month })),
    oldest: (models || []).slice(-5).map(x => ({ title: x.title, published_at: x.published_at, collection_month: x.collection_month })),
    sue,
  };
}

export default async function handler(req, res) {
  try {
    const token = req.headers['x-cyberpop-recovery'] || req.query?.token || '';
    if (!okToken(token)) return send(res, 401, { ok: false, error: 'unauthorized' });

    if (req.method === 'GET') {
      return send(res, 200, { ok: true, ...(await status()) });
    }

    if (req.method === 'POST') {
      const action = req.body?.action;
      if (action !== 'extend_april') return send(res, 400, { ok: false, error: 'unsupported_action' });

      const changed = await sb('cp_discord_settings?enabled=eq.true', {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ cults_backfill_after: '2026-04-01' }),
      });

      return send(res, 200, {
        ok: true,
        action,
        changed: (changed || []).map(x => ({ guild_id: x.guild_id, cults_backfill_after: x.cults_backfill_after })),
        status: await status(),
      });
    }

    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  } catch (error) {
    return send(res, 500, { ok: false, error: error?.message || String(error) });
  }
}
