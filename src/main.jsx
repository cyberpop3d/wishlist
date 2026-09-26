import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import './styles.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const CAMPAIGN_START = new Date('2026-09-26T19:43:00Z');
const CAMPAIGN_END = new Date('2026-10-03T19:43:00Z');
const CAMPAIGN_PREFIX = 'wishlist-24h-2026-09-26:';

const SETTING_RECOMMENDATIONS = [
  'Urban Style',
  'Mob Boss Style',
  'Wild West Style',
  'Candy Style',
  'Creepy Style',
];

const params = new URLSearchParams(window.location.search);
const routePath = window.location.pathname.replace(/\/+$/, '') || '/';
const host = window.location.hostname.toLowerCase();
const isVoteHost = host === 'vote.yontuk.com';
const isVoteRoute = isVoteHost || routePath === '/vote' || params.get('vote') === '1';

const voteUrl = 'https://vote.yontuk.com/';
const liveUrl = 'https://live.yontuk.com/';
const WISH_PORTAL_VIDEO_URL = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3JSVhpN3tgfQHwuizlasXKrt8Ey/d9260218-76a7-4f51-a598-ebc092c3ab3f.mp4';

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

function useCountdown() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = Math.max(0, CAMPAIGN_END.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    active: now >= CAMPAIGN_START && now < CAMPAIGN_END,
    ended: now >= CAMPAIGN_END,
    label: `${days}D ${[hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')}`,
  };
}

function Countdown({ compact = false }) {
  const countdown = useCountdown();

  return (
    <div className={`countdown ${compact ? 'compact' : ''} ${countdown.ended ? 'ended' : ''}`}>
      <span>{countdown.ended ? 'Wishlist closed' : 'Wishlist closes in'}</span>
      <strong>{countdown.ended ? '00:00:00' : countdown.label}</strong>
      {!compact ? <small>One week · September 26 – October 3</small> : null}
    </div>
  );
}

function Shell({ children }) {
  return <main className="page">{children}</main>;
}

function BrandBar({ mode }) {
  return (
    <header className="brandBar">
      <a className="brand" href={liveUrl}>YONTUK</a>
      <nav>
        <a className={mode === 'live' ? 'active' : ''} href={liveUrl}>Live Wishlist</a>
        <a className={mode === 'vote' ? 'active' : ''} href={voteUrl}>Submit an Idea</a>
      </nav>
    </header>
  );
}

