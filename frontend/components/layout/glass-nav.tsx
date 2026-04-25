"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {usePathname} from "next/navigation";

import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
import {Link} from "@/i18n/navigation";
import {AUTH_STATE_CHANGED_EVENT, getStoredAccessToken} from "@/lib/api";

export function GlassNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const isDashboardPage = pathname.includes("/dashboard");

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(Boolean(getStoredAccessToken()));
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuth);
    };
  }, []);

  if (isDashboardPage) {
    return null;
  }

  const links = [
    {label: t("home"), href: "/"},
    {label: t("mission"), href: "/#mission"},
    {label: t("testimonials"), href: "/#testimonials"},
    {label: t("team"), href: "/#team"}
  ];

  return (
    <header className="sticky top-3 z-50 px-4 md:px-6">
      <nav className="glass-nav mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl px-4 py-3 md:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-[var(--text-primary)] md:text-xl"
        >
          Plantify
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm tracking-[0.08em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-zinc-50 transition-transform duration-150 hover:bg-[#1d4ed8] hover:text-zinc-50 active:scale-[0.98]"
            >
              {t("dashboard")}
            </Link>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
