"use client";

import {NextIntlClientProvider} from "next-intl";

import enMessages from "@/messages/en.json";

export function DefaultIntlProvider({children}: {children: React.ReactNode}) {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
