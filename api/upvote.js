const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, statusCode, body) {
  setCors(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(statusCode).send(JSON.stringify(body));
}

async function supabaseRequest(path, init = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase environment variables are missing on the live app deployment.');
  }

  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_KEY,
      authorization: `Bearer ${SUPABASE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const voteId = String(req.body?.voteId || '').trim();
    const voterToken = String(req.body?.voterToken || '').trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(voteId)) {
      return sendJson(res, 400, { ok: false, error: 'Invalid wishlist idea.' });
    }

    if (voterToken.length < 8 || voterToken.length > 128) {
      return sendJson(res, 400, { ok: false, error: 'Invalid voter token.' });
    }

    const insertResponse = await supabaseRequest('wishlist_vote_upvotes', {
      method: 'POST',
      headers: {
        Prefer: 'return=minimal',
      },
      body: JSON.stringify([{
        wishlist_vote_id: voteId,
        voter_token: voterToken,
      }]),
    });

    if (!insertResponse.ok) {
      const errorBody = await insertResponse.json().catch(() => ({}));
      if (String(errorBody?.code || '') !== '23505') {
        throw new Error(errorBody?.message || 'Could not save upvote.');
      }
    }

    const countResponse = await supabaseRequest(
      `wishlist_vote_upvotes?wishlist_vote_id=eq.${encodeURIComponent(voteId)}&select=id`
    );

    if (!countResponse.ok) {
      const errorBody = await countResponse.json().catch(() => ({}));
      throw new Error(errorBody?.message || 'Could not load upvote count.');
    }

    const rows = await countResponse.json();

    return sendJson(res, 200, {
      ok: true,
      voteId,
      upvotes: Array.isArray(rows) ? rows.length : 0,
      alreadyVoted: !insertResponse.ok,
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error.message || 'Upvote failed.',
    });
  }
}
