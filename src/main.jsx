import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DASHBOARD_SETTINGS_KEY = 'wishlist_dashboard';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

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

const MAX_VOTES = 3;
const LOCK_KEY = 'cyberpop_wishlist_vote_lock_summer_2026_v1';
const params = new URLSearchParams(window.location.search);
const routePath = window.location.pathname.replace(/\/+$/, '') || '/';
const isVoteRoute = routePath === '/vote' || params.get('vote') === '1';
const isEmbed = params.get('embed') === '1';
const isDebug = params.get('debug') === '1';

function makeAppUrl(path) {
  const nextParams = new URLSearchParams();
  if (isEmbed) nextParams.set('embed', '1');
  if (isDebug) nextParams.set('debug', '1');
  const search = nextParams.toString();
  return `${path}${search ? `?${search}` : ''}`;
}

const voteUrl = makeAppUrl('/vote');
const resultsUrl = makeAppUrl('/');

function goToResults(event) { event.preventDefault(); window.location.assign(resultsUrl); }
function goToVote(event) { event.preventDefault(); window.location.assign(voteUrl); }
function optionById(id) { return OPTIONS.find((option) => option.id === id); }
function numberValue(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }

const DEFAULT_MODEL_SECTIONS = [
  { id: 'on-development', title: 'On development', items: [{ model_name: 'ZANGIEF', status: 'BEACH COSTUME', display_order: 1 }, { model_name: 'GUILE', status: 'BEACH COSTUME', display_order: 2 }] },
  { id: 'recently-released', title: 'Recently released', items: [{ model_name: 'SUBZERO', status: '', display_order: 1 }, { model_name: 'VEGA', status: '', display_order: 2 }, { model_name: 'TOM&JERRY', status: 'BEACH EDITION', display_order: 3 }] },
];

function normalizeDashboardItems(value, fallback = []) {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (typeof item === 'string') return { model_name: item.trim(), status: '', display_order: index + 1 };
      return { model_name: item?.model_name || item?.title || '', status: item?.status || '', display_order: Number(item?.display_order || index + 1) };
    }).filter((item) => item.model_name || item.status);
  }
  if (typeof value === 'string') {
    return value.split('\n').map((item, index) => ({ model_name: item.trim(), status: '', display_order: index + 1 })).filter((item) => item.model_name);
  }
  return fallback;
}

function normalizeDashboardSections(value) {
  const raw = Array.isArray(value) && value.length ? value : DEFAULT_MODEL_SECTIONS;
  return DEFAULT_MODEL_SECTIONS.map((fallbackSection, index) => {
    const section = raw[index] || fallbackSection;
    return { id: section.id || fallbackSection.id, title: section.title || fallbackSection.title, items: normalizeDashboardItems(section.items, fallbackSection.items) };
  });
}

function normalizeDashboardConfig(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return { manualVotes: source.manualVotes || source.manual_votes || {}, sections: normalizeDashboardSections(source.sections) };
}

function buildResultRows(counts = [], dashboardConfig = normalizeDashboardConfig()) {
  const submittedMap = new Map(counts.map((item) => [item.option_id, numberValue(item.votes)]));
  const manualVotes = dashboardConfig?.manualVotes || {};
  const rows = OPTIONS.map((option) => {
    const submittedVotes = submittedMap.get(option.id) || 0;
    const manualVoteOffset = numberValue(manualVotes[option.id]);
    const votes = Math.max(0, submittedVotes + manualVoteOffset);
    return { ...option, votes, submittedVotes, manualVoteOffset };
  });
  rows.sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  const total = rows.reduce((sum, row) => sum + row.votes, 0);
  return rows.map((row) => ({ ...row, percent: total > 0 ? Math.round((row.votes / total) * 100) : 0 }));
}

function Shell({ children }) { return <main className={`page ${isEmbed ? 'embed' : ''}`}>{children}</main>; }

function DebugPanel({ error }) {
  if (!isDebug) return null;
  return <div className="debug"><div>Route: {routePath}</div><div>Supabase URL: {SUPABASE_URL ? 'found' : 'missing'}</div><div>Anon key: {SUPABASE_ANON_KEY ? 'found' : 'missing'}</div><div>Client: {supabase ? 'connected' : 'missing'}</div>{error ? <pre>{String(error)}</pre> : null}</div>;
}

