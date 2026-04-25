"use client";

import {Languages, MoonStar, Settings2} from "lucide-react";
import {useMemo} from "react";
import {useLocale} from "next-intl";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {LanguageModalButton} from "@/components/ui/language-modal";

import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";

export default function SettingsPage() {
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).settings;
  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="settings"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          <Settings2 className="h-3.5 w-3.5" />
          {copy.lead}
        </div>
      }
      contentClassName="overflow-auto"
    >
      <section className="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
        <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <MoonStar className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{copy.themeTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.themeDescription}</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="rounded-xl border border-blue-600/20 bg-blue-600/10 px-3 py-1.5 text-xs font-semibold text-blue-400">Always Dark</span>
            <span className="text-sm text-[var(--text-tertiary)]">{copy.themeHint}</span>
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
            <Languages className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{copy.languageTitle}</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.languageDescription}</p>
          <div className="mt-5 flex items-center gap-3">
            <LanguageModalButton compact={false} />
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
