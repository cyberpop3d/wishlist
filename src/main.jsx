import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = 'https://sjqeisfrybspwogmxvdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWVpc2ZyeWJzcHdvZ214dmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzQ1NjAsImV4cCI6MjA5NDg1MDU2MH0.Pcc75eTPth-zUaqiIh-owCOlq2VVSNdKdhB1ubYEEDg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OPTIONS = [
  { id: 'dante', title: 'DANTE', subtitle: 'DEVIL MAY CRY', category: 'NOSTALGIA GAME' },
  { id: 'vergil', title: 'VERGIL', subtitle: 'DEVIL MAY CRY', category: 'NOSTALGIA GAME' },
  { id: 'solid-snake', title: 'SOLID SNAKE', subtitle: 'METAL GEAR SOLID', category: 'PLAYSTATION CORE' },
  { id: 'raiden', title: 'RAIDEN', subtitle: 'METAL GEAR SOLID', category: 'PLAYSTATION CORE' },
  { id: 'scorpion', title: 'SCORPION', subtitle: 'MORTAL KOMBAT', category: 'ARCADE / FIGHTING' },
  { id: 'sub-zero', title: 'SUB-ZERO', subtitle: 'MORTAL KOMBAT', category: 'ARCADE / FIGHTING' },
  { id: 'cloud-strife', title: 'CLOUD STRIFE', subtitle: 'FINAL FANTASY VII', category: 'JRPG ICON' },
  { id: 'sephiroth', title: 'SEPHIROTH', subtitle: 'FINAL FANTASY VII', category: 'JRPG ICON' },
  { id: 'leon', title: 'LEON S. KENNEDY', subtitle: 'RESIDENT EVIL 4', category: 'SURVIVAL HORROR' },
  { id: 'pyramid-head', title: 'PYRAMID HEAD', subtitle: 'SILENT HILL 2', category: 'SURVIVAL HORROR' },
  { id: 'kratos', title: 'KRATOS', subtitle: 'GOD OF WAR', category: 'PLAYSTATION CORE' },
  { id: 'tifa', title: 'TIFA LOCKHART', subtitle: 'FINAL FANTASY VII', category: 'JRPG ICON' },
  { id: 'frieren', title: 'FRIEREN', subtitle: 'BEYOND JOURNEY’S END', category: 'CURRENT ANIME' },
  { id: 'fern', title: 'FERN', subtitle: 'BEYOND JOURNEY’S END', category: 'CURRENT ANIME' },
  { id: 'gojo', title: 'GOJO SATORU', subtitle: 'JUJUTSU KAISEN', category: 'POPULAR ANIME' },
  { id: 'denji', title: 'DENJI', subtitle: 'CHAINSAW MAN', category: 'POPULAR ANIME' },
];

const MAX_VOTES = 3;
const LOCK_KEY = 'cyberpop_wishlist_vote_lock_v1';
const params = new URLSearchParams(window.location.search);
const isResultsPage = params.get('results') === '1' || window.location.pathname.includes('results');
const isEmbed = params.get('embed') === '1';
const isDebug = params.get('debug') === '1';
const voteUrl = params.get('voteUrl') || '/';
const resultsUrl = params.get('resultsUrl') || '?results=1';
const externalTarget = isEmbed ? '_top' : undefined;

function optionById(id) {
  return OPTIONS.find((option) => option.id === id);
}

function makeEmptyResults(counts = []) {
  const countMap = new Map(counts.map((item) => [item.option_id, Number(item.votes || 0)]));
  const rows = OPTIONS.map((option) => ({
    ...option,
    votes: countMap.get(option.id) || 0,
  }));
  rows.sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
  const total = rows.reduce((sum, row) => sum + row.votes, 0);
  return rows.map((row) => ({
    ...row,
    percent: total > 0 ? Math.round((row.votes / total) * 100) : 0,
  }));
}

function Shell({ children }) {
  return <main className={`page ${isEmbed ? 'embed' : ''}`}>{children}</main>;
}

