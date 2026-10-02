const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SETTINGS_KEY = 'wishlist_dashboard';

const DEFAULT_OPTIONS = [
  { id: 'summer-2026-zangief-beach', title: 'ZANGIEF BEACH COSTUME', subtitle: 'STREET FIGHTER', category: 'SUMMER FIGHTERS' },
  { id: 'summer-2026-guile-beach', title: 'GUILE BEACH COSTUME', subtitle: 'STREET FIGHTER', category: 'SUMMER FIGHTERS' },
  { id: 'summer-2026-sakura-beach', title: 'SAKURA BEACH COSTUME', subtitle: 'STREET FIGHTER', category: 'SUMMER FIGHTERS' },
  { id: 'summer-2026-kratos', title: 'KRATOS', subtitle: 'GOD OF WAR', category: 'PLAYSTATION CORE' },
  { id: 'summer-2026-sonic-woody', title: 'SONIC WOODY', subtitle: 'SEGA X TOY STORY', category: 'CROSSOVER TOYBOX' },
  { id: 'summer-2026-sheriff-amy', title: 'SHERIFF AMY', subtitle: 'SEGA X TOY STORY', category: 'CROSSOVER TOYBOX' },
  { id: 'summer-2026-tails-lightyear-vs', title: 'TAILS LIGHTYEAR VS EGGMAN ZURG', subtitle: 'SEGA X TOY STORY', category: 'CROSSOVER TOYBOX' },
  { id: 'summer-2026-raiden-shogun', title: 'RAIDEN SHOGUN', subtitle: 'GENSHIN IMPACT', category: 'GENSHIN IMPACT' },
  { id: 'summer-2026-furina', title: 'FURINA', subtitle: 'GENSHIN IMPACT', category: 'GENSHIN IMPACT' },
  { id: 'summer-2026-arlecchino', title: 'ARLECCHINO', subtitle: 'GENSHIN IMPACT', category: 'GENSHIN IMPACT' },
  { id: 'summer-2026-iori-yagami', title: 'IORI YAGAMI', subtitle: 'THE KING OF FIGHTERS', category: 'KING OF FIGHTERS' },
  { id: 'summer-2026-mai-shiranui', title: 'MAI SHIRANUI', subtitle: 'THE KING OF FIGHTERS', category: 'KING OF FIGHTERS' },
  { id: 'summer-2026-kyo-kusanagi', title: 'KYO KUSANAGI', subtitle: 'THE KING OF FIGHTERS', category: 'KING OF FIGHTERS' },
  { id: 'summer-2026-scorpion', title: 'SCORPION', subtitle: 'MORTAL KOMBAT', category: 'ARCADE / FIGHTING' },
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[ı]/g, 'i')
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeOptions(value) {
  const raw = Array.isArray(value) ? value : DEFAULT_OPTIONS;
  const seen = new Set();
  return raw.map((item, index) => {
    const title = String(item?.title || item?.model_name || '').trim();
    const subtitle = String(item?.subtitle || '').trim();
    const category = String(item?.category || '').trim();
    const baseId = String(item?.id || item?.option_id || slugify(title) || `option-${index + 1}`).trim();
    let id = slugify(baseId) || `option-${index + 1}`;
    let step = 2;
    while (seen.has(id)) {
      id = `${slugify(baseId) || `option-${index + 1}`}-${step}`;
      step += 1;
    }
    seen.add(id);
    return { id, title: title || `OPTION ${index + 1}`, subtitle, category };
  }).filter((item) => item.id && item.title);
}

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
    options: normalizeOptions(source.options),
    sections: Array.isArray(source.sections) ? source.sections : [
      { id: 'on-development', title: 'On development', items: ['ZANGIEF BEACH COSTUME', 'GUILE BEACH COSTUME'] },
      { id: 'recently-released', title: 'Recently released', items: ['SUBZERO', 'VEGA', 'TOM&JERRY BEACH EDITION'] },
    ],
  };
}

function normalizeVoteRecord(row, upvotes = 0, viewerUpvoted = false, lastUpvoteAt = null) {
  return {
    id: row.id,
    created_at: row.created_at,
    username: typeof row.username === 'string' ? row.username.trim() : '',
    selected_ids: Array.isArray(row.selected_ids) ? row.selected_ids : [],
    selected_titles: Array.isArray(row.selected_titles) ? row.selected_titles : [],
    note: typeof row.note === 'string' ? row.note.trim() : '',
    upvotes: Number(upvotes || 0),
    viewerUpvoted: Boolean(viewerUpvoted),
    last_upvote_at: lastUpvoteAt,
  };
}

async function fetchVoteArchive() {
  try {
    return await supabaseRest('wishlist_votes?select=id,created_at,username,selected_ids,selected_titles,note&order=created_at.desc&limit=250');
  } catch (error) {
    if (String(error.message || '').includes('wishlist_votes.username')) {
      return supabaseRest('wishlist_votes?select=id,created_at,selected_ids,selected_titles,note&order=created_at.desc&limit=250');
    }
    throw error;
  }
}

async function fetchUpvoteSummary(voterToken) {
  const token = typeof voterToken === 'string' && /^[0-9a-f-]{36}$/i.test(voterToken)
    ? voterToken
    : null;
  try {
    return await supabaseRest('rpc/get_wishlist_upvote_summary', {
      method: 'POST',
      body: JSON.stringify({ p_voter_token: token }),
    });
  } catch {
    return [];
  }
}

function buildUpvoteStats(rows) {
  const counts = new Map();
  const latest = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const voteId = String(row?.wishlist_vote_id || '');
    if (!voteId) return;

    counts.set(voteId, Number(row?.upvotes || 0));

    const createdAt = row?.latest_upvote_at ? new Date(row.latest_upvote_at) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) latest.set(voteId, createdAt);
  });

  return { counts, latest };
}

function buildViewerUpvoteSet(rows) {
  return new Set(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => Boolean(row?.viewer_upvoted))
      .map((row) => String(row?.wishlist_vote_id || ''))
      .filter(Boolean)
  );
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const viewerToken = String(req.query?.voterToken || '').trim();

      const [settingsRows, voteRows, archiveRows, upvoteRows] = await Promise.all([
        supabaseRest(`portfolio_settings?key=eq.${encodeURIComponent(SETTINGS_KEY)}&select=value`),
        supabaseRest('wishlist_vote_counts?select=option_id,votes'),
        fetchVoteArchive(),
        fetchUpvoteSummary(viewerToken),
      ]);

      const upvoteStats = buildUpvoteStats(upvoteRows);
      const viewerUpvotes = buildViewerUpvoteSet(upvoteRows);
      const voteArchive = Array.isArray(archiveRows)
        ? archiveRows.map((row) => normalizeVoteRecord(
            row,
            upvoteStats.counts.get(String(row.id)) || 0,
            viewerUpvotes.has(String(row.id)),
            upvoteStats.latest.get(String(row.id))?.toISOString() || null
          ))
        : [];
      const writtenNotes = voteArchive.filter((vote) => vote.note);
      const config = normalizeConfig(settingsRows?.[0]?.value);

      return sendJson(res, 200, {
        ok: true,
        settingsKey: SETTINGS_KEY,
        config,
        submittedVotes: Array.isArray(voteRows) ? voteRows : [],
        voteArchive,
        writtenNotes,
      });
    }

    if (req.method === 'POST') {
      return sendJson(res, 403, {
        ok: false,
        error: 'Dashboard settings are read-only from the public application.',
      });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: error.message || 'Live dashboard API failed.' });
  }
}