function Hearts({ count, max = MAX_VOTES }) {
  return <div className="hearts" aria-label={`${count} of ${max} votes selected`}>{Array.from({ length: max }).map((_, index) => <span key={index} className={`heart ${index < count ? 'active' : ''}`}>♥</span>)}</div>;
}

function VotePage() {
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const lockedData = useMemo(() => { try { return JSON.parse(localStorage.getItem(LOCK_KEY) || 'null'); } catch { return null; } }, [status]);
  const isLocked = Boolean(lockedData?.submittedAt);

  function toggleVote(id) {
    if (isLocked || submitting || status === 'paused') return;
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_VOTES) return current;
      return [...current, id];
    });
  }

  async function submitVote() {
    if (!supabase) { setError('Supabase is not configured.'); setStatus('paused'); return; }
    if (selected.length === 0 || submitting || isLocked) return;
    setSubmitting(true); setError(''); setStatus('idle');
    const selectedTitles = selected.map((id) => optionById(id)?.title || id);
    const { error: insertError } = await supabase.from('wishlist_votes').insert({ selected_ids: selected, selected_titles: selectedTitles, note: note.trim() || null });
    if (insertError) { setError(insertError.message || 'Vote insert failed'); setStatus('paused'); setSubmitting(false); return; }
    localStorage.setItem(LOCK_KEY, JSON.stringify({ submittedAt: new Date().toISOString(), selected, selectedTitles }));
    setStatus('saved'); setSubmitting(false);
  }

  return (
    <Shell>
      <section className="hero">
        <div><div className="pill">Patreon wishlist vote</div><h1>WHAT SHOULD WE SCULPT NEXT?</h1><p>Vote for up to 3 characters you would like to see as future multipart 3D printable models.</p></div>
        <div className="voteBox"><span>{isLocked ? 'Vote saved' : 'Votes selected'}</span><strong>{isLocked ? `${lockedData.selected?.length || 0}/${MAX_VOTES}` : `${selected.length}/${MAX_VOTES}`}</strong><Hearts count={isLocked ? lockedData.selected?.length || 0 : selected.length} /></div>
      </section>
      {isLocked ? <section className="notice success"><strong>Your vote has been saved.</strong><span>Thanks for helping shape the next release. This browser is now locked for voting.</span><a href={resultsUrl} onClick={goToResults}>View live results</a></section> : null}
      {status === 'paused' ? <section className="notice warning"><strong>Voting is temporarily paused.</strong><span>Please check back soon. Your page is working, but votes are not being accepted right now.</span></section> : null}
      <section className="grid">{OPTIONS.map((option) => { const picked = selected.includes(option.id) || lockedData?.selected?.includes(option.id); const disabled = isLocked || submitting || status === 'paused' || (!picked && selected.length >= MAX_VOTES); return <button key={option.id} type="button" disabled={disabled} className={`card ${picked ? 'picked' : ''}`} onClick={() => toggleVote(option.id)}><span className="line" /><span className="category">{option.category}</span><strong>{option.title}</strong><small>{option.subtitle}</small><span className="cardFooter"><b>{picked ? 'SELECTED' : isLocked ? 'LOCKED' : 'VOTE'}</b><i>{picked ? '♥' : '♡'}</i></span></button>; })}</section>
      {!isLocked ? <section className="formRow"><label><span>Other wishlist ideas</span><textarea value={note} disabled={submitting || status === 'paused'} onChange={(event) => setNote(event.target.value)} placeholder="Optional: write another character, series, benefit, file feature, or Patreon improvement..." /></label><button className="submit" disabled={selected.length === 0 || submitting || status === 'paused'} onClick={submitVote}>{submitting ? 'Saving...' : 'Submit vote'}</button></section> : null}
      <DebugPanel error={error} />
    </Shell>
  );
}

function formatModelName(model) { if (typeof model === 'string') return model; return [model.model_name, model.status].filter(Boolean).join(' '); }

