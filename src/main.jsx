import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Heart, Send, Sparkles, Trophy, AlertTriangle, BarChart3, ExternalLink } from "lucide-react";
import "./styles.css";

const SUPABASE_URL = "https://sjqeisfrybspwogmxvdl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWVpc2ZyeWJzcHdvZ214dmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzQ1NjAsImV4cCI6MjA5NDg1MDU2MH0.Pcc75eTPth-zUaqiIh-owCOlq2VVSNdKdhB1ubYEEDg";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OPTIONS = [
  { id: "dante", title: "DANTE", subtitle: "DEVIL MAY CRY", category: "NOSTALGIA GAME" },
  { id: "vergil", title: "VERGIL", subtitle: "DEVIL MAY CRY", category: "NOSTALGIA GAME" },
  { id: "solid-snake", title: "SOLID SNAKE", subtitle: "METAL GEAR SOLID", category: "PLAYSTATION CORE" },
  { id: "raiden", title: "RAIDEN", subtitle: "METAL GEAR SOLID", category: "PLAYSTATION CORE" },
  { id: "scorpion", title: "SCORPION", subtitle: "MORTAL KOMBAT", category: "ARCADE / FIGHTING" },
  { id: "sub-zero", title: "SUB-ZERO", subtitle: "MORTAL KOMBAT", category: "ARCADE / FIGHTING" },
  { id: "cloud-strife", title: "CLOUD STRIFE", subtitle: "FINAL FANTASY VII", category: "JRPG ICON" },
  { id: "sephiroth", title: "SEPHIROTH", subtitle: "FINAL FANTASY VII", category: "JRPG ICON" },
  { id: "leon", title: "LEON S. KENNEDY", subtitle: "RESIDENT EVIL 4", category: "SURVIVAL HORROR" },
  { id: "pyramid-head", title: "PYRAMID HEAD", subtitle: "SILENT HILL 2", category: "SURVIVAL HORROR" },
  { id: "kratos", title: "KRATOS", subtitle: "GOD OF WAR", category: "PLAYSTATION CORE" },
  { id: "tifa", title: "TIFA LOCKHART", subtitle: "FINAL FANTASY VII", category: "JRPG ICON" },
  { id: "frieren", title: "FRIEREN", subtitle: "BEYOND JOURNEY’S END", category: "CURRENT ANIME" },
  { id: "fern", title: "FERN", subtitle: "BEYOND JOURNEY’S END", category: "CURRENT ANIME" },
  { id: "gojo", title: "GOJO SATORU", subtitle: "JUJUTSU KAISEN", category: "POPULAR ANIME" },
  { id: "denji", title: "DENJI", subtitle: "CHAINSAW MAN", category: "POPULAR ANIME" }
];

const MAX_VOTES = 3;
const VOTE_RECEIPT_KEY = "wishlist_vote_receipt_v1";
const DRAFT_KEY = "wishlist_vote_draft_v1";

function titleFor(id) {
  return OPTIONS.find((option) => option.id === id)?.title || id;
}

