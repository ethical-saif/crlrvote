import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shield, RefreshCw, BarChart3, Users, Vote, Percent, Check, X, Trash2, Clock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Card, Button, Input, Skeleton, Modal } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function Leaderboard({ title, items }) {
  const max = Math.max(1, ...items.map((i) => i.voteCount || 0));
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-500" /> {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No candidates yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((c, idx) => {
            const pct = Math.round(((c.voteCount || 0) / max) * 100);
            return (
              <div key={c.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar rollNo={c.rollNo} name={c.name} hasPhoto={c.hasPhoto} size={40} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        <span className="text-slate-400 mr-2">#{idx + 1}</span>
                        {c.name || '(No name)'}
                        <span className="text-slate-500 dark:text-slate-400 font-normal"> · {c.rollNo}</span>
                      </p>
                      {c.manifesto && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{c.manifesto}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                      {c.voteCount || 0} votes
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-500"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function formatTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function ManageCard({ c, tab, photoSrc, busy, onApprove, onReject, onDelete }) {
  return (
    <div className="p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/40 flex flex-col sm:flex-row gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <Avatar rollNo={c.rollNo} name={c.name} hasPhoto={c.hasPhoto} size={56} previewSrc={photoSrc || null} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{c.name || '(No name)'}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.position === 'CR' ? 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-300' : 'bg-fuchsia-600/10 text-fuchsia-700 dark:text-fuchsia-300'}`}>{c.position}</span>
            {tab === 'approved' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-300">{c.voteCount || 0} votes</span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Roll: {c.rollNo}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3.5 h-3.5" /> {formatTime(c.createdAt)}</p>
          {c.manifesto && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{c.manifesto}</p>}
        </div>
      </div>
      <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
        {tab === 'pending' && (
          <>
            <Button onClick={onApprove} disabled={busy} loading={busy === 'approve'} className="!py-2 !px-3 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
              <Check className="w-4 h-4" /> Approve
            </Button>
            <Button variant="danger" onClick={onReject} disabled={busy} loading={busy === 'reject'} className="!py-2 !px-3 text-sm">
              <X className="w-4 h-4" /> Reject
            </Button>
          </>
        )}
        {tab === 'approved' && (
          <Button variant="danger" onClick={onDelete} disabled={busy} loading={busy === 'delete'} className="!py-2 !px-3 text-sm">
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        )}
        {tab === 'rejected' && (
          <>
            <Button onClick={onApprove} disabled={busy} loading={busy === 'approve'} className="!py-2 !px-3 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
              <Check className="w-4 h-4" /> Approve
            </Button>
            <Button variant="danger" onClick={onDelete} disabled={busy} loading={busy === 'delete'} className="!py-2 !px-3 text-sm">
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [manageList, setManageList] = useState([]);
  const [authedKey, setAuthedKey] = useState('');
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState({});
  const [modal, setModal] = useState(null); // { type: 'reject'|'delete', candidate }
  const [photoUrls, setPhotoUrls] = useState({});
  const [resultsVisible, setResultsVisible] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const photoUrlsRef = useRef({});

  async function loadAll(k = authedKey || key) {
    const adminKey = (k || '').trim();
    if (!adminKey) { toast('Enter admin key.', 'error'); return; }
    setLoading(true);
    try {
      const [resR, resM, resS] = await Promise.all([
        api('/api/admin/results', { headers: { 'x-admin-key': adminKey } }),
        api('/api/admin/candidates', { headers: { 'x-admin-key': adminKey } }),
        api('/api/admin/settings', { headers: { 'x-admin-key': adminKey } }),
      ]);
      if (!resR.res.ok || !resR.data.ok) {
        toast(resR.data.error || 'Failed to load results.', 'error');
        if (resR.res.status === 401) { setResults(null); setManageList([]); setAuthedKey(''); }
        return;
      }
      if (!resM.res.ok || !resM.data.ok) {
        toast(resM.data.error || 'Failed to load candidates.', 'error');
        if (resM.res.status === 401) { setResults(null); setManageList([]); setAuthedKey(''); }
        return;
      }
      if (!resS.res.ok || !resS.data.ok) {
        toast(resS.data.error || 'Failed to load settings.', 'error');
        if (resS.res.status === 401) { setResults(null); setManageList([]); setAuthedKey(''); }
        return;
      }
      setResults(resR.data);
      setManageList(resM.data.candidates || []);
      setResultsVisible(!!resS.data.resultsVisible);
      setAuthedKey(adminKey);
    } catch (e) {
      toast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function toggleResultsVisibility() {
    if (!authedKey) return;
    setSettingsLoading(true);
    const next = !resultsVisible;
    try {
      const { res, data } = await api('/api/admin/settings/results', {
        method: 'POST',
        headers: { 'x-admin-key': authedKey },
        body: { visible: next },
      });
      if (!res.ok || !data.ok) {
        toast(data.error || 'Failed to update visibility.', 'error');
        return;
      }
      setResultsVisible(!!data.resultsVisible);
      toast(data.resultsVisible ? 'Results are now visible to students.' : 'Results are now hidden from students.', 'success');
    } catch (e) {
      toast('Network error.', 'error');
    } finally {
      setSettingsLoading(false);
    }
  }

  // load blob URLs for admin photo access (needed for pending/rejected)
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!authedKey) {
        Object.values(photoUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
        photoUrlsRef.current = {};
        setPhotoUrls({});
        return;
      }
      const needed = manageList.filter((c) => c.hasPhoto);
      const next = { ...photoUrlsRef.current };
      const keep = new Set(needed.map((c) => c.rollNo));
      // revoke removed
      for (const [roll, url] of Object.entries(next)) {
        if (!keep.has(roll)) { URL.revokeObjectURL(url); delete next[roll]; }
      }
      for (const c of needed) {
        if (next[c.rollNo]) continue;
        try {
          const res = await fetch(`/api/candidates/${encodeURIComponent(c.rollNo)}/photo`, {
            headers: { 'x-admin-key': authedKey },
            credentials: 'same-origin',
          });
          if (!res.ok) continue;
          const blob = await res.blob();
          if (cancelled) return;
          next[c.rollNo] = URL.createObjectURL(blob);
        } catch (e) {
          // fallback to initials
        }
      }
      if (cancelled) return;
      photoUrlsRef.current = next;
      setPhotoUrls({ ...next });
    }
    run();
    return () => { cancelled = true; };
  }, [authedKey, manageList]);

  useEffect(() => {
    return () => {
      Object.values(photoUrlsRef.current).forEach((u) => URL.revokeObjectURL(u));
      photoUrlsRef.current = {};
    };
  }, []);

  const cr = useMemo(() => (results?.candidates || []).filter((c) => c.position === 'CR'), [results]);
  const lr = useMemo(() => (results?.candidates || []).filter((c) => c.position === 'LR'), [results]);
  const turnout = useMemo(() => {
    if (!results || !results.totalStudents) return '0%';
    return `${Math.round((results.totalVotes / results.totalStudents) * 100)}%`;
  }, [results]);

  const pending = useMemo(() => manageList.filter((c) => c.status === 'pending'), [manageList]);
  const approved = useMemo(() => manageList.filter((c) => c.status === 'approved'), [manageList]);
  const rejected = useMemo(() => manageList.filter((c) => c.status === 'rejected'), [manageList]);
  const pendingCount = pending.length;

  const tabItems = tab === 'pending' ? pending : tab === 'approved' ? approved : rejected;

  function setBusyFor(rollNo, action) {
    setBusy((b) => ({ ...b, [rollNo]: action }));
  }
  function clearBusy(rollNo) {
    setBusy((b) => { const n = { ...b }; delete n[rollNo]; return n; });
  }

  async function doAction(candidate, action) {
    const rollNo = candidate.rollNo;
    setBusyFor(rollNo, action);
    try {
      let res, data;
      if (action === 'approve') {
        ({ res, data } = await api(`/api/admin/candidates/${encodeURIComponent(rollNo)}/approve`, { method: 'POST', headers: { 'x-admin-key': authedKey } }));
      } else if (action === 'reject') {
        ({ res, data } = await api(`/api/admin/candidates/${encodeURIComponent(rollNo)}/reject`, { method: 'POST', headers: { 'x-admin-key': authedKey } }));
      } else if (action === 'delete') {
        ({ res, data } = await api(`/api/admin/candidates/${encodeURIComponent(rollNo)}`, { method: 'DELETE', headers: { 'x-admin-key': authedKey } }));
      }
      if (!res.ok || !data.ok) {
        toast(data.error || 'Action failed.', 'error');
        return;
      }
      if (action === 'delete') {
        const removed = typeof data.votesRemoved === 'number' ? data.votesRemoved : 0;
        toast(removed > 0 ? `Candidate deleted. Removed ${removed} vote(s) from results.` : 'Candidate deleted.', 'success');
      } else {
        toast(data.message || 'Done.', 'success');
      }
      await loadAll(authedKey);
    } catch (e) {
      toast('Network error.', 'error');
    } finally {
      clearBusy(rollNo);
    }
  }

  function confirmReject(c) { setModal({ type: 'reject', candidate: c }); }
  function confirmDelete(c) { setModal({ type: 'delete', candidate: c }); }

  async function runModalAction() {
    if (!modal) return;
    const { type, candidate } = modal;
    setModal(null);
    await doAction(candidate, type);
  }

  const tabs = [
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'approved', label: 'Approved', count: approved.length },
    { id: 'rejected', label: 'Rejected', count: rejected.length },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <div className="relative inline-flex">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-700 text-white shadow-lg mb-1">
            <Shield className="w-7 h-7" />
          </div>
          {authedKey && pendingCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[1.4rem] h-[1.4rem] px-1 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center shadow">{pendingCount}</span>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-300">Manage candidates and view live results with your admin key.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <Input
              label="Admin key"
              id="admin-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter admin key"
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => loadAll()} loading={loading} className="w-full sm:w-auto">
              {authedKey ? 'Reload' : 'Load Dashboard'}
            </Button>
            {authedKey && (
              <Button variant="secondary" onClick={() => loadAll(authedKey)} loading={loading} aria-label="Refresh">
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>

      {loading && !results && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
        </div>
      )}

      {results && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${resultsVisible ? 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-500/10 text-slate-600 dark:text-slate-300'}`}>
                  {resultsVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Show results to students</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Turn OFF to hide live results while voting is running.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleResultsVisibility}
                disabled={settingsLoading}
                role="switch"
                aria-checked={resultsVisible}
                aria-label="Show results to students"
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 ${
                  resultsVisible ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${resultsVisible ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            <p className="mt-3 text-sm">
              Status: <span className={`font-semibold ${resultsVisible ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>{resultsVisible ? 'Visible to students' : 'Hidden from students'}</span>
              {settingsLoading && <span className="ml-2 text-slate-500">Updating…</span>}
            </p>
          </Card>

          <div className="grid sm:grid-cols-3 gap-4">
            <Stat icon={Vote} label="Total votes" value={results.totalVotes} accent="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400" />
            <Stat icon={Users} label="Total students" value={results.totalStudents} accent="bg-fuchsia-600/10 text-fuchsia-600 dark:text-fuchsia-400" />
            <Stat icon={Percent} label="Turnout" value={turnout} accent="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400" />
          </div>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                Manage Candidates
                {pendingCount > 0 && <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full bg-rose-600 text-white text-xs font-bold">{pendingCount} pending</span>}
              </h2>
              <Button variant="secondary" onClick={() => loadAll(authedKey)} loading={loading} className="!py-2 !px-3 text-sm">
                <RefreshCw className="w-4 h-4" /> Refresh
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    tab === t.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                      : 'bg-white/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-slate-700/70 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                  <span className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs flex items-center justify-center ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>{t.count}</span>
                </button>
              ))}
            </div>

            {tabItems.length === 0 ? (
              <div className="py-10 text-center text-slate-500 dark:text-slate-400">
                {tab === 'pending' ? 'No pending candidates.' : tab === 'approved' ? 'No approved candidates.' : 'No rejected candidates.'}
              </div>
            ) : (
              <div className="space-y-3">
                {tabItems.map((c) => (
                  <ManageCard
                    key={c.rollNo}
                    c={c}
                    tab={tab}
                    photoSrc={photoUrls[c.rollNo]}
                    busy={busy[c.rollNo]}
                    onApprove={() => doAction(c, 'approve')}
                    onReject={() => confirmReject(c)}
                    onDelete={() => confirmDelete(c)}
                  />
                ))}
              </div>
            )}
          </Card>

          <div className="grid lg:grid-cols-2 gap-5">
            <Leaderboard title="CR Leaderboard" items={cr} />
            <Leaderboard title="LR Leaderboard" items={lr} />
          </div>
        </motion.div>
      )}

      <Modal open={!!modal} title={modal?.type === 'delete' ? 'Delete candidate' : 'Reject candidate'} onClose={() => { if (!modal || !busy[modal.candidate.rollNo]) setModal(null); }}>
        {modal && (
          <div className="space-y-4">
            {modal.type === 'delete' ? (
              <>
                <p className="text-slate-700 dark:text-slate-200">Permanently delete <strong>{modal.candidate.name || modal.candidate.rollNo}</strong> ({modal.candidate.rollNo})?</p>
                {modal.candidate.voteCount > 0 ? (
                  <div className="flex gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/70 dark:border-amber-500/30 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm">This candidate has <strong>{modal.candidate.voteCount}</strong> vote(s). Deleting removes those votes from the results. Those students will NOT be able to vote again.</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">This will remove the candidate and their photo.</p>
                )}
              </>
            ) : (
              <p className="text-slate-700 dark:text-slate-200">Reject <strong>{modal.candidate.name || modal.candidate.rollNo}</strong>&apos;s registration? It will not appear on the voting page.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModal(null)} disabled={!!busy[modal.candidate.rollNo]}>Cancel</Button>
              <Button
                variant={modal.type === 'delete' ? 'danger' : 'danger'}
                onClick={runModalAction}
                loading={!!busy[modal.candidate.rollNo]}
              >
                {modal.type === 'delete' ? 'Delete' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