function ModelsInDevelopment({ sections = DEFAULT_MODEL_SECTIONS }) {
  const normalizedSections = normalizeDashboardSections(sections);
  return <section className="developmentPanel" aria-label="Model status"><div className="developmentEyebrow">Model status</div><div className="developmentSections">{normalizedSections.map((section) => <div className="developmentSection" key={section.id}><div className="developmentSectionTitle">{section.title}</div><div className="developmentList">{section.items.map((model, index) => <div className="developmentItem" key={`${section.id}-${formatModelName(model)}-${index}`}><strong>{formatModelName(model)}</strong></div>)}</div></div>)}</div><div className="developmentAuthor">CYBERPOP3D</div></section>;
}

function ResultsPage() {
  const defaultDashboard = normalizeDashboardConfig();
  const [rows, setRows] = useState(buildResultRows([], defaultDashboard));
  const [modelSections, setModelSections] = useState(defaultDashboard.sections);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  async function loadResults() {
    if (!supabase) { setError('Supabase is not configured.'); setStatus('error'); return; }
    const [{ data, error: fetchError }, { data: dashboardRow, error: dashboardError }] = await Promise.all([
      supabase.from('wishlist_vote_counts').select('option_id, votes'),
      supabase.from('portfolio_settings').select('value').eq('key', DASHBOARD_SETTINGS_KEY).maybeSingle(),
    ]);
    if (fetchError) { setError(fetchError.message || 'Results fetch failed'); setStatus('error'); return; }
    if (dashboardError) console.warn('Dashboard settings fetch failed:', dashboardError.message);
    const dashboardConfig = normalizeDashboardConfig(dashboardError ? null : dashboardRow?.value);
    setRows(buildResultRows(data || [], dashboardConfig));
    setModelSections(dashboardConfig.sections);
    setError(''); setStatus('ready');
  }

  useEffect(() => { loadResults(); const interval = window.setInterval(loadResults, 20000); return () => window.clearInterval(interval); }, []);

  const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0);
  const submittedTotal = rows.reduce((sum, row) => sum + row.submittedVotes, 0);
  const manualTotal = rows.reduce((sum, row) => sum + row.manualVoteOffset, 0);
  const topThree = rows.slice(0, 3);
  const leader = rows[0];

  return <Shell><section className="resultsHero"><div><div className="pill live"><span /> LIVE VOTE RESULTS</div><h1>{leader?.votes > 0 ? `${leader.title} IS LEADING` : 'CURRENT LEADING CHARACTER'}</h1><p>Live results combine submitted wishlist votes with admin-added outside votes. Updates refresh automatically.</p></div><a className="voteLink" href={voteUrl} onClick={goToVote}>VOTE NOW</a></section>{status === 'error' ? <section className="notice warning"><strong>Live results are temporarily unavailable.</strong><span>Please check back soon.</span></section> : null}<section className="leaderCard"><span>Winning right now</span><h2>{leader?.votes > 0 ? leader.title : 'No votes yet'}</h2><p>{leader?.votes > 0 ? leader.subtitle : 'Be the first to vote.'}</p><strong>{leader?.votes || 0} votes · {leader?.percent || 0}%</strong></section><section className="resultsLayout"><div className="topThree"><h3>Top 3</h3>{topThree.map((row, index) => <div className="rankCard" key={row.id}><span className="rank">#{index + 1}</span><div className="rankMain"><strong>{row.title}</strong><small>{row.subtitle}</small><div className="bar"><span style={{ width: `${row.percent}%` }} /></div></div><b>{row.votes} votes · {row.percent}%</b></div>)}</div><aside className="distribution"><h3>All options</h3><p>{totalVotes} total votes</p><p>{submittedTotal} submitted · {manualTotal} admin-added</p>{rows.map((row) => <div className="miniRow" key={row.id}><span>{row.title}</span><b>{row.votes} · {row.percent}%</b></div>)}</aside></section><ModelsInDevelopment sections={modelSections} /><DebugPanel error={error} /></Shell>;
}

function App() { return isVoteRoute ? <VotePage /> : <ResultsPage />; }

createRoot(document.getElementById('root')).render(<App />);