function VotePage() {
  const countdown = useCountdown();
  const [step, setStep] = useState('intro');
  const [username, setUsername] = useState('');
  const [usernameDraft, setUsernameDraft] = useState('');
  const [wishes, setWishes] = useState(['', '', '']);
  const [editingUsername, setEditingUsername] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');


  const cleanUsername = username.trim().replace(/^@+/, '');
  const canSaveUsername = usernameDraft.trim().replace(/^@+/, '').length >= 2;
  const canSubmitWishes = countdown.active
    && cleanUsername.length >= 2
    && wishes.every((wish) => wish.trim().length >= 2)
    && !submitting;

  function saveUsername(event) {
    event.preventDefault();
    const nextUsername = usernameDraft.trim().replace(/^@+/, '');
    if (nextUsername.length < 2) return;
    setUsername(nextUsername);
    setUsernameDraft(nextUsername);
    setEditingUsername(false);
    setError('');
    setStep('wishes');
  }

  function beginUsernameEdit() {
    setUsernameDraft(username);
    setEditingUsername(true);
  }

  function updateWish(index, value) {
    setWishes((current) => current.map((wish, wishIndex) => (
      wishIndex === index ? value : wish
    )));
  }

  async function submitWishes(event) {
    event.preventDefault();
    if (!canSubmitWishes) return;

    if (!supabase) {
      setError('Wishlist connection is temporarily unavailable.');
      return;
    }

    setSubmitting(true);
    setError('');

    const rows = wishes.map((wish, index) => ({
      selected_ids: [`${CAMPAIGN_PREFIX}portal-${index + 1}`],
      selected_titles: [wish.trim()],
      note: '',
      username: cleanUsername,
    }));

    const { error: insertError } = await supabase.from('wishlist_votes').insert(rows);

    if (insertError) {
      setError(insertError.message || 'Could not save your wishes.');
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setStep('done');
  }

  if (step === 'intro') {
    return (
      <main className="voteExperience introExperience">
        <section className="portalIntro">
          <div className="portalVideoWrap">
            <video
              className="portalVideo"
              src={WISH_PORTAL_VIDEO_URL}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
            />
          </div>

          <button
            className="portalVoteButton"
            type="button"
            onClick={() => {
              setError('');
              setStep('username');
            }}
            disabled={!countdown.active}
          >
            {countdown.active ? 'CLICK TO VOTE' : 'WISHLIST CLOSED'}
          </button>

          {error ? <p className="portalInlineError">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="voteExperience">
      <section className="conversationStage">
        {step !== 'username' && username ? (
          <div className="conversationIdentity">
            <span>@{cleanUsername}</span>
            <button type="button" onClick={beginUsernameEdit}>Edit</button>
          </div>
        ) : null}

        {(step === 'username' || editingUsername) ? (
          <form className="conversationCard" onSubmit={saveUsername}>
            <h1>Your instagram username</h1>
            <div className="speechInput">
              <span>@</span>
              <input
                autoFocus
                value={usernameDraft}
                onChange={(event) => setUsernameDraft(event.target.value)}
                placeholder="username"
                autoComplete="off"
                maxLength={60}
              />
            </div>
            <button className="conversationNext" type="submit" disabled={!canSaveUsername}>
              Continue
            </button>
            {editingUsername ? (
              <button
                className="conversationCancel"
                type="button"
                onClick={() => {
                  setEditingUsername(false);
                  setUsernameDraft(username);
                }}
              >
                Cancel
              </button>
            ) : null}
          </form>
        ) : null}

        {step === 'wishes' && !editingUsername ? (
          <form className="conversationCard wishesCard" onSubmit={submitWishes}>
            <h1>3 Characters you want to see in the style you want</h1>

            <div className="wishInputs">
              {wishes.map((wish, index) => (
                <div className="speechInput wishSpeech" key={index}>
                  <span>{index + 1}</span>
                  <textarea
                    autoFocus={index === 0}
                    value={wish}
                    onChange={(event) => updateWish(index, event.target.value)}
                    placeholder="Character + style"
                    maxLength={180}
                  />
                </div>
              ))}
            </div>

            {error ? <p className="portalInlineError">{error}</p> : null}

            <button className="conversationNext" type="submit" disabled={!canSubmitWishes}>
              {submitting ? 'Sending...' : 'Send Wishes'}
            </button>
          </form>
        ) : null}

        {step === 'done' && !editingUsername ? (
          <div className="conversationCard doneCard">
            <h1>Thank You,</h1>
            <p>you can view all other wishes from here</p>
            <a className="liveWishlistButton" href={liveUrl}>LIVE.YONTUK.COM</a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
function wishlistEntryFromVote(vote) {
  const selectedIds = Array.isArray(vote?.selected_ids) ? vote.selected_ids : [];
  const marker = selectedIds.find((id) => String(id || '').startsWith(CAMPAIGN_PREFIX));
  if (!marker) return null;

  const createdAt = new Date(vote.created_at);
  if (Number.isNaN(createdAt.getTime()) || createdAt < CAMPAIGN_START) return null;

  const character = Array.isArray(vote.selected_titles)
    ? String(vote.selected_titles[0] || '').trim()
    : '';
  const setting = String(vote.note || '').trim();
  const isPortalWish = String(marker).includes(':portal-');

  if (!character || (!setting && !isPortalWish)) return null;

  const username = String(vote.username || '').trim();

  return {
    id: vote.id,
    character,
    setting,
    username,
    upvotes: Number(vote.upvotes || 0),
    createdAt,
  };
}

function formatSubmittedTime(value) {
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  } catch {
    return '';
  }
}

function getOrCreateWishlistVoterToken() {
  const storageKey = 'yontuk-wishlist-voter-token';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const next = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, next);
    return next;
  } catch {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

function EnvelopeIcon() {
  return (
    <svg
      className="envelopeIcon"
      viewBox="0 0 120 88"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4" width="112" height="80" rx="10" />
      <path d="M10 14L60 51L110 14" />
      <path d="M10 76L45 44" />
      <path d="M110 76L75 44" />
    </svg>
  );
}

function LivePage() {
  const countdown = useCountdown();
  const [entries, setEntries] = useState([]);
  const [selectedUserKey, setSelectedUserKey] = useState('');
  const [pendingUpvotes, setPendingUpvotes] = useState({});

  async function loadWishlist() {
    try {
      const response = await fetch('/api/live-dashboard', { cache: 'no-store' });
      if (!response.ok) throw new Error('Live wishlist fetch failed');
      const data = await response.json();
      const nextEntries = (data.voteArchive || [])
        .map(wishlistEntryFromVote)
        .filter(Boolean)
        .sort((a, b) => b.createdAt - a.createdAt);

      setEntries(nextEntries);
    } catch {
      // Keep the page visually clean if the live feed is temporarily unavailable.
    }
  }

  useEffect(() => {
    loadWishlist();
    const timer = window.setInterval(loadWishlist, 10000);
    return () => window.clearInterval(timer);
  }, []);

  const userGroups = useMemo(() => {
    const grouped = new Map();

    entries.forEach((entry) => {
      const username = entry.username || 'Anonymous';
      const key = entry.username
        ? entry.username.toLowerCase()
        : 'anonymous-' + String(entry.id);

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          username,
          wishes: [],
        });
      }

      grouped.get(key).wishes.push(entry);
    });

    return Array.from(grouped.values());
  }, [entries]);

  const selectedGroup = userGroups.find((group) => group.key === selectedUserKey) || null;

  async function handleUpvote(voteId) {
    if (!voteId || pendingUpvotes[voteId]) return;

    setPendingUpvotes((current) => ({ ...current, [voteId]: true }));

    try {
      const response = await fetch('/api/upvote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voteId,
          voterToken: getOrCreateWishlistVoterToken(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upvote failed');

      setEntries((current) => current.map((entry) => (
        entry.id === voteId
          ? { ...entry, upvotes: Number(data.upvotes || 0) }
          : entry
      )));
    } catch {
      // Leave the current count unchanged if the request fails.
    } finally {
      setPendingUpvotes((current) => ({ ...current, [voteId]: false }));
    }
  }

  useEffect(() => {
    if (!selectedGroup) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedUserKey('');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedGroup]);

  return (
    <Shell>
      <section className="minimalWishlist">
        <h1 className="wishlistTitle">WISHLIST</h1>
        <p className="wishlistCountdown">
          {countdown.ended ? 'WISHLIST CLOSED' : `CLOSES IN ${countdown.label}`}
        </p>

        <div className="envelopeGrid" aria-label="Wishlist submissions">
          {userGroups.map((group) => (
            <button
              className="envelopeButton"
              type="button"
              key={group.key}
              onClick={() => setSelectedUserKey(group.key)}
              aria-label={'Open wishes from ' + group.username}
            >
              <EnvelopeIcon />
            </button>
          ))}
        </div>
      </section>

      {selectedGroup ? (
        <div
          className="wishOverlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedUserKey('');
          }}
        >
          <section className="wishLetter" role="dialog" aria-modal="true" aria-label="Wishlist details">
            <button
              className="wishClose"
              type="button"
              aria-label="Close wishlist"
              onClick={() => setSelectedUserKey('')}
            >
              ×
            </button>

            <div className="wishAuthor">
              <span>WISHES FROM</span>
              <strong>{selectedGroup.username === 'Anonymous' ? 'Anonymous' : '@' + selectedGroup.username.replace(/^@/, '')}</strong>
            </div>

            <div className="wishList">
              {selectedGroup.wishes.map((wish, index) => (
                <article className="wishItem" key={wish.id}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h2>{wish.character}</h2>
                  {wish.setting ? <p>{wish.setting}</p> : null}
                  <div className="wishItemActions">
                    <button
                      className="wishVoteButton"
                      type="button"
                      onClick={() => handleUpvote(wish.id)}
                      disabled={!!pendingUpvotes[wish.id]}
                      aria-label={`Upvote ${wish.character}`}
                    >
                      <span aria-hidden="true">↑</span>
                      <span>UPVOTE</span>
                      <strong>{wish.upvotes || 0}</strong>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </Shell>
  );
}

function App() {
  return isVoteRoute ? <VotePage /> : <LivePage />;
}

createRoot(document.getElementById('root')).render(<App />);
