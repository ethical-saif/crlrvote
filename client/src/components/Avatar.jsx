import React, { useState } from 'react';

function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0].toUpperCase());
  return letters.join('') || '?';
}

export default function Avatar({ rollNo, name, hasPhoto, size = 44, className = '', selected = false, previewSrc = null }) {
  const [broken, setBroken] = useState(false);
  const showImg = (previewSrc || (hasPhoto && rollNo && !broken));
  const src = previewSrc || `/api/candidates/${encodeURIComponent(rollNo)}/photo`;
  const dim = { width: size, height: size };
  const base = `rounded-xl flex items-center justify-center font-bold shrink-0 overflow-hidden ${className}`;
  const fallbackClass = selected
    ? 'bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white'
    : 'bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-100';

  if (showImg) {
    return (
      <img
        src={src}
        alt={name ? `${name} photo` : 'Candidate photo'}
        loading={previewSrc ? 'eager' : 'lazy'}
        style={dim}
        className={`${base} object-cover bg-slate-200 dark:bg-slate-700`}
        onError={() => { if (!previewSrc) setBroken(true); }}
      />
    );
  }
  return (
    <div style={dim} className={`${base} ${fallbackClass}`}>
      <span style={{ fontSize: Math.max(12, Math.round(size * 0.36)) }}>{initials(name)}</span>
    </div>
  );
}
