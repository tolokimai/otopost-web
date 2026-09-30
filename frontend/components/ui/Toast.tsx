"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastMessage = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  show: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  show: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

let toastRef: ToastContextType | null = null;

export const Toast = {
  success: (msg: string) => toastRef?.success(msg),
  error: (msg: string) => toastRef?.error(msg),
  warning: (msg: string) => toastRef?.warning(msg),
  info: (msg: string) => toastRef?.info(msg),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const contextValue: ToastContextType = {
    show,
    success: (msg: string) => show("success", msg),
    error: (msg: string) => show("error", msg),
    warning: (msg: string) => show("warning", msg),
    info: (msg: string) => show("info", msg),
  };

  toastRef = contextValue;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const bgMap = {
            success: "bg-emerald-950/90 border-emerald-500/50 text-emerald-200",
            error: "bg-red-950/90 border-red-500/50 text-red-200",
            warning: "bg-amber-950/90 border-amber-500/50 text-amber-200",
            info: "bg-indigo-950/90 border-indigo-500/50 text-indigo-200",
          };
          const iconMap = {
            success: "✓",
            error: "✕",
            warning: "⚠",
            info: "ℹ",
          };
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md text-sm transition-all duration-200 animate-in slide-in-from-bottom-2 ${bgMap[t.type]}`}
            >
              <span className="font-bold text-base">{iconMap[t.type]}</span>
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 text-xs px-1"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
