"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { buildPeriodPresets, defaultPeriod, type OverviewPeriod } from "@/lib/overview";

/**
 * The dashboard's selected period, shared by Overview, Channels and Comparison.
 * It lives in the dashboard layout, so moving between pages keeps it, and it's
 * saved for the browser tab, so a refresh keeps it too. It only changes when
 * the user picks another period.
 */

const STORAGE_KEY = "wso2-period";

interface PeriodContextValue {
  period: OverviewPeriod;
  setPeriod: (period: OverviewPeriod) => void;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

/** The saved period, with presets recomputed so "3 months" still ends today. */
function readSaved(): OverviewPeriod | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as OverviewPeriod;
    if (saved.preset) {
      const preset = buildPeriodPresets().find((p) => p.id === saved.preset);
      return preset ? { preset: preset.id, range: preset.range } : null;
    }
    return saved.range?.from && saved.range?.to ? { preset: null, range: saved.range } : null;
  } catch {
    return null;
  }
}

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  // Mounted only in the browser (inside AuthGate), so storage is safe to read here.
  const [period, setPeriodState] = useState<OverviewPeriod>(() => readSaved() ?? defaultPeriod());

  const setPeriod = useCallback((next: OverviewPeriod) => {
    setPeriodState(next);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode, blocked); the period still holds for this visit.
    }
  }, []);

  return <PeriodContext.Provider value={{ period, setPeriod }}>{children}</PeriodContext.Provider>;
}

export function usePeriod(): PeriodContextValue {
  const value = useContext(PeriodContext);
  if (!value) throw new Error("usePeriod must be used inside PeriodProvider");
  return value;
}
