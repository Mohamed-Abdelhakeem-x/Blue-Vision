"use client";

import {MobileWrapper} from "@/components/layout/MobileWrapper";
import {ThemeProvider} from "@/components/theme-provider";
import {QueryProvider} from "@/components/providers/query-provider";

import { GoogleOAuthProvider } from "@react-oauth/google";

export function AppProviders({children}: {children: React.ReactNode}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <ThemeProvider>
        <QueryProvider>
          <MobileWrapper>{children}</MobileWrapper>
        </QueryProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
