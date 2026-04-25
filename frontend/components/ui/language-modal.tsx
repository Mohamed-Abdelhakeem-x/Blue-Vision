"use client";

import {useEffect, useMemo, useState} from "react";
import {createPortal} from "react-dom";
import {Globe, Languages, X} from "lucide-react";
import {useLocale} from "next-intl";

import {usePathname} from "@/i18n/navigation";
import {routing, type AppLocale} from "@/i18n/routing";
import {getDashboardCopy} from "@/lib/dashboard-copy";

const LOCALE_STORAGE_KEY = "plantify.locale";

function persistLocale(nextLocale: AppLocale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
}

function buildLocaleRedirectPath(pathname: string, locale: AppLocale) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function LanguageModalButton({compact = true}: {compact?: boolean}) {
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).languageModal;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const languageOptions = routing.locales.map((value) => ({value, label: copy.names[value]}));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    document.body.style.overflow = "hidden";
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const activeLabel = useMemo(
    () => languageOptions.find((option) => option.value === locale)?.label ?? "Language",
    [languageOptions, locale]
  );

  const onSelect = (nextLocale: AppLocale) => {
    if (!routing.locales.includes(nextLocale)) {
      return;
    }

    persistLocale(nextLocale);
    window.location.assign(buildLocaleRedirectPath(pathname, nextLocale));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            : "inline-flex items-center gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        }
        aria-label={copy.openAria}
      >
        {compact ? <Languages className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
        {compact ? null : <span className="font-medium text-[var(--text-primary)]">{activeLabel}</span>}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] grid place-items-center bg-black/45 px-4 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="language-modal-title"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--shadow-lg)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h3 id="language-modal-title" className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    {copy.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    aria-label={copy.closeAria}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {languageOptions.map((option) => {
                    const active = option.value === locale;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onSelect(option.value)}
                        className={
                          active
                            ? "w-full rounded-lg border border-[#2563eb] bg-[#2563eb]/15 px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)]"
                            : "w-full rounded-lg border border-[var(--card-border)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-3 text-xs text-[var(--text-tertiary)]">{copy.current}: {activeLabel}</p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
