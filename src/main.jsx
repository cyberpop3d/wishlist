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
  const [character, setCharacter] = useState('');
  const [setting, setSetting] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const canSubmit = countdown.active
    && character.trim().length >= 2
    && setting.trim().length >= 2
    && !submitting;

  async function submitWishlist(event) {
    event.preventDefault();
    if (!canSubmit) return;

    if (!supabase) {
      setError('Wishlist connection is temporarily unavailable.');
      setStatus('error');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatus('idle');

    const cleanCharacter = character.trim();
    const cleanSetting = setting.trim();
    const settingSlug = slugify(cleanSetting) || 'custom';

    const { error: insertError } = await supabase.from('wishlist_votes').insert({
      selected_ids: [`${CAMPAIGN_PREFIX}${settingSlug}`],
      selected_titles: [cleanCharacter],
      note: cleanSetting,
      username: null,
    });

    if (insertError) {
      setError(insertError.message || 'Could not save your wishlist idea.');
      setStatus('error');
      setSubmitting(false);
      return;
    }

    setCharacter('');
    setSetting('');
    setStatus('saved');
    setSubmitting(false);
  }

  return (
    <Shell>
      <BrandBar mode="vote" />

      <section className="campaignHero">
        <div className="heroCopy">
          <div className="eyebrow"><span className="liveDot" /> 24 HOURS ONLY</div>
          <h1>BUILD THE NEXT WISHLIST.</h1>
          <p>
            Tell us the character you want and the setting you want to see them in.
            We are collecting wishlist ideas for one day only.
          </p>
        </div>
        <Countdown />
      </section>

      <form className="wishlistForm" onSubmit={submitWishlist}>
        <div className="fieldBlock">
          <label htmlFor="character">Character</label>
          <input
            id="character"
            value={character}
            onChange={(event) => setCharacter(event.target.value)}
            maxLength={90}
            autoComplete="off"
            placeholder="e.g. Spawn, Wonder Woman, Akuma..."
            disabled={!countdown.active || submitting}
          />
          <small>Write the exact character you want us to consider.</small>
        </div>

        <div className="fieldBlock">
          <label htmlFor="setting">Setting / concept</label>
          <textarea
            id="setting"
            value={setting}
            onChange={(event) => setSetting(event.target.value)}
            maxLength={180}
            placeholder="e.g. rain-soaked urban rooftop, 90s mob boss, wild west..."
            disabled={!countdown.active || submitting}
          />
          <small>Describe the world, outfit direction, mood, era, or theme.</small>
        </div>

        <details className="recommendations">
          <summary>
            <span>
              <b>Recommendations</b>
              <small>Need a direction? Open style ideas.</small>
            </span>
            <i>+</i>
          </summary>
          <div className="recommendationBody">
            <p>Pick one as a starting point. You can still edit the setting afterwards.</p>
            <div className="recommendationChips">
              {SETTING_RECOMMENDATIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={setting.toLowerCase() === item.toLowerCase() ? 'selected' : ''}
                  onClick={() => setSetting(item)}
                  disabled={!countdown.active || submitting}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </details>

        {status === 'saved' ? (
          <div className="formNotice success">
            <strong>Added to the wishlist.</strong>
            <span>You can submit another character + setting while the 24-hour window is open.</span>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="formNotice error">
            <strong>Could not submit.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        {!countdown.active ? (
          <div className="formNotice closed">
            <strong>The 24-hour wishlist window is closed.</strong>
            <span>You can still view everything collected on the live page.</span>
          </div>
        ) : null}

        <div className="submitRow">
          <button className="submitButton" type="submit" disabled={!canSubmit}>
            {submitting ? 'Adding...' : 'Add to Wishlist'}
          </button>
          <a className="secondaryLink" href={liveUrl}>Watch the live wishlist →</a>
        </div>
      </form>
    </Shell>
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

  if (!character || !setting) return null;

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
                  <p>{wish.setting}</p>
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
