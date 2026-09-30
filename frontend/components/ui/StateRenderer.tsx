"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";

export type PageState = "LOADING" | "SUCCESS" | "EMPTY" | "ERROR" | "FORBIDDEN";

export function LoadingState({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-400">{message || t("common.loading")}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
      <div className="text-4xl text-slate-600">📁</div>
      <h4 className="text-base font-semibold text-slate-300">
        {title || t("common.empty_title")}
      </h4>
      <p className="text-xs text-slate-500 max-w-sm">
        {description || t("common.empty_desc")}
      </p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 rounded-2xl border border-red-500/20 bg-red-500/[0.04]">
      <div className="text-4xl text-red-400">⚠️</div>
      <h4 className="text-base font-semibold text-red-300">
        {title || t("common.error_title")}
      </h4>
      <p className="text-xs text-slate-400 max-w-sm">
        {message || t("common.error_desc")}
      </p>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-2 rounded-xl border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium hover:bg-white/10 transition-colors"
        >
          Coba Lagi
        </button>
      ) : null}
    </div>
  );
}

export function ForbiddenState({
  title,
  message,
}: {
  title?: string;
  message?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]">
      <div className="text-4xl text-amber-400">🔒</div>
      <h4 className="text-base font-semibold text-amber-300">
        {title || t("common.forbidden_title")}
      </h4>
      <p className="text-xs text-slate-400 max-w-sm">
        {message || t("common.forbidden_desc")}
      </p>
    </div>
  );
}

export function StateRenderer({
  state,
  children,
  emptyTitle,
  emptyDesc,
  emptyAction,
  errorMessage,
  onRetry,
}: {
  state: PageState;
  children: React.ReactNode;
  emptyTitle?: string;
  emptyDesc?: string;
  emptyAction?: React.ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  switch (state) {
    case "LOADING":
      return <LoadingState />;
    case "EMPTY":
      return <EmptyState title={emptyTitle} description={emptyDesc} action={emptyAction} />;
    case "ERROR":
      return <ErrorState message={errorMessage} onRetry={onRetry} />;
    case "FORBIDDEN":
      return <ForbiddenState />;
    case "SUCCESS":
    default:
      return <>{children}</>;
  }
}
