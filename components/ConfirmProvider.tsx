import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingConfirm = ConfirmOptions & {
  id: string;
  resolve: (v: boolean) => void;
};

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const counter = useRef(0);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending((prev) => {
        if (prev) prev.resolve(false);
        return { ...opts, id: `c_${Date.now()}_${counter.current++}`, resolve };
      });
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setPending((p) => {
      if (!p) return p;
      p.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pending, close]);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => close(false)}
            className="fixed inset-0 z-[180] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-white/30 overflow-hidden cursor-default"
            >
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-9 h-9 rounded-2xl flex items-center justify-center ${
                      pending.danger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 tracking-tight">{pending.title}</div>
                    <div className="text-sm text-slate-600 font-semibold leading-snug mt-1">{pending.message}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 p-2 rounded-2xl hover:bg-slate-100 transition-colors text-slate-500"
                  onClick={() => close(false)}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex gap-3 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
                  onClick={() => close(false)}
                >
                  {pending.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 rounded-2xl font-black transition-colors text-white ${
                    pending.danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                  onClick={() => close(true)}
                >
                  {pending.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

