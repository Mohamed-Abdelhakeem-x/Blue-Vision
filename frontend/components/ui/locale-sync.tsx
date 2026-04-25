"use client";

import {useEffect} from "react";
import {useLocale} from "next-intl";

import {usePathname} from "@/i18n/navigation";
import {routing} from "@/i18n/routing";

const LOCALE_STORAGE_KEY = "plantify.locale";

function persistLocale(nextLocale: string) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
}

function buildLocaleRedirectPath(pathname: string, locale: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalizedPath === "/" ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function LocaleSync() {
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    const storedLocaleRaw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const storedLocale = storedLocaleRaw?.trim() ?? "";

    if (!storedLocale) {
      persistLocale(locale);
      return;
    }

    if (!routing.locales.includes(storedLocale as (typeof routing.locales)[number])) {
      persistLocale(locale);
      return;
    }

    if (storedLocale === locale) {
      persistLocale(locale);
      return;
    }

    persistLocale(storedLocale);
    window.location.replace(buildLocaleRedirectPath(pathname, storedLocale));
  }, [locale, pathname]);

  return null;
}
