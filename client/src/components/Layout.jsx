import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Moon, Sun, Vote, UserPlus, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../lib/theme.jsx';

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
    </button>
  );
}

const navLink = ({ isActive }) =>
  `inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
    isActive
      ? 'bg-indigo-600 text-white shadow'
      : 'text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800/70'
  }`;

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-animated text-slate-900 dark:text-slate-100 relative overflow-hidden">
      <motion.div
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <header className="glass border border-white/40 dark:border-slate-700/50 rounded-2xl shadow-lg px-4 py-3 mb-6 flex items-center justify-between gap-3 flex-wrap">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white shadow">
              <Vote className="w-5 h-5" />
            </span>
            <span>CR / LR Vote</span>
          </Link>
          <nav className="flex items-center gap-2 flex-wrap">
            <NavLink to="/" className={navLink} end>
              <Vote className="w-4 h-4" /> Vote
            </NavLink>
            <NavLink to="/candidates" className={navLink}>
              <UserPlus className="w-4 h-4" /> Candidates
            </NavLink>
            <NavLink to="/results" className={navLink}>
              <BarChart3 className="w-4 h-4" /> Results
            </NavLink>
            <ThemeToggle />
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
