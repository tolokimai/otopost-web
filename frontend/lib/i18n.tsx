"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import idAdmin from "../i18n/id/admin.json";
import idAuth from "../i18n/id/auth.json";
import idBilling from "../i18n/id/billing.json";
import idCommon from "../i18n/id/common.json";
import idContentPlan from "../i18n/id/contentPlan.json";
import idStudio from "../i18n/id/studio.json";

import enAdmin from "../i18n/en/admin.json";
import enAuth from "../i18n/en/auth.json";
import enBilling from "../i18n/en/billing.json";
import enCommon from "../i18n/en/common.json";
import enContentPlan from "../i18n/en/contentPlan.json";
import enStudio from "../i18n/en/studio.json";

export type Locale = "id" | "en";

const dictionaries: Record<Locale, Record<string, Record<string, string>>> = {
  id: {
    common: idCommon,
    auth: idAuth,
    admin: idAdmin,
    billing: idBilling,
    contentPlan: idContentPlan,
    studio: idStudio,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    admin: enAdmin,
    billing: enBilling,
    contentPlan: enContentPlan,
    studio: enStudio,
  },
};

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: "id",
  setLocale: () => {},
  t: (key) => key,
});

const LOCALE_KEY = "otopost_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("id");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved && (saved === "id" || saved === "en")) {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }

  function t(path: string, params?: Record<string, string | number>): string {
    const parts = path.split(".");
    let domain = "common";
    let key = path;

    if (parts.length > 1) {
      domain = parts[0];
      key = parts.slice(1).join(".");
    }

    const dict = dictionaries[locale]?.[domain] || {};
    const fallbackDict = dictionaries.en?.[domain] || {};

    let translation = dict[key] ?? fallbackDict[key] ?? path;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        translation = translation.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }

    return translation;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
