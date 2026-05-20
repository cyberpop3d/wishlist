import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Heart, Sparkles, RotateCcw, Send } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

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
  { id: "denji", title: "DENJI", subtitle: "CHAINSAW MAN", category: "POPULAR ANIME" },
];

const MAX_VOTES = 3;
const STORAGE_KEY = "patreon-wishlist-vote-v1";

const supabaseUrl = "https://sjqeisfrybspwogmxvdl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqcWVpc2ZyeWJzcHdvZ214dmRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzQ1NjAsImV4cCI6MjA5NDg1MDU2MH0.Pcc75eTPth-zUaqiIh-owCOlq2VVSNdKdhB1ubYEEDg";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const debugMode = new URLSearchParams(window.location.search).get("debug") === "1";

function VoteHearts({ count, compact = false }) {
  return (
    <div className={compact ? "hearts hearts-compact" : "hearts"} aria-label={`${count} of ${MAX_VOTES} votes selected`}>
      {Array.from({ length: MAX_VOTES }).map((_, index) => {
        const active = index < count;
        return (
          <motion.span
            key={index}
            initial={false}
            animate={active ? { scale: [1, 1.22, 1] } : { scale: 1 }}
            transition={{ duration: 0.22 }}
            className={active ? "heart active" : "heart"}
          >
            <Heart size={compact ? 15 : 18} className={active ? "filled" : ""} />
          </motion.span>
        );
      })}
    </div>
  );
}

function App() {
  const [selected, setSelected] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setSelected(parsed.selected || []);
      setSubmitted(Boolean(parsed.submitted));
      setNote(parsed.note || "");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected, submitted, note }));
  }, [selected, submitted, note]);

  const selectedOptions = useMemo(() => OPTIONS.filter((option) => selected.includes(option.id)), [selected]);

  const toggleVote = (id) => {
    if (submitted || submitting) return;
    setError("");
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX_VOTES) return current;
      return [...current, id];
    });
  };

  const resetVote = () => {
    setSelected([]);
    setSubmitted(false);
    setSubmitting(false);
    setNote("");
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  const submitVote = async () => {
    if (selected.length === 0 || submitted || submitting) return;
    setSubmitting(true);
    setError("");

    const payload = {
      selected_ids: selected,
      selected_titles: selectedOptions.map((option) => option.title),
      note: note.trim() || null,
    };

    try {
      if (!supabase) {
        throw new Error("Supabase is not connected. Please check the Supabase URL/key in the source code.");
      }

      const { error: insertError } = await supabase.from("wishlist_votes").insert(payload);
      if (insertError) throw insertError;

      setSubmitted(true);
    } catch (err) {
      const message = err?.message || "Unknown error";
      setError(`Vote could not be saved: ${message}`);
      console.error("Wishlist vote save error:", err, payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <section className="shell">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky-bar">
          <div className="sticky-left">
            <div className="sticky-icon"><Heart size={18} className="filled" /></div>
            <div>
              <p className="eyebrow dim">Wishlist voting</p>
              <p className="sticky-title">Choose up to 3 characters</p>
            </div>
          </div>
          <div className="sticky-actions">
            <VoteHearts count={selected.length} compact />
            <motion.button type="button" onClick={submitVote} disabled={selected.length === 0 || submitted || submitting} whileTap={{ scale: 0.98 }} className="button primary small">
              <Send size={15} /> {submitted ? "Saved" : submitting ? "Saving" : "Submit"}
            </motion.button>
          </div>
        </motion.div>

        <div className="hero">
          <div className="hero-bg" />
          <div className="hero-grid">
            <div>
              <div className="pill"><Sparkles size={16} /> Patreon wishlist vote</div>
              <h1>What should we sculpt next?</h1>
              <p className="lead">Vote for up to 3 characters you would like to see as future multipart 3D printable models.</p>
            </div>
            <div className="vote-panel">
              <div className="vote-panel-top">
                <div>
                  <p className="muted">Votes used</p>
                  <p className="counter">{selected.length}/{MAX_VOTES}</p>
                </div>
                <VoteHearts count={selected.length} />
              </div>
              <div className="chips">
                <AnimatePresence initial={false}>
                  {selectedOptions.length === 0 ? (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="empty">Pick your favorites below.</motion.span>
                  ) : (
                    selectedOptions.map((option) => (
                      <motion.span key={option.id} initial={{ opacity: 0, scale: 0.8, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: -6 }} className="chip">
                        {option.title}
                      </motion.span>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className="grid">
          {OPTIONS.map((option, index) => {
            const isSelected = selected.includes(option.id);
            const isDisabled = submitted || submitting || (!isSelected && selected.length >= MAX_VOTES);
            return (
              <motion.button key={option.id} type="button" onClick={() => toggleVote(option.id)} disabled={isDisabled} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }} whileHover={!isDisabled ? { y: -4, scale: 1.015 } : undefined} whileTap={!isDisabled ? { scale: 0.96 } : undefined} className={isSelected ? "card selected" : isDisabled ? "card disabled" : "card"}>
                <div className="top-line" />
                <div className="card-content">
                  <div>
                    <p className="eyebrow">{option.category}</p>
                    <h2>{option.title}</h2>
                    <p className="subtitle">{option.subtitle}</p>
                  </div>
                  <div className="card-bottom">
                    <span>{isSelected ? "Selected" : "Vote"}</span>
                    <span className="select-circle">{isSelected ? <Check size={18} /> : <Heart size={17} />}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="bottom-area">
          <label className="note-box">
            <span>Other wishlist ideas</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={submitted || submitting} placeholder="Optional: write another character, series, benefit, file feature, or Patreon improvement..." />
          </label>
          <div className="button-stack">
            <motion.button type="button" onClick={submitVote} disabled={selected.length === 0 || submitted || submitting} whileTap={{ scale: 0.98 }} className="button primary">
              <Send size={18} /> {submitted ? "Vote saved" : submitting ? "Saving vote" : "Submit vote"}
            </motion.button>
            <button type="button" onClick={resetVote} className="button secondary"><RotateCcw size={18} /> Reset</button>
          </div>
        </div>

        {debugMode && (
          <div className="message debug">
            <p>Debug mode</p>
            <span>Supabase URL: {supabaseUrl ? "found" : "missing"}</span>
            <span>Anon key: {supabaseAnonKey ? "found" : "missing"}</span>
            <span>Client: {supabase ? "connected" : "not connected"}</span>
          </div>
        )}

        {error && <div className="message error">{error}</div>}

        <AnimatePresence>
          {submitted && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="message success">
              <p>Thanks for voting.</p>
              <span>Your wishlist has been saved.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
