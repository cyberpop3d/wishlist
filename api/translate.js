const ALLOWED_LANGUAGES = new Set(['en', 'pt', 'es', 'fr', 'de', 'it']);

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'private, max-age=300');
}

function sendJson(res, statusCode, body) {
  setCors(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(statusCode).send(JSON.stringify(body));
}

async function translateText(text, target) {
  const value = String(text || '').trim();
  if (!value || target === 'en') return value;

  const params = new URLSearchParams({
    client: 'gtx',
    sl: 'auto',
    tl: target,
    dt: 't',
    q: value,
  });

  const response = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json,text/plain,*/*',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Translation service returned ${response.status}`);
  }

  const data = await response.json();
  const translated = Array.isArray(data?.[0])
    ? data[0].map((part) => String(part?.[0] || '')).join('')
    : '';

  return translated || value;
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
    const target = String(req.body?.target || '').toLowerCase();
    const rawTexts = Array.isArray(req.body?.texts) ? req.body.texts : [];

    if (!ALLOWED_LANGUAGES.has(target)) {
      return sendJson(res, 400, { ok: false, error: 'Unsupported language' });
    }

    if (rawTexts.length > 24) {
      return sendJson(res, 400, { ok: false, error: 'Too many texts' });
    }

    const texts = rawTexts.map((text) => String(text || '').slice(0, 700));
    const translations = await Promise.all(
      texts.map((text) => translateText(text, target))
    );

    return sendJson(res, 200, { ok: true, target, translations });
  } catch (error) {
    return sendJson(res, 502, {
      ok: false,
      error: error.message || 'Translation failed',
    });
  }
}