function DebugPanel({ error }) {
  if (!isDebug) return null;
  return (
    <div className="debug">
      <div>Supabase URL: {SUPABASE_URL ? 'found' : 'missing'}</div>
      <div>Anon key: {SUPABASE_ANON_KEY ? 'found' : 'missing'}</div>
      <div>Client: {supabase ? 'connected' : 'missing'}</div>
      {error ? <pre>{String(error)}</pre> : null}
    </div>
  );
}

function Hearts({ count, max = MAX_VOTES }) {
  return (
    <div className="hearts" aria-label={`${count} of ${max} votes selected`}>
      {Array.from({ length: max }).map((_, index) => (
        <span key={index} className={`heart ${index < count ? 'active' : ''}`}>♥</span>
      ))}
    </div>
  );
}

function VotePage() {
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const lockedData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(LOCK_KEY) || 'null');
    } catch {
      return null;
    }
  }, [status]);

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
    if (selected.length === 0 || submitting || isLocked) return;
    setSubmitting(true);
    setError('');
    setStatus('idle');

    const selectedTitles = selected.map((id) => optionById(id)?.title || id);

    const { error: insertError } = await supabase.from('wishlist_votes').insert({
      selected_ids: selected,
      selected_titles: selectedTitles,
      note: note.trim() || null,
    });

    if (insertError) {
      setError(insertError.message || 'Vote insert failed');
      setStatus('paused');
      setSubmitting(false);
      return;
    }

    const lockPayload = {
      submittedAt: new Date().toISOString(),
      selected,
      selectedTitles,
    };
    localStorage.setItem(LOCK_KEY, JSON.stringify(lockPayload));
    setStatus('saved');
    setSubmitting(false);
  }

  return (
    <Shell>
      <section className="hero">
        <div>
          <div className="pill">Patreon wishlist vote</div>
          <h1>WHAT SHOULD WE SCULPT NEXT?</h1>
          <p>Vote for up to 3 characters you would like to see as future multipart 3D printable models.</p>
        </div>
        <div className="voteBox">
          <span>{isLocked ? 'Vote saved' : 'Votes selected'}</span>
          <strong>{isLocked ? `${lockedData.selected?.length || 0}/${MAX_VOTES}` : `${selected.length}/${MAX_VOTES}`}</strong>
          <Hearts count={isLocked ? lockedData.selected?.length || 0 : selected.length} />
        </div>
      </section>

      {isLocked ? (
        <section className="notice success">
          <strong>Your vote has been saved.</strong>
          <span>Thanks for helping shape the next release. This browser is now locked for voting.</span>
          <a href={resultsUrl} target={externalTarget}>View live results</a>
        </section>
      ) : null}

      {status === 'paused' ? (
        <section className="notice warning">
          <strong>Voting is temporarily paused.</strong>
          <span>Please check back soon. Your page is working, but votes are not being accepted right now.</span>
        </section>
      ) : null}

      <section className="grid">
        {OPTIONS.map((option) => {
          const picked = selected.includes(option.id) || lockedData?.selected?.includes(option.id);
          const disabled = isLocked || submitting || status === 'paused' || (!picked && selected.length >= MAX_VOTES);
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              className={`card ${picked ? 'picked' : ''}`}
              onClick={() => toggleVote(option.id)}
            >
              <span className="line" />
              <span className="category">{option.category}</span>
              <strong>{option.title}</strong>
              <small>{option.subtitle}</small>
              <span className="cardFooter">
                <b>{picked ? 'SELECTED' : isLocked ? 'LOCKED' : 'VOTE'}</b>
                <i>{picked ? '♥' : '♡'}</i>
              </span>
            </button>
          );
        })}
      </section>

      {!isLocked ? (
        <section className="formRow">
          <label>
            <span>Other wishlist ideas</span>
            <textarea
              value={note}
              disabled={submitting || status === 'paused'}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional: write another character, series, benefit, file feature, or Patreon improvement..."
            />
          </label>
          <button className="submit" disabled={selected.length === 0 || submitting || status === 'paused'} onClick={submitVote}>
            {submitting ? 'Saving...' : 'Submit vote'}
          </button>
        </section>
      ) : null}

      <DebugPanel error={error} />
    </Shell>
  );
}


