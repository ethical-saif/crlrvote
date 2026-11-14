import React from 'react';
import { motion } from 'framer-motion';

export function Card({ children, className = '' }) {
  return (
    <div className={`glass border border-white/50 dark:border-slate-700/60 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

export function Button({ children, className = '', variant = 'primary', loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed';
  const styles = variant === 'primary'
    ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:from-indigo-500 hover:to-fuchsia-500 shadow-lg shadow-indigo-500/20'
    : variant === 'secondary'
    ? 'bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-700/70 hover:bg-white dark:hover:bg-slate-800'
    : 'bg-rose-600 text-white hover:bg-rose-500';
  return (
    <motion.button
      whileTap={{ scale: props.disabled || loading ? 1 : 0.98 }}
      className={`${base} ${styles} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" aria-hidden="true" />}
      {children}
    </motion.button>
  );
}

export function Input({ label, id, error, hint, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">{label}</label>}
      <input
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white/80 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
          error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'
        }`}
        {...props}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
    </div>
  );
}

export function Textarea({ label, id, error, hint, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">{label}</label>}
      <textarea
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white/80 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-y ${
          error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'
        }`}
        {...props}
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div>{error ? <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p> : hint ? <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p> : <span />}</div>
        {typeof props.maxLength === 'number' && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{(props.value || '').length}/{props.maxLength}</p>
        )}
      </div>
    </div>
  );
}

export function Select({ label, id, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-200">{label}</label>}
      <select
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl border bg-white/80 dark:bg-slate-900/70 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
          error ? 'border-rose-400 dark:border-rose-500' : 'border-slate-200 dark:border-slate-700'
        }`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/50 ${className}`} />;
}

export function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md glass border border-white/50 dark:border-slate-700/60 rounded-2xl shadow-2xl p-5"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="text-lg font-semibold mb-3 text-slate-900 dark:text-slate-100">{title}</h3>
        {children}
      </motion.div>
    </div>
  );
}
