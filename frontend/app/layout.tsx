import type { Metadata } from "next";
import { Sora } from "next/font/google";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";

import { AppProviders } from "@/components/providers/app-providers";
import { LocaleSync } from "@/components/ui/locale-sync";
import { routing, type AppLocale } from "@/i18n/routing";
import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import esMessages from "@/messages/es.json";
import hiMessages from "@/messages/hi.json";
import zhMessages from "@/messages/zh.json";
import "./globals.css";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sora",
  display: "swap"
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic"],
  variable: "--font-plex-arabic",
  display: "swap"
});

export const metadata: Metadata = {
  title: "BlueVision - AI Fish Health Detection",
  description: "Advanced fish health detection and treatment recommendations powered by AI"
};

export const dynamic = "force-dynamic";

const messagesByLocale = {
  en: enMessages,
  ar: arMessages,
  es: esMessages,
  hi: hiMessages,
  zh: zhMessages
} as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = routing.locales.includes(cookieLocale as AppLocale)
    ? (cookieLocale as AppLocale)
    : routing.defaultLocale;
  const messages = messagesByLocale[locale];
  const rtl = locale === "ar";

  return (
    <html
      lang={locale}
      dir={rtl ? "rtl" : "ltr"}
      className={`dark ${sora.variable} ${ibmPlexArabic.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
          <AppProviders>
            <LocaleSync />
            {children}
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
