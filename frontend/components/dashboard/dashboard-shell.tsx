"use client";

import type {ReactNode} from "react";
import {useEffect, useState} from "react";
import {Settings2} from "lucide-react";
import {useLocale} from "next-intl";

import {Link, usePathname} from "@/i18n/navigation";
import {DashboardTopNav, type DashboardNavItem} from "@/components/dashboard/dashboard-topnav";
import {DesktopTitleBar} from "@/components/layout/DesktopTitleBar";

import {isDesktopShell} from "@/lib/platform";
import {cn} from "@/lib/utils";

type DashboardShellProps = {
  navItems: DashboardNavItem[];
  activeSection: string;
  topBarLead: ReactNode;
  children: ReactNode;
  onSectionNavigate?: (sectionId: string) => void;
  contentClassName?: string;
  pageClassName?: string;
  topBarClassName?: string;
  showLocaleSwitcher?: boolean;
};

export function DashboardShell({
  navItems,
  activeSection,
  topBarLead,
  children,
  onSectionNavigate,
  contentClassName,
  pageClassName,
  topBarClassName,
  showLocaleSwitcher = true
}: DashboardShellProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [desktopShell, setDesktopShell] = useState(false);

  useEffect(() => {
    setDesktopShell(isDesktopShell());
  }, []);

  return (
    <div className={cn("relative min-h-[100dvh] overflow-hidden bg-[var(--bg-primary)] pt-16", desktopShell && "pt-[5.5rem]")}>
      {desktopShell ? <DesktopTitleBar className="fixed inset-x-0 top-0 z-[80]" title="BlueVision" subtitle="Aquaculture AI Workspace" /> : null}

      <DashboardTopNav
        navItems={navItems}
        activeSection={activeSection}
        onSectionNavigate={onSectionNavigate}
      />

      <main className={cn("min-w-0 px-4 pb-4 pt-4 md:px-6", desktopShell ? "h-[calc(100dvh-5.5rem)]" : "min-h-[calc(100dvh-4rem)]", pageClassName)}>
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
          <header
            className={cn(
              "mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,245,0.9))] px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]",
              topBarClassName
            )}
          >
            <div className="min-w-0">{topBarLead}</div>
          </header>

          <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
        </div>
      </main>
    </div>
  );
}