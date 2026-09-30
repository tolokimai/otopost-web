"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  requiredText?: string;
  onConfirm: () => void | Promise<void>;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => void;
  confirmDelete: (message: string, onConfirm: () => void | Promise<void>, requiredText?: string) => void;
};

const ConfirmContext = createContext<ConfirmContextType>({
  confirm: () => {},
  confirmDelete: () => {},
});

let confirmRef: ConfirmContextType | null = null;

export const Confirm = {
  ask: (options: ConfirmOptions) => confirmRef?.confirm(options),
  delete: (message: string, onConfirm: () => void | Promise<void>, requiredText?: string) =>
    confirmRef?.confirmDelete(message, onConfirm, requiredText),
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<ConfirmOptions | null>(null);
  const [typedInput, setTypedInput] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    setTypedInput("");
    setActive(options);
  }, []);

  const confirmDelete = useCallback(
    (message: string, onConfirm: () => void | Promise<void>, requiredText?: string) => {
      confirm({
        title: "Konfirmasi Hapus",
        message,
        confirmLabel: "Hapus",
        cancelLabel: "Batal",
        isDanger: true,
        requiredText,
        onConfirm,
      });
    },
    [confirm]
  );

  async function handleConfirm() {
    if (!active) return;
    if (active.requiredText && typedInput !== active.requiredText) return;
    setBusy(true);
    try {
      await active.onConfirm();
      setActive(null);
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (busy) return;
    setActive(null);
  }

  confirmRef = { confirm, confirmDelete };

  const canConfirm = !active?.requiredText || typedInput === active.requiredText;

  return (
    <ConfirmContext.Provider value={{ confirm, confirmDelete }}>
      {children}
      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#131722] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">
              {active.title || "Konfirmasi"}
            </h3>
            <p className="text-sm text-slate-300">
              {active.message}
            </p>

            {active.requiredText ? (
              <div className="space-y-1.5 pt-2">
                <label className="text-xs text-slate-400">
                  Ketik <strong className="text-red-400">{active.requiredText}</strong> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder={active.requiredText}
                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  autoFocus
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {active.cancelLabel || "Batal"}
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={!canConfirm || busy}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
                  active.isDanger
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "btn-primary"
                }`}
              >
                {busy ? "Memproses..." : active.confirmLabel || "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
