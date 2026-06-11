const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SETTINGS_KEY = 'wishlist_dashboard';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, statusCode, body) {
  setCors(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(statusCode).send(JSON.stringify(body));
}

async function supabaseRest(path, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase environment variables are missing on the live app deployment.');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const message = data?.message || data?.error || text || `Supabase REST request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

function normalizeConfig(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    manualVotes: source.manualVotes || source.manual_votes || {},
    sections: Array.isArray(source.sections) ? source.sections : [
      { id: 'on-development', title: 'On development', items: ['ZANGIEF BEACH COSTUME', 'GUILE BEACH COSTUME'] },
      { id: 'recently-released', title: 'Recently released', items: ['SUBZERO', 'VEGA', 'TOM&JERRY BEACH EDITION'] },
    ],
  };
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const [settingsRows, voteRows] = await Promise.all([
        supabaseRest(`portfolio_settings?key=eq.${encodeURIComponent(SETTINGS_KEY)}&select=value`),
        supabaseRest('wishlist_vote_counts?select=option_id,votes'),
      ]);

      const config = normalizeConfig(settingsRows?.[0]?.value);
      return sendJson(res, 200, {
        ok: true,
        settingsKey: SETTINGS_KEY,
        config,
        submittedVotes: Array.isArray(voteRows) ? voteRows : [],
      });
    }

    if (req.method === 'POST') {
      const config = normalizeConfig(req.body?.config || req.body || {});
      await supabaseRest('portfolio_settings?on_conflict=key', {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([{ key: SETTINGS_KEY, value: config }]),
      });

      return sendJson(res, 200, { ok: true, settingsKey: SETTINGS_KEY, config });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Live dashboard API failed.' });
  }
}
