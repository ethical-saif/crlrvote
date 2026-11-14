import React, { useMemo, useState } from 'react';
import { Shield, RefreshCw, BarChart3, Users, Vote, Percent } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Card, Button, Input, Skeleton } from '../components/ui.jsx';

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
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      <span className="text-slate-400 mr-2">#{idx + 1}</span>
                      {c.name || '(No name)'}
                      <span className="text-slate-500 dark:text-slate-400 font-normal"> · {c.rollNo}</span>
                    </p>
                    {c.manifesto && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{c.manifesto}</p>}
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

export default function Admin() {
  const { toast } = useToast();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [authedKey, setAuthedKey] = useState('');

  async function load(k = authedKey || key) {
    const adminKey = (k || '').trim();
    if (!adminKey) { toast('Enter admin key.', 'error'); return; }
    setLoading(true);
    try {
      const { res, data } = await api('/api/admin/results', { headers: { 'x-admin-key': adminKey } });
      if (!res.ok || !data.ok) {
        toast(data.error || 'Failed to load results.', 'error');
        if (res.status === 401) { setResults(null); setAuthedKey(''); }
        return;
      }
      setResults(data);
      setAuthedKey(adminKey);
    } catch (e) {
      toast('Network error.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const cr = useMemo(() => (results?.candidates || []).filter((c) => c.position === 'CR'), [results]);
  const lr = useMemo(() => (results?.candidates || []).filter((c) => c.position === 'LR'), [results]);
  const turnout = useMemo(() => {
    if (!results || !results.totalStudents) return '0%';
    return `${Math.round((results.totalVotes / results.totalStudents) * 100)}%`;
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-700 text-white shadow-lg mb-1">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-300">View live results and turnout with your admin key.</p>
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
            <Button onClick={() => load()} loading={loading} className="w-full sm:w-auto">
              Load Results
            </Button>
            {results && (
              <Button variant="secondary" onClick={() => load(authedKey)} loading={loading} aria-label="Refresh">
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <Stat icon={Vote} label="Total votes" value={results.totalVotes} accent="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400" />
            <Stat icon={Users} label="Total students" value={results.totalStudents} accent="bg-fuchsia-600/10 text-fuchsia-600 dark:text-fuchsia-400" />
            <Stat icon={Percent} label="Turnout" value={turnout} accent="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            <Leaderboard title="CR Leaderboard" items={cr} />
            <Leaderboard title="LR Leaderboard" items={lr} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
