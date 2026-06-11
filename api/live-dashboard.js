const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SETTINGS_KEY = 'wishlist_dashboard';

function json(statusCode, body) {
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,apikey',
      'cache-control': 'no-store',
    },
  });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
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

export default async function handler(request) {
  if (request.method === 'OPTIONS') return json(200, { ok: true });

  try {
    if (request.method === 'GET') {
      const [settingsRows, voteRows] = await Promise.all([
        supabaseRest(`portfolio_settings?key=eq.${encodeURIComponent(SETTINGS_KEY)}&select=value`),
        supabaseRest('wishlist_vote_counts?select=option_id,votes'),
      ]);

      const config = normalizeConfig(settingsRows?.[0]?.value);
      return json(200, {
        ok: true,
        settingsKey: SETTINGS_KEY,
        config,
        submittedVotes: Array.isArray(voteRows) ? voteRows : [],
      });
    }

    if (request.method === 'POST') {
      const body = await readJson(request);
      const config = normalizeConfig(body?.config || body || {});
      await supabaseRest(`portfolio_settings?on_conflict=key`, {
        method: 'POST',
        headers: {
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([{ key: SETTINGS_KEY, value: config }]),
      });

      return json(200, { ok: true, settingsKey: SETTINGS_KEY, config });
    }

    return json(405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return json(500, { ok: false, error: error.message || 'Live dashboard API failed.' });
  }
}
