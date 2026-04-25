"use client";

import {MobileWrapper} from "@/components/layout/MobileWrapper";
import {ThemeProvider} from "@/components/theme-provider";
import {QueryProvider} from "@/components/providers/query-provider";

export function AppProviders({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <MobileWrapper>{children}</MobileWrapper>
      </QueryProvider>
    </ThemeProvider>
  );
}
