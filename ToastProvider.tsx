import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastInput = {
  kind: ToastKind;
  title?: string;
  message: string;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
};

type ToastContextValue = {
  toast: (t: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function iconFor(kind: ToastKind) {
  if (kind === 'success') return CheckCircle2;
  if (kind === 'error') return AlertTriangle;
  return Info;
}

function classesFor(kind: ToastKind) {
  if (kind === 'success') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (kind === 'error') return 'bg-rose-50 text-rose-800 border-rose-200';
  return 'bg-slate-50 text-slate-800 border-slate-200';
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = `t_${Date.now()}_${counter.current++}`;
      const item: ToastItem = { id, ...t };
      setItems((prev) => [...prev, item]);
      const duration = typeof t.durationMs === 'number' ? t.durationMs : t.kind === 'error' ? 7000 : 3500;
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[200] w-[min(420px,calc(100vw-2rem))] space-y-3 pointer-events-none">
        {items.map((t) => {
          const Icon = iconFor(t.kind);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md ${classesFor(t.kind)} animate-in fade-in slide-in-from-top-2 duration-200`}
              role="status"
              aria-live="polite"
            >
              <div className="mt-0.5">
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                {t.title && <div className="text-xs font-black uppercase tracking-widest">{t.title}</div>}
                <div className="text-sm font-bold leading-snug break-words">{t.message}</div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl p-2 hover:bg-black/5 transition-colors"
                onClick={() => remove(t.id)}
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

