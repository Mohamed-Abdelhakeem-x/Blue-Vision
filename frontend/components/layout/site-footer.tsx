"use client";

import {useTranslations} from "next-intl";

export function SiteFooter() {
  const t = useTranslations("landing");
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {t("copyright").replace("2025", String(year))}
            </p>

            <div>
              <span className="text-xs font-semibold text-foreground/40 uppercase tracking-[0.25em]">
                {t("tagline")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
