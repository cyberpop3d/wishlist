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
const OWNER_USERNAME = 'cyberpop3d';

const LIVE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
];

const LIVE_COPY = {
  en: {
    wishlist: 'WISHLIST',
    closed: 'WISHLIST CLOSED',
    closesIn: 'CLOSES IN',
    wishesFrom: 'WISHES FROM',
    aboutWishlist: 'ABOUT THE WISHLIST',
    upvote: 'UPVOTE',
    upvoted: 'UPVOTED',
    language: 'LANGUAGE',
    ownerLine1: 'Share proposals and support the ideas you like by upvoting them.',
    ownerLine2: "We will consider each idea, including the ones with 0 upvotes, so don't worry.",
  },
  pt: {
    wishlist: 'LISTA DE DESEJOS',
    closed: 'LISTA ENCERRADA',
    closesIn: 'TERMINA EM',
    wishesFrom: 'IDEIAS DE',
    aboutWishlist: 'SOBRE A LISTA',
    upvote: 'VOTAR',
    upvoted: 'VOTADO',
    language: 'IDIOMA',
    ownerLine1: 'Compartilhe propostas e apoie as ideias que você gosta votando nelas.',
    ownerLine2: 'Vamos considerar todas as ideias, inclusive as que tiverem 0 votos, então não se preocupe.',
  },
  es: {
    wishlist: 'LISTA DE DESEOS',
    closed: 'LISTA CERRADA',
    closesIn: 'CIERRA EN',
    wishesFrom: 'IDEAS DE',
    aboutWishlist: 'SOBRE LA LISTA',
    upvote: 'VOTAR',
    upvoted: 'VOTADO',
    language: 'IDIOMA',
    ownerLine1: 'Comparte propuestas y apoya las ideas que te gusten votándolas.',
    ownerLine2: 'Tendremos en cuenta todas las ideas, incluidas las que tengan 0 votos, así que no te preocupes.',
  },
  fr: {
    wishlist: 'LISTE DE SOUHAITS',
    closed: 'LISTE FERMÉE',
    closesIn: 'SE TERMINE DANS',
    wishesFrom: 'IDÉES DE',
    aboutWishlist: 'À PROPOS DE LA LISTE',
    upvote: 'VOTER',
    upvoted: 'VOTÉ',
    language: 'LANGUE',
    ownerLine1: 'Partagez vos propositions et soutenez les idées que vous aimez en votant pour elles.',
    ownerLine2: 'Nous examinerons chaque idée, y compris celles avec 0 vote, alors ne vous inquiétez pas.',
  },
  de: {
    wishlist: 'WUNSCHLISTE',
    closed: 'WUNSCHLISTE GESCHLOSSEN',
    closesIn: 'ENDET IN',
    wishesFrom: 'IDEEN VON',
    aboutWishlist: 'ÜBER DIE WUNSCHLISTE',
    upvote: 'UPVOTE',
    upvoted: 'GEVOTET',
    language: 'SPRACHE',
    ownerLine1: 'Teile Vorschläge und unterstütze Ideen, die dir gefallen, mit einem Upvote.',
    ownerLine2: 'Wir berücksichtigen jede Idee, auch solche mit 0 Upvotes, also keine Sorge.',
  },
  it: {
    wishlist: 'LISTA DEI DESIDERI',
    closed: 'LISTA CHIUSA',
    closesIn: 'CHIUDE TRA',
    wishesFrom: 'IDEE DI',
    aboutWishlist: 'SULLA LISTA',
    upvote: 'VOTA',
    upvoted: 'VOTATO',
    language: 'LINGUA',
    ownerLine1: 'Condividi le tue proposte e sostieni le idee che ti piacciono votandole.',
    ownerLine2: 'Prenderemo in considerazione ogni idea, comprese quelle con 0 voti, quindi non preoccuparti.',
  },
};

