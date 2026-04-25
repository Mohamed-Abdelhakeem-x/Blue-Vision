"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const isRTL = locale === "ar";

  React.useEffect(() => {
    // Set document direction
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    
    // Set language-specific body class
    document.body.classList.toggle("arabic", isRTL);
    document.body.classList.toggle("english", !isRTL);
  }, [locale, isRTL]);

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="system" 
      enableSystem 
      disableTransitionOnChange={false}
      storageKey="plantify-theme"
    >
      <div dir={isRTL ? "rtl" : "ltr"}>
        {children}
      </div>
    </NextThemesProvider>
  );
}
