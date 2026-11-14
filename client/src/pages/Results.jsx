import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Lock, Users, Vote, Percent, Crown, BarChart3 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useToast } from '../components/Toast.jsx';
import { Card, Button, Skeleton } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';

const COLORS = ['#6366f1', '#d946ef', '#22d3ee', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6'];

function useCountUp(value, duration = 700) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
    let raf;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      setDisplay(to % 1 === 0 ? Math.round(v) : Math.round(v * 10) / 10);
      if (t < 1) raf = requestAnimationFrame(tick);
      else { fromRef.current = to; setDisplay(to); }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

function formatTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, rOuter, rInner, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.999) {
    // full circle: draw two arcs
    const mid = startAngle + 180;
    const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
    const p2 = polarToCartesian(cx, cy, rOuter, mid);
    const p3 = polarToCartesian(cx, cy, rOuter, endAngle - 0.01);
    const p4 = polarToCartesian(cx, cy, rInner, endAngle - 0.01);
    const p5 = polarToCartesian(cx, cy, rInner, mid);
    const p6 = polarToCartesian(cx, cy, rInner, startAngle);
    return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 1 1 ${p2.x} ${p2.y} A ${rOuter} ${rOuter} 0 1 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${rInner} ${rInner} 0 1 0 ${p5.x} ${p5.y} A ${rInner} ${rInner} 0 1 0 ${p6.x} ${p6.y} Z`;
  }
  const large = sweep > 180 ? 1 : 0;
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const p4 = polarToCartesian(cx, cy, rInner, startAngle);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

function DonutChart({ items, totalVotes }) {
  const total = items.reduce((s, c) => s + (c.voteCount || 0), 0);
  const cx = 90, cy = 90, rOuter = 80, rInner = 52;
  let angle = 0;
  const segments = items.map((c, i) => {
    const val = c.voteCount || 0;
    const sweep = total > 0 ? (val / total) * 360 : 0;
    const seg = { ...c, color: COLORS[i % COLORS.length], start: angle, end: angle + sweep, sweep };
    angle += sweep;
    return seg;
  });
  const label = items.map((c) => `${c.name || c.rollNo}: ${c.voteCount} votes (${c.percent}%)`).join(', ');
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 180 180" className="w-44 h-44 sm:w-52 sm:h-52" role="img" aria-label={`Vote distribution: ${label || 'no votes'}`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke="currentColor" strokeWidth={rOuter - rInner} className="text-slate-200 dark:text-slate-700" />
        ) : (
          segments.map((s, i) => s.sweep > 0 && (
            <path key={s.rollNo || i} d={arcPath(cx, cy, rOuter, rInner, s.start, s.end)} fill={s.color} />
          ))
        )}
        <circle cx={cx} cy={cy} r={rInner - 2} className="fill-white/80 dark:fill-slate-900/80" />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" style={{ fontSize: 22, fontWeight: 700 }}>{totalVotes}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" style={{ fontSize: 10 }}>votes</text>
      </svg>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix = '', accent }) {
  const display = useCountUp(value);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{display}{suffix}</p>
        </div>
      </div>
    </Card>
  );
}

function LeaderBanner({ items }) {
  if (!items.length) return null;
  const maxVotes = items[0].voteCount || 0;
  if (maxVotes <= 0) return null;
  const leaders = items.filter((c) => c.voteCount === maxVotes);
  const tie = leaders.length > 1;
  return (
    <div className="mb-5">
      {tie && (
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm font-semibold">
          <Crown className="w-4 h-4" /> Tie for lead
        </div>
      )}
      <div className={`grid gap-3 ${tie ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
        {leaders.map((c) => (
          <motion.div key={c.rollNo} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border border-indigo-300/60 dark:border-indigo-500/40 bg-gradient-to-r from-indigo-50/80 to-fuchsia-50/80 dark:from-indigo-500/10 dark:to-fuchsia-500/10 flex items-center gap-4">
            <div className="relative">
              <Avatar rollNo={c.rollNo} name={c.name} hasPhoto={c.hasPhoto} size={64} />
              <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center shadow"><Crown className="w-4 h-4" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-300 font-semibold">{tie ? 'Tied leader' : 'Current leader'}</p>
              <p className="text-lg font-bold truncate text-slate-900 dark:text-slate-100">{c.name || '(No name)'}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Roll: {c.rollNo}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{c.voteCount}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{c.percent}%</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RankedList({ items }) {
  const maxVotes = items.length ? (items[0].voteCount || 0) : 0;
  const leaders = new Set(items.filter((c) => maxVotes > 0 && c.voteCount === maxVotes).map((c) => c.rollNo));
  return (
    <div className="space-y-3 mt-4">
      {items.map((c, idx) => {
        const pct = c.percent || 0;
        const isLeader = leaders.has(c.rollNo);
        return (
          <div key={c.rollNo} className={`p-3 rounded-xl border ${isLeader ? 'border-indigo-300/60 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-slate-200/70 dark:border-slate-700/70 bg-white/50 dark:bg-slate-900/30'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${isLeader ? 'bg-indigo-600 text-white' : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>{idx + 1}</span>
                <Avatar rollNo={c.rollNo} name={c.name} hasPhoto={c.hasPhoto} size={38} />
                <div className="min-w-0">
                  <p className="font-medium truncate text-slate-900 dark:text-slate-100">{c.name || '(No name)'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.rollNo}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{c.voteCount} votes</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{pct}%</p>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200/70 dark:bg-slate-700/60 overflow-hidden" aria-hidden="true">
              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className={`h-full rounded-full ${isLeader ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PositionSection({ title, items, positionTotal }) {
  const hasCandidates = items.length > 0;
  const hasVotes = positionTotal > 0;
  const legendItems = items.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-indigo-500" /> {title}
      </h2>
      {!hasCandidates ? (
        <p className="text-slate-500 dark:text-slate-400">No candidates yet.</p>
      ) : !hasVotes ? (
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300">No votes yet. Results will appear here as students vote.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((c) => (
              <div key={c.rollNo} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/50 dark:bg-slate-900/30">
                <Avatar rollNo={c.rollNo} name={c.name} hasPhoto={c.hasPhoto} size={40} />
                <div className="min-w-0">
                  <p className="font-medium truncate">{c.name || '(No name)'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{c.rollNo} · 0 votes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <LeaderBanner items={items} />
          <div className="grid lg:grid-cols-[auto,1fr] gap-6 items-start">
            <div className="flex flex-col items-center">
              <DonutChart items={items} totalVotes={positionTotal} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Vote share</p>
              <ul className="space-y-2">
                {legendItems.map((c) => (
                  <li key={c.rollNo} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c.color }} aria-hidden="true" />
                    <span className="truncate flex-1 text-slate-700 dark:text-slate-200">{c.name || '(No name)'}</span>
                    <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{c.voteCount} votes · {c.percent}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <RankedList items={items} />
        </>
      )}
    </Card>
  );
}

export default function Results() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errToastShown, setErrToastShown] = useState(false);

  const fetchResults = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const { res, data: json } = await api('/api/results');
      if (!res.ok) throw new Error('Failed');
      setData(json);
      setErrToastShown(false);
    } catch (e) {
      if (!data) {
        // first load failed: keep loading false and show retryable state
      } else if (!errToastShown) {
        toast('Could not refresh results. Showing last known data.', 'error');
        setErrToastShown(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data, errToastShown, toast]);

  useEffect(() => {
    fetchResults(false);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!data) return;
    let interval = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(() => { if (!document.hidden) fetchResults(true); }, 15000);
    };
    const stop = () => { if (interval) { clearInterval(interval); interval = null; } };
    const onVis = () => {
      if (document.hidden) stop();
      else { fetchResults(true); start(); }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [data, fetchResults]);

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <Card className="p-6"><Skeleton className="h-8 w-48 mb-2" /><Skeleton className="h-4 w-64" /></Card>
        <div className="grid sm:grid-cols-3 gap-4"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Card className="p-6 space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-40 w-full" /></Card>
        <Card className="p-6 space-y-3"><Skeleton className="h-6 w-40" /><Skeleton className="h-40 w-full" /></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto">
        <Card className="p-8 text-center">
          <p className="text-slate-700 dark:text-slate-200 mb-4">Could not load results.</p>
          <Button onClick={() => fetchResults(false)}><RefreshCw className="w-4 h-4" /> Retry</Button>
        </Card>
      </div>
    );
  }

  if (data.visible === false) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center space-y-2 pt-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Live Results</h1>
        </div>
        <Card className="p-8 sm:p-10 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-200 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2">Results are hidden for now</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">They will be shown by the admin.</p>
          <Button variant="secondary" onClick={() => fetchResults(true)} loading={refreshing}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </Card>
      </div>
    );
  }

  const cr = data.CR || [];
  const lr = data.LR || [];
  const crTotal = cr.reduce((s, c) => s + (c.voteCount || 0), 0);
  const lrTotal = lr.reduce((s, c) => s + (c.voteCount || 0), 0);
  const noCandidates = cr.length === 0 && lr.length === 0;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Live Results</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Live
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: {formatTime(data.updatedAt)}</p>
          </div>
          <Button variant="secondary" onClick={() => fetchResults(true)} loading={refreshing} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
      </Card>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Vote} label="Total votes" value={data.totalVotes || 0} accent="bg-indigo-600/10 text-indigo-600 dark:text-indigo-400" />
        <StatCard icon={Users} label="Total students" value={data.totalStudents || 0} accent="bg-fuchsia-600/10 text-fuchsia-600 dark:text-fuchsia-400" />
        <StatCard icon={Percent} label="Turnout" value={data.turnoutPercent || 0} suffix="%" accent="bg-emerald-600/10 text-emerald-600 dark:text-emerald-400" />
      </div>

      {noCandidates ? (
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-1">No candidates yet</h2>
          <p className="text-slate-600 dark:text-slate-300">Approved candidates will appear here once they are registered.</p>
        </Card>
      ) : (data.totalVotes || 0) === 0 ? (
        <Card className="p-6 sm:p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No votes yet</h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Results will appear here as students vote.</p>
          <div className="grid lg:grid-cols-2 gap-5 text-left">
            <PositionSection title="CR Results" items={cr} positionTotal={0} />
            <PositionSection title="LR Results" items={lr} positionTotal={0} />
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <PositionSection title="CR Results" items={cr} positionTotal={crTotal} />
          <PositionSection title="LR Results" items={lr} positionTotal={lrTotal} />
        </div>
      )}
    </div>
  );
}