function getStoredLiveLanguage() {
  try {
    const stored = window.localStorage.getItem('yontuk-live-language');
    return LIVE_LANGUAGES.some((language) => language.code === stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

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
  const normalizedUsernameDraft = usernameDraft.trim().replace(/^@+/, '').toLowerCase();
  const reservedUsername = normalizedUsernameDraft === OWNER_USERNAME;
  const canSaveUsername = usernameDraft.trim().replace(/^@+/, '').length >= 2
    && !reservedUsername;
  const canSubmitWishes = countdown.active
    && cleanUsername.length >= 2
    && wishes.some((wish) => wish.trim().length >= 2)
    && !submitting;

  function saveUsername(event) {
    event.preventDefault();
    const nextUsername = usernameDraft.trim().replace(/^@+/, '');
    if (nextUsername.length < 2) return;
    if (nextUsername.toLowerCase() === OWNER_USERNAME) {
      setError('@cyberpop3d is reserved.');
      return;
    }
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

    const rows = wishes
      .map((wish, index) => ({
        selected_ids: [`${CAMPAIGN_PREFIX}portal-${index + 1}`],
        selected_titles: [wish.trim()],
        note: '',
        username: cleanUsername,
      }))
      .filter((row) => row.selected_titles[0].length >= 2);

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
                onChange={(event) => {
                  setUsernameDraft(event.target.value);
                  setError('');
                }}
                placeholder="username"
                autoComplete="off"
                maxLength={60}
              />
            </div>
            {reservedUsername ? (
              <p className="portalInlineError">@cyberpop3d is reserved.</p>
            ) : null}
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
    viewerUpvoted: Boolean(vote.viewerUpvoted),
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
  const [magicFx, setMagicFx] = useState(null);
  const [liveLanguage, setLiveLanguage] = useState(getStoredLiveLanguage);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [translations, setTranslations] = useState({});
  const [translatingGroupKey, setTranslatingGroupKey] = useState('');
  const copy = LIVE_COPY[liveLanguage] || LIVE_COPY.en;

  async function loadWishlist() {
    try {
      const voterToken = getOrCreateWishlistVoterToken();
      const response = await fetch(
        `/api/live-dashboard?voterToken=${encodeURIComponent(voterToken)}`,
        { cache: 'no-store' }
      );
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
        ? entry.username.replace(/^@+/, '').toLowerCase()
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
  const selectedGroupIsOwner = selectedGroup?.key === OWNER_USERNAME;

  useEffect(() => {
    try {
      window.localStorage.setItem('yontuk-live-language', liveLanguage);
    } catch {
      // Language preference still works for the current visit.
    }
  }, [liveLanguage]);

  useEffect(() => {
    if (!selectedGroup || selectedGroupIsOwner || liveLanguage === 'en') {
      setTranslatingGroupKey('');
      return undefined;
    }

    const missingWishes = selectedGroup.wishes.filter((wish) => (
      !translations[`${liveLanguage}:${wish.id}:character`]
      || (wish.setting && !translations[`${liveLanguage}:${wish.id}:setting`])
    ));

    if (!missingWishes.length) {
      setTranslatingGroupKey('');
      return undefined;
    }

    let cancelled = false;
    setTranslatingGroupKey(selectedGroup.key);

    const textPlan = [];
    missingWishes.forEach((wish) => {
      textPlan.push({
        key: `${liveLanguage}:${wish.id}:character`,
        text: wish.character,
      });
      if (wish.setting) {
        textPlan.push({
          key: `${liveLanguage}:${wish.id}:setting`,
          text: wish.setting,
        });
      }
    });

    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: liveLanguage,
        texts: textPlan.map((item) => item.text),
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Translation failed');
        if (cancelled) return;

        const next = {};
        textPlan.forEach((item, index) => {
          next[item.key] = String(data.translations?.[index] || item.text);
        });
        setTranslations((current) => ({ ...current, ...next }));
      })
      .catch(() => {
        // Keep original text if automatic translation is temporarily unavailable.
      })
      .finally(() => {
        if (!cancelled) setTranslatingGroupKey('');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGroup, selectedGroupIsOwner, liveLanguage, translations]);

  function translatedWishValue(wish, field) {
    if (liveLanguage === 'en') return wish[field];
    return translations[`${liveLanguage}:${wish.id}:${field}`] || wish[field];
  }

  async function handleUpvote(voteId, event) {
    if (!voteId || pendingUpvotes[voteId]) return;

    const buttonRect = event?.currentTarget?.getBoundingClientRect?.();
    const clickX = event?.clientX || (buttonRect ? buttonRect.left + buttonRect.width / 2 : window.innerWidth / 2);
    const clickY = event?.clientY || (buttonRect ? buttonRect.top + buttonRect.height / 2 : window.innerHeight / 2);

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
          ? {
              ...entry,
              upvotes: Number(data.upvotes || 0),
              viewerUpvoted: Boolean(data.upvoted),
            }
          : entry
      )));

      if (data.upvoted) {
        const fxKey = `${voteId}-${Date.now()}`;
        setMagicFx({ x: clickX, y: clickY, key: fxKey });
        window.setTimeout(() => {
          setMagicFx((current) => current?.key === fxKey ? null : current);
        }, 720);
      }
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
      <div className="languagePickerWrap">
        <button
          className={`languagePickerButton ${languageOpen ? 'open' : ''}`}
          type="button"
          onClick={() => setLanguageOpen((current) => !current)}
          aria-expanded={languageOpen}
          aria-haspopup="menu"
        >
          <span>LANGUAGE</span>
          <i className="languageChevron" aria-hidden="true">⌄</i>
        </button>

        {languageOpen ? (
          <div className="languageMenu" role="menu">
            {LIVE_LANGUAGES.map((language) => (
              <button
                key={language.code}
                className={language.code === liveLanguage ? 'active' : ''}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLiveLanguage(language.code);
                  setLanguageOpen(false);
                }}
              >
                <span>{language.label}</span>
                {language.code === liveLanguage ? <i aria-hidden="true">•</i> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <section className="minimalWishlist">
        <h1 className="wishlistTitle">{copy.wishlist}</h1>
        <p className="wishlistCountdown">
          {countdown.ended ? copy.closed : `${copy.closesIn} ${countdown.label}`}
        </p>

        <div className="envelopeGrid" aria-label="Wishlist submissions">
          {userGroups.map((group) => {
            const totalUpvotes = group.wishes.reduce(
              (sum, wish) => sum + Number(wish.upvotes || 0),
              0
            );
            const displayUsername = group.username === 'Anonymous'
              ? 'Anonymous'
              : '@' + group.username.replace(/^@+/, '');
            const isOwnerGroup = group.key === OWNER_USERNAME;

            return (
              <div className={`envelopeEntry ${isOwnerGroup ? 'ownerEnvelopeEntry' : ''}`} key={group.key}>
                <button
                  className={`envelopeButton ${isOwnerGroup ? 'ownerEnvelopeButton' : ''}`}
                  type="button"
                  onClick={() => setSelectedUserKey(group.key)}
                  aria-label={'Open wishes from ' + group.username}
                >
                  {!isOwnerGroup ? (
                    <span
                      className="envelopeVoteCount"
                      aria-label={totalUpvotes + ' total upvotes'}
                    >
                      <span aria-hidden="true">↑</span>
                      <strong>{totalUpvotes}</strong>
                    </span>
                  ) : null}
                  <EnvelopeIcon />
                </button>
                <span className="envelopeUsername">{displayUsername}</span>
              </div>
            );
          })}
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
          <section
            className={`wishLetter ${selectedGroupIsOwner ? 'ownerWishLetter' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Wishlist details"
          >
            <button
              className="wishClose"
              type="button"
              aria-label="Close wishlist"
              onClick={() => setSelectedUserKey('')}
            >
              ×
            </button>

            <div className="wishAuthor">
              <span>{selectedGroupIsOwner ? copy.aboutWishlist : copy.wishesFrom}</span>
              <strong>{selectedGroup.username === 'Anonymous' ? 'Anonymous' : '@' + selectedGroup.username.replace(/^@+/, '')}</strong>
            </div>

            {selectedGroupIsOwner ? (
              <div className="ownerNotice">
                <p>{copy.ownerLine1}</p>
                <p>{copy.ownerLine2}</p>
              </div>
            ) : (
              <div className="wishList">
                {selectedGroup.wishes.map((wish, index) => (
                  <article className="wishItem" key={wish.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <h2>{translatedWishValue(wish, 'character')}</h2>
                    {wish.setting ? <p>{translatedWishValue(wish, 'setting')}</p> : null}
                    <div className="wishItemActions">
                      <button
                        className={`wishVoteButton ${wish.viewerUpvoted ? 'voted' : ''}`}
                        type="button"
                        onClick={(event) => handleUpvote(wish.id, event)}
                        disabled={!!pendingUpvotes[wish.id]}
                        aria-pressed={wish.viewerUpvoted}
                        aria-label={wish.viewerUpvoted
                          ? `Remove upvote from ${wish.character}`
                          : `Upvote ${wish.character}`}
                      >
                        <span aria-hidden="true">{wish.viewerUpvoted ? '✓' : '↑'}</span>
                        <span>{wish.viewerUpvoted ? copy.upvoted : copy.upvote}</span>
                        <strong>{wish.upvotes || 0}</strong>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
            {!selectedGroupIsOwner && translatingGroupKey === selectedGroup.key ? (
              <span className="translationStatus" aria-live="polite">•••</span>
            ) : null}
          </section>
        </div>
      ) : null}

      {magicFx ? (
        <span
          key={magicFx.key}
          className="magicClickFx"
          style={{ left: magicFx.x, top: magicFx.y }}
          aria-hidden="true"
        >
          <i className="magicSpark magicSpark1">✦</i>
          <i className="magicSpark magicSpark2">✧</i>
          <i className="magicSpark magicSpark3">•</i>
          <i className="magicSpark magicSpark4">✦</i>
          <i className="magicSpark magicSpark5">•</i>
          <i className="magicSpark magicSpark6">✧</i>
        </span>
      ) : null}
    </Shell>
  );
}

function App() {
  return isVoteRoute ? <VotePage /> : <LivePage />;
}

createRoot(document.getElementById('root')).render(<App />);
