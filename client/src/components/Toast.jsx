import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext({ toast: () => {} });

let idSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info') => {
    const id = ++idSeq;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => remove(id), 3500);
  }, [remove]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              className={`pointer-events-auto glass border rounded-xl shadow-lg p-3 flex items-start gap-3 ${
                t.type === 'success' ? 'border-emerald-300/60 dark:border-emerald-500/40' :
                t.type === 'error' ? 'border-rose-300/60 dark:border-rose-500/40' :
                'border-indigo-300/60 dark:border-indigo-500/40'
              }`}
              role="status"
            >
              <span className="mt-0.5">
                {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                 t.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-500" /> :
                 <Info className="w-5 h-5 text-indigo-500" />}
              </span>
              <p className="text-sm flex-1 text-slate-800 dark:text-slate-100">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Dismiss">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
