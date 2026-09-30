"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeContextType = {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  resolvedTheme: "dark",
  setTheme: () => {},
});

const THEME_KEY = "otopost_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved && (saved === "dark" || saved === "light" || saved === "system")) {
      setThemeState(saved);
    }
  }, []);

  useEffect(() => {
    let active: "dark" | "light" = "dark";
    if (theme === "system") {
      active = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } else {
      active = theme;
    }

    setResolvedTheme(active);
    document.documentElement.setAttribute("data-theme", active);
    document.documentElement.style.colorScheme = active;
  }, [theme]);

  function setTheme(newTheme: Theme) {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