function optionFor(id) {
  return OPTIONS.find((option) => option.id === id);
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getVoteReceipt() {
  try {
    const raw = localStorage.getItem(VOTE_RECEIPT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setVoteReceipt(receipt) {
  localStorage.setItem(VOTE_RECEIPT_KEY, JSON.stringify(receipt));
  localStorage.removeItem(DRAFT_KEY);
}

function VoteHearts({ count }) {
  return (
    <div className="hearts" aria-label={`${count} of ${MAX_VOTES} votes selected`}>
      {Array.from({ length: MAX_VOTES }).map((_, index) => {
        const active = index < count;
        return (
          <motion.span
            key={index}
            initial={false}
            animate={active ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: 0.22 }}
            className={cn("heart", active && "heartActive")}
          >
            <Heart size={16} className={active ? "filled" : ""} />
          </motion.span>
        );
      })}
    </div>
  );
}

function DebugBox({ status, lastError }) {
  const debug = new URLSearchParams(window.location.search).has("debug");
  if (!debug) return null;

  return (
    <div className="debugBox">
      <strong>Debug</strong>
      <span>Supabase URL: {SUPABASE_URL ? "found" : "missing"}</span>
      <span>Anon key: {SUPABASE_ANON_KEY ? "found" : "missing"}</span>
      <span>Client: {status}</span>
      {lastError ? <span className="errorText">Last error: {lastError}</span> : null}
    </div>
  );
}

function VoteCard({ option, selectedCount, locked, onVote }) {
  const isSelected = selectedCount > 0;
  const disabled = locked;

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => onVote(option.id)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!disabled ? { y: -4, scale: 1.012 } : undefined}
      whileTap={!disabled ? { scale: 0.96 } : undefined}
      className={cn("card", isSelected && "cardSelected", disabled && "cardDisabled")}
    >
      <div className={cn("cardStripe", isSelected && "cardStripeSelected")} />
      <div>
        <p className="category">{option.category}</p>
        <h2>{option.title}</h2>
        <p className="subtitle">{option.subtitle}</p>
      </div>
      <div className="cardBottom">
        <span>{locked ? "LOCKED" : isSelected ? `${selectedCount} VOTE${selectedCount > 1 ? "S" : ""}` : "VOTE"}</span>
        <span className={cn("cardIcon", isSelected && "cardIconSelected")}>
          {locked ? <Check size={17} /> : <Heart size={17} className={isSelected ? "filled" : ""} />}
        </span>
      </div>
    </motion.button>
  );
}

function VotingPage() {
  const [selected, setSelected] = useState([]);
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastError, setLastError] = useState("");
  const [status, setStatus] = useState("connected");

  useEffect(() => {
    setReceipt(getVoteReceipt());
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      if (Array.isArray(draft.selected)) setSelected(draft.selected);
      if (typeof draft.note === "string") setNote(draft.note);
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    if (!receipt) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ selected, note }));
    }
  }, [selected, note, receipt]);

  const locked = Boolean(receipt);
  const selectedOptions = useMemo(() => selected.map(optionFor).filter(Boolean), [selected]);
  const selectedCounts = useMemo(() => {
    return selected.reduce((acc, id) => ({ ...acc, [id]: (acc[id] || 0) + 1 }), {});
  }, [selected]);

  function addVote(id) {
    if (locked || submitting) return;
    if (selected.length >= MAX_VOTES) return;
    setSelected((current) => [...current, id]);
  }

  async function submitVote() {
    setLastError("");
    if (locked || submitting || selected.length === 0) return;
    setSubmitting(true);

    const selectedTitles = selected.map(titleFor);

    const { data, error } = await supabase
      .from("wishlist_votes")
      .insert({
        selected_ids: selected,
        selected_titles: selectedTitles,
        note: note.trim() || null
      })
      .select("id, created_at")
      .single();

    if (error) {
      setStatus("error");
      setLastError(error.message || "Unknown Supabase error");
      setSubmitting(false);
      return;
    }

    const nextReceipt = {
      id: data?.id || crypto.randomUUID(),
      created_at: data?.created_at || new Date().toISOString(),
      selected,
      selected_titles: selectedTitles,
      note: note.trim() || ""
    };

    setVoteReceipt(nextReceipt);
    setReceipt(nextReceipt);
    setStatus("connected");
    setSubmitting(false);
  }

  return (
    <main className="page">
      <section className="shell">
        <motion.div className="topBar" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="topLeft">
            <div className="logoHeart"><Heart size={18} className="filled" /></div>
            <div>
              <p>Wishlist voting</p>
              <strong>{locked ? "Your vote is locked" : "Choose up to 3 characters"}</strong>
            </div>
          </div>
          <div className="topRight">
            <VoteHearts count={locked ? receipt.selected.length : selected.length} />
            <button className="primarySmall" onClick={submitVote} disabled={locked || submitting || selected.length === 0}>
              <Send size={15} />
              {locked ? "Locked" : submitting ? "Saving" : "Submit"}
            </button>
          </div>
        </motion.div>

        <div className="hero">
          <div>
            <div className="badge"><Sparkles size={16} /> Patreon wishlist vote</div>
            <h1>What should we sculpt next?</h1>
            <p>Vote for up to 3 characters you would like to see as future multipart 3D printable models.</p>
          </div>
          <div className="voteStatus">
            <p>{locked ? "Vote submitted" : "Votes selected"}</p>
            <strong>{locked ? receipt.selected.length : selected.length}/{MAX_VOTES}</strong>
            <VoteHearts count={locked ? receipt.selected.length : selected.length} />
          </div>
        </div>

        <AnimatePresence>
          {locked && (
            <motion.div className="lockedNotice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Check size={20} />
              <div>
                <strong>Your wishlist vote has been saved and locked.</strong>
                <span>Thanks for voting. Your selections can no longer be reset from this page.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {lastError ? (
          <div className="errorBox"><AlertTriangle size={18} /> {lastError}</div>
        ) : null}

        <div className="grid">
          {OPTIONS.map((option) => (
            <VoteCard
              key={option.id}
              option={option}
              selectedCount={locked ? (receipt.selected.filter((id) => id === option.id).length) : (selectedCounts[option.id] || 0)}
              locked={locked}
              onVote={addVote}
            />
          ))}
        </div>

        <div className="footerGrid">
          <label className="noteBox">
            <span>Other wishlist ideas</span>
            <textarea
              value={locked ? receipt.note || "" : note}
              onChange={(event) => setNote(event.target.value)}
              disabled={locked || submitting}
              placeholder="Optional: write another character, series, benefit, file feature, or Patreon improvement..."
            />
          </label>
          <div className="actions">
            <button className="primary" onClick={submitVote} disabled={locked || submitting || selected.length === 0}>
              <Send size={18} />
              {locked ? "Vote locked" : submitting ? "Saving vote" : "Submit vote"}
            </button>
            <a className="secondary" href="?results=1">
              <BarChart3 size={18} /> View live results
            </a>
          </div>
        </div>

        <DebugBox status={status} lastError={lastError} />
      </section>
    </main>
  );
}

function ResultsPage() {
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadCounts() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase.from("wishlist_vote_counts").select("option_id, votes");
    if (error) {
      setError(error.message || "Could not load results");
      setLoading(false);
      return;
    }
    const normalized = OPTIONS.map((option) => {
      const found = data?.find((item) => item.option_id === option.id);
      return { ...option, votes: found?.votes || 0 };
    }).sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title));
    setCounts(normalized);
    setLoading(false);
  }

  useEffect(() => {
    loadCounts();
    const interval = setInterval(loadCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalVotes = counts.reduce((sum, option) => sum + option.votes, 0);
  const winner = counts[0];

  return (
    <main className="page">
      <section className="shell resultsShell">
        <div className="hero resultsHero">
          <div>
            <div className="badge"><Trophy size={16} /> Live wishlist results</div>
            <h1>Current leading character</h1>
            <p>Live results are calculated from submitted wishlist votes.</p>
          </div>
          <a className="secondary inline" href="/"><ExternalLink size={16} /> Vote page</a>
        </div>

        {loading ? <div className="loading">Loading results...</div> : null}
        {error ? <div className="errorBox"><AlertTriangle size={18} /> {error}</div> : null}

        {!loading && !error ? (
          <>
            <div className="winnerCard">
              <p>Winning right now</p>
              <h2>{winner?.title || "NO VOTES YET"}</h2>
              <span>{winner?.subtitle || "Share the voting link to start collecting results."}</span>
              <strong>{winner?.votes || 0} votes · {totalVotes > 0 ? Math.round(((winner?.votes || 0) / totalVotes) * 100) : 0}%</strong>
            </div>

            <div className="resultsList">
              {counts.map((option, index) => {
                const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                return (
                  <div className="resultRow" key={option.id}>
                    <div className="rank">#{index + 1}</div>
                    <div className="resultMain">
                      <div className="resultHeader">
                        <strong>{option.title}</strong>
                        <span>{option.votes} votes · {percent}%</span>
                      </div>
                      <p>{option.subtitle}</p>
                      <div className="bar"><div style={{ width: `${percent}%` }} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("results")) return <ResultsPage />;
  return <VotingPage />;
}

createRoot(document.getElementById("root")).render(<App />);
