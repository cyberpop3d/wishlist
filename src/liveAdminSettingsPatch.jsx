import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sjqeisfrybspwogmxvdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6InNqcWVpc2ZyeWJzcHdvZ214dmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzQ1NjAsImV4cCI6MjA5NDg1MDU2MH0.Pcc75eTPth-zUaqiIh-owCOlq2VVSNdKdhB1ubYEEDg';
const SETTINGS_KEY = 'wishlist_dashboard';
const isResultsPage = new URLSearchParams(window.location.search).get('results') === '1' || window.location.pathname.includes('results');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OPTIONS = [
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

const DEFAULT_SECTIONS = [
  { id: 'on-development', title: 'On development', items: ['ZANGIEF BEACH COSTUME', 'GUILE BEACH COSTUME'] },
  { id: 'recently-released', title: 'Recently released', items: ['SUBZERO', 'VEGA', 'TOM&JERRY BEACH EDITION'] },
];

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeItems(value) {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item.trim();
      return [item?.model_name, item?.status].filter(Boolean).join(' ').trim();
    }).filter(Boolean);
  }
  return [];
}

function normalizeSections(value) {
  const raw = Array.isArray(value) && value.length ? value : DEFAULT_SECTIONS;
  return raw.slice(0, 2).map((section, index) => ({
    id: section.id || DEFAULT_SECTIONS[index]?.id || `section-${index + 1}`,
    title: section.title || DEFAULT_SECTIONS[index]?.title || `Section ${index + 1}`,
    items: normalizeItems(section.items).length ? normalizeItems(section.items) : DEFAULT_SECTIONS[index]?.items || [],
  }));
}

function normalizeConfig(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    manualVotes: source.manualVotes || source.manual_votes || {},
    sections: normalizeSections(source.sections),
  };
}

async function loadDashboardData() {
  const [{ data: settingsRow }, { data: counts }] = await Promise.all([
    supabase.from('portfolio_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle(),
    supabase.from('wishlist_vote_counts').select('option_id, votes'),
  ]);

  const config = normalizeConfig(settingsRow?.value);
  const countMap = new Map((counts || []).map((item) => [item.option_id, numberValue(item.votes)]));
  const rows = OPTIONS.map((option) => {
    const submitted = countMap.get(option.id) || 0;
    const manual = numberValue(config.manualVotes?.[option.id]);
    return { ...option, votes: Math.max(0, submitted + manual), submitted, manual };
  });

  rows.sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  const total = rows.reduce((sum, row) => sum + row.votes, 0);

  return {
    rows: rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.votes / total) * 100) : 0 })),
    total,
    sections: config.sections,
  };
}

function renderPatchedResults({ rows, total, sections }) {
  const leader = rows[0];
  const title = document.querySelector('.resultsHero h1');
  if (title) title.textContent = leader?.votes > 0 ? `${leader.title} IS LEADING` : 'CURRENT LEADING CHARACTER';

  const leaderCard = document.querySelector('.leaderCard');
  if (leaderCard) {
    const h2 = leaderCard.querySelector('h2');
    const p = leaderCard.querySelector('p');
    const strong = leaderCard.querySelector('strong');
    if (h2) h2.textContent = leader?.votes > 0 ? leader.title : 'No votes yet';
    if (p) p.textContent = leader?.votes > 0 ? leader.subtitle : 'Be the first to vote.';
    if (strong) strong.textContent = `${leader?.votes || 0} votes · ${leader?.percent || 0}%`;
  }

  const topThree = document.querySelector('.topThree');
  if (topThree) {
    topThree.innerHTML = '<h3>Top 3</h3>' + rows.slice(0, 3).map((row, index) => `
      <div class="rankCard">
        <span class="rank">#${index + 1}</span>
        <div class="rankMain">
          <strong>${row.title}</strong>
          <small>${row.subtitle}</small>
          <div class="bar"><span style="width:${row.percent}%"></span></div>
        </div>
        <b>${row.votes} votes · ${row.percent}%</b>
      </div>
    `).join('');
  }

  const distribution = document.querySelector('.distribution');
  if (distribution) {
    distribution.innerHTML = `<h3>All options</h3><p>${total} total votes</p>` + rows.map((row) => `
      <div class="miniRow">
        <span>${row.title}</span>
        <b>${row.votes} · ${row.percent}%</b>
      </div>
    `).join('');
  }

  const existingPanel = document.querySelector('.developmentPanel');
  if (existingPanel) {
    existingPanel.innerHTML = `
      <div class="developmentEyebrow">Model status</div>
      <div class="developmentSections">
        ${normalizeSections(sections).map((section) => `
          <div class="developmentSection">
            <div class="developmentSectionTitle">${section.title}</div>
            <div class="developmentList">
              ${section.items.map((item) => `<div class="developmentItem"><strong>${item}</strong></div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="developmentAuthor">CYBERPOP3D</div>
    `;
  }
}

async function refreshPatchedResults() {
  if (!isResultsPage) return;
  try {
    const data = await loadDashboardData();
    renderPatchedResults(data);
  } catch (error) {
    console.warn('Live admin settings patch failed:', error);
  }
}

if (isResultsPage) {
  window.setTimeout(refreshPatchedResults, 500);
  window.setInterval(refreshPatchedResults, 20000);
}
