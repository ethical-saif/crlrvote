import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { LogIn, LogOut, CheckCircle2, Vote, Sparkles, AlertTriangle, User } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Card, Button, Input, Skeleton, Modal } from '../components/ui.jsx';

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0].toUpperCase());
  return letters.join('') || '?';
}

function CandidateCard({ c, selected, onSelect, nameAttr }) {
  return (
    <label className="block cursor-pointer">
      <input
        type="radio"
        name={nameAttr}
        value={c.id}
        checked={selected}
        onChange={() => onSelect(c.id)}
        className="sr-only"
      />
      <motion.div
        whileHover={{ y: -2 }}
        className={`p-4 rounded-2xl border transition shadow-sm flex gap-3 items-start ${
          selected
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10 shadow-indigo-500/10 ring-1 ring-indigo-500/40'
            : 'border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 hover:border-indigo-300 dark:hover:border-indigo-600'
        }`}
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
          selected ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-100'
        }`}>
          {initials(c.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name || '(No name)'}</p>
            {selected && <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Roll: {c.rollNo}</p>
          {c.manifesto && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{c.manifesto}</p>}
        </div>
      </motion.div>
    </label>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('login'); // login | vote | voted
  const [rollNo, setRollNo] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [me, setMe] = useState(null);
  const [candidates, setCandidates] = useState({ CR: [], LR: [] });
  const [candLoading, setCandLoading] = useState(false);
  const [selectedCR, setSelectedCR] = useState('');
  const [selectedLR, setSelectedLR] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justVoted, setJustVoted] = useState(false);

  const hasCR = candidates.CR.length > 0;
  const hasLR = candidates.LR.length > 0;
  const hasAny = hasCR || hasLR;

  const canSubmit = useMemo(() => {
    if (!hasAny) return false;
    if (hasCR && !selectedCR) return false;
    if (hasLR && !selectedLR) return false;
    return true;
  }, [hasAny, hasCR, hasLR, selectedCR, selectedLR]);

  async function loadCandidates(name) {
    setCandLoading(true);
    const { res, data } = await api('/api/candidates');
    setCandLoading(false);
    if (!res.ok || !data.ok) {
      toast(data.error || 'Failed to load candidates.', 'error');
      setCandidates({ CR: [], LR: [] });
      setView('vote');
      return;
    }
    setCandidates(data.candidates || { CR: [], LR: [] });
    setMe((m) => ({ ...(m || {}), name: name ?? (m && m.name) }));
    setView('vote');
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const { res, data } = await api('/api/me');
      if (!alive) return;
      if (!res.ok || !data.ok) {
        setView('login');
        setLoading(false);
        return;
      }
      setMe(data);
      if (data.hasVoted) {
        setView('voted');
        setLoading(false);
      } else {
        await loadCandidates(data.name);
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (view === 'voted' && justVoted) {
      const end = Date.now() + 1200;
      const colors = ['#6366f1', '#d946ef', '#22d3ee', '#f59e0b'];
      (function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors });
    }
  }, [view, justVoted]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    const rn = rollNo.trim().toLowerCase();
    if (!rn) { setLoginError('Please enter your roll number.'); return; }
    setLoginLoading(true);
    try {
      const { res, data } = await api('/api/login', { method: 'POST', body: { rollNo: rn } });
      if (!res.ok || !data.ok) {
        setLoginError(data.error || 'Login failed.');
        return;
      }
      setMe({ name: data.name, hasVoted: data.hasVoted });
      if (data.hasVoted) {
        setView('voted');
      } else {
        await loadCandidates(data.name);
      }
    } catch (e) {
      setLoginError('Network error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try { await api('/api/logout', { method: 'POST' }); } catch (e) {}
    setMe(null);
    setCandidates({ CR: [], LR: [] });
    setSelectedCR('');
    setSelectedLR('');
    setRollNo('');
    setLoginError('');
    setJustVoted(false);
    setView('login');
  }

  async function submitVote() {
    setConfirmOpen(false);
    setSubmitLoading(true);
    try {
      const body = {};
      if (selectedCR) body.crCandidateId = selectedCR;
      if (selectedLR) body.lrCandidateId = selectedLR;
      const { res, data } = await api('/api/vote', { method: 'POST', body });
      if (!res.ok || !data.ok) {
        if (res.status === 409) {
          setJustVoted(false);
          setView('voted');
          return;
        }
        toast(data.error || 'Failed to submit vote.', 'error');
        return;
      }
      setJustVoted(true);
      setView('voted');
    } catch (e) {
      toast('Network error. Please try again.', 'error');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="p-6 sm:p-8">
          <Skeleton className="h-8 w-64 mb-3" />
          <Skeleton className="h-4 w-80 max-w-full mb-6" />
          <Skeleton className="h-12 w-full mb-3" />
          <Skeleton className="h-11 w-32" />
        </Card>
      </div>
    );
  }

  if (view === 'voted') {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-indigo-500/10 via-transparent to-fuchsia-500/10" />
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">You have already voted. Thank you!</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-6">Your response has been recorded securely. Every vote counts.</p>
            <Button variant="secondary" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </motion.div>
        </Card>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-3 pt-2 sm:pt-6">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/60 border border-white/50 dark:border-slate-700/60 text-sm text-slate-700 dark:text-slate-200 shadow-sm">
            <Sparkles className="w-4 h-4 text-indigo-500" /> Secure • One vote per student
          </motion.div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-sky-500 bg-clip-text text-transparent">
            Choose your CR &amp; LR
          </h1>
          <p className="text-slate-600 dark:text-slate-300 max-w-lg mx-auto">Enter your roll number to continue and cast your vote for Class Representative and Lady Representative.</p>
        </div>
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <LogIn className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Student Login</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Use your official roll number</p>
              </div>
            </div>
            <Input
              label="Roll number"
              id="roll-input"
              placeholder="25280-cm-073"
              value={rollNo}
              onChange={(e) => { setRollNo(e.target.value.toLowerCase()); setLoginError(''); }}
              autoComplete="off"
              error={loginError}
              hint="Format: 25280-cm-073"
            />
            <Button type="submit" loading={loginLoading} className="w-full sm:w-auto">
              Continue <Vote className="w-4 h-4" />
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // vote view
  return (
    <div className="space-y-5 pb-28 sm:pb-6">
      <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Welcome</p>
            <p className="font-semibold text-lg">{me?.name || 'Student'}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Logout
        </Button>
      </Card>

      {candLoading ? (
        <div className="space-y-4">
          <Card className="p-5 space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></Card>
          <Card className="p-5 space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></Card>
        </div>
      ) : !hasAny ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-semibold mb-1">No candidates yet</h2>
          <p className="text-slate-600 dark:text-slate-300">No candidates have registered yet. Please check back soon.</p>
        </Card>
      ) : (
        <>
          {hasCR && (
            <Card className="p-5 sm:p-6">
              <Section title="CR Candidates" subtitle="Select one Class Representative">
                <div className="grid sm:grid-cols-2 gap-3">
                  {candidates.CR.map((c) => (
                    <CandidateCard key={c.id} c={c} nameAttr="cr" selected={selectedCR === c.id} onSelect={setSelectedCR} />
                  ))}
                </div>
              </Section>
            </Card>
          )}
          {hasLR && (
            <Card className="p-5 sm:p-6">
              <Section title="LR Candidates" subtitle="Select one Lady Representative">
                <div className="grid sm:grid-cols-2 gap-3">
                  {candidates.LR.map((c) => (
                    <CandidateCard key={c.id} c={c} nameAttr="lr" selected={selectedLR === c.id} onSelect={setSelectedLR} />
                  ))}
                </div>
              </Section>
            </Card>
          )}

          <div className="hidden sm:flex justify-end">
            <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit} loading={submitLoading}>
              <Vote className="w-4 h-4" /> Submit Vote
            </Button>
          </div>

          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/70 dark:border-slate-800">
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <div className="flex-1 text-sm text-slate-600 dark:text-slate-300">
                {canSubmit ? 'Ready to submit your vote.' : 'Select your candidate(s) to continue.'}
              </div>
              <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit} loading={submitLoading}>
                Submit
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal open={confirmOpen} title="Confirm your vote" onClose={() => !submitLoading && setConfirmOpen(false)}>
        <p className="text-slate-600 dark:text-slate-300 mb-4">Your vote is final and cannot be changed. Do you want to submit now?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitLoading}>Cancel</Button>
          <Button onClick={submitVote} loading={submitLoading}>Yes, submit</Button>
        </div>
      </Modal>
    </div>
  );
}
