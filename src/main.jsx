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
const CAMPAIGN_END = new Date('2026-09-27T19:43:00Z');
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
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    active: now >= CAMPAIGN_START && now < CAMPAIGN_END,
    ended: now >= CAMPAIGN_END,
    label: [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':'),
  };
}

function Countdown({ compact = false }) {
  const countdown = useCountdown();

  return (
    <div className={`countdown ${compact ? 'compact' : ''} ${countdown.ended ? 'ended' : ''}`}>
      <span>{countdown.ended ? 'Wishlist closed' : 'Wishlist closes in'}</span>
      <strong>{countdown.ended ? '00:00:00' : countdown.label}</strong>
      {!compact ? <small>One day only · September 26–27</small> : null}
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
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';

    function writeU32(bytes, offset, value) {
      bytes[offset] = (value >>> 24) & 255;
      bytes[offset + 1] = (value >>> 16) & 255;
      bytes[offset + 2] = (value >>> 8) & 255;
      bytes[offset + 3] = value & 255;
    }

    async function loadWishPortalVideo() {
      try {
        // The original upload was split into text chunks for GitHub/Vercel.
        // One later chunk is damaged, but the first 71 frames are intact.
        // Build a clean ~8.9s loop from the intact portion and patch the MP4
        // sample tables so browsers can play it normally.
        const chunkNames = [
          'chunk-00.txt',
          'chunk-01.txt',
          'chunk-02.txt',
          'chunk-03.txt',
          'chunk-04.txt',
          'chunk-05.txt',
          'chunk-06.txt',
          'chunk-07.txt',
        ];

        const parts = await Promise.all(
          chunkNames.map(async (name) => {
            const response = await fetch('/wishportal/' + name, { cache: 'force-cache' });
            if (!response.ok) throw new Error('Could not load wish portal video.');
            return (await response.text()).trim();
          }),
        );

        const joined = parts.join('');

        // 123,708 base64 characters decode to 92,781 intact bytes.
        // Keep exactly the first 92,779 bytes: MP4 header + frames 0–70.
        const safeBase64 = joined.slice(0, 123708);
        const binary = window.atob(safeBase64);
        const decoded = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          decoded[index] = binary.charCodeAt(index);
        }

        const SAFE_FILE_SIZE = 92779;
        const SAFE_SAMPLE_COUNT = 71;
        const SAFE_MOVIE_DURATION = 8875;
        const SAFE_MEDIA_DURATION = 145408;
        const SAFE_CTTS_ENTRY_COUNT = 35;
        const MDAT_OFFSET = 1688;

        const bytes = decoded.slice(0, SAFE_FILE_SIZE);

        // mvhd duration
        writeU32(bytes, 64, SAFE_MOVIE_DURATION);
        // tkhd duration
        writeU32(bytes, 184, SAFE_MOVIE_DURATION);
        // elst segment_duration
        writeU32(bytes, 272, SAFE_MOVIE_DURATION);
        // mdhd duration
        writeU32(bytes, 316, SAFE_MEDIA_DURATION);
        // stts sample_count
        writeU32(bytes, 656, SAFE_SAMPLE_COUNT);
        // ctts entry_count: entries 0–34 sum to 71 samples exactly
        writeU32(bytes, 696, SAFE_CTTS_ENTRY_COUNT);
        // stsz sample_count
        writeU32(bytes, 1096, SAFE_SAMPLE_COUNT);
        // mdat box size after truncating the damaged tail
        writeU32(bytes, MDAT_OFFSET, SAFE_FILE_SIZE - MDAT_OFFSET);

        objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'video/mp4' }));
        if (!cancelled) {
          setVideoUrl(objectUrl);
          setError('');
        }
      } catch {
        if (!cancelled) setError('Wish Portal video could not be loaded.');
      }
    }

    loadWishPortalVideo();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

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
            {videoUrl ? (
              <video
                className="portalVideo"
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
              />
            ) : (
              <div className="portalVideoLoading">WISH PORTAL</div>
            )}
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
  const [entries, setEntries] = useState([]);
  const [selectedUserKey, setSelectedUserKey] = useState('');

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