function ModelsInDevelopment() {
  const [models, setModels] = useState([
    { model_name: 'SAGAT', status: 'CORPORATE', display_order: 1 },
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadModels() {
      const { data, error: fetchError } = await supabase
        .from('models_in_development')
        .select('model_name, status, display_order')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      if (!ignore && !fetchError && Array.isArray(data) && data.length > 0) {
        setModels(data);
      }
    }

    loadModels();
    const interval = window.setInterval(loadModels, 30000);
    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="developmentPanel" aria-label="Models in development">
      <div className="developmentEyebrow">Models in development</div>
      <div className="developmentList">
        {models.map((model, index) => (
          <div className="developmentItem" key={`${model.model_name}-${index}`}>
            <strong>{model.model_name} <span>—</span> {model.status}</strong>
          </div>
        ))}
      </div>
      <div className="developmentAuthor">CYBERPOP3D</div>
    </section>
  );
}

function ResultsPage() {
  const [rows, setRows] = useState(makeEmptyResults());
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  async function loadResults() {
    const { data, error: fetchError } = await supabase.from('wishlist_vote_counts').select('option_id, votes');
    if (fetchError) {
      setError(fetchError.message || 'Results fetch failed');
      setStatus('error');
      return;
    }
    setRows(makeEmptyResults(data || []));
    setStatus('ready');
  }

  useEffect(() => {
    loadResults();
    const interval = window.setInterval(loadResults, 20000);
    return () => window.clearInterval(interval);
  }, []);

  const totalVotes = rows.reduce((sum, row) => sum + row.votes, 0);
  const topThree = rows.slice(0, 3);
  const leader = rows[0];

  return (
    <Shell>
      <section className="resultsHero">
        <div>
          <div className="pill live"><span /> LIVE VOTE RESULTS</div>
          <h1>{leader?.votes > 0 ? `${leader.title} IS LEADING` : 'CURRENT LEADING CHARACTER'}</h1>
          <p>Live results are calculated from submitted wishlist votes. Updates refresh automatically.</p>
        </div>
        <a className="voteLink" href={voteUrl} target={externalTarget}>VOTE NOW</a>
      </section>

      {status === 'error' ? (
        <section className="notice warning">
          <strong>Live results are temporarily unavailable.</strong>
          <span>Please check back soon.</span>
        </section>
      ) : null}

      <section className="leaderCard">
        <span>Winning right now</span>
        <h2>{leader?.votes > 0 ? leader.title : 'No votes yet'}</h2>
        <p>{leader?.votes > 0 ? leader.subtitle : 'Be the first to vote.'}</p>
        <strong>{leader?.votes || 0} votes · {leader?.percent || 0}%</strong>
      </section>

      <section className="resultsLayout">
        <div className="topThree">
          <h3>Top 3</h3>
          {topThree.map((row, index) => (
            <div className="rankCard" key={row.id}>
              <span className="rank">#{index + 1}</span>
              <div className="rankMain">
                <strong>{row.title}</strong>
                <small>{row.subtitle}</small>
                <div className="bar"><span style={{ width: `${row.percent}%` }} /></div>
              </div>
              <b>{row.votes} votes · {row.percent}%</b>
            </div>
          ))}
        </div>

        <aside className="distribution">
          <h3>All options</h3>
          <p>{totalVotes} total votes</p>
          {rows.map((row) => (
            <div className="miniRow" key={row.id}>
              <span>{row.title}</span>
              <b>{row.votes} · {row.percent}%</b>
            </div>
          ))}
        </aside>
      </section>

      <ModelsInDevelopment />

      <DebugPanel error={error} />
    </Shell>
  );
}

function App() {
  return isResultsPage ? <ResultsPage /> : <VotePage />;
}

createRoot(document.getElementById('root')).render(<App />);
