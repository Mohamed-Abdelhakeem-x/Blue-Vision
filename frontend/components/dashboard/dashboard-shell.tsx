"use client";

import type {ReactNode} from "react";
import {useEffect, useState} from "react";
import {Settings2} from "lucide-react";
import {useLocale} from "next-intl";

import {Link, usePathname} from "@/i18n/navigation";
import {DashboardSidebar, type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {DesktopTitleBar} from "@/components/layout/DesktopTitleBar";
import {LocaleSwitcher} from "@/components/ui/locale-switcher";
import {ThemeToggle} from "@/components/ui/theme-toggle";
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
  const rtl = locale === "ar";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [desktopShell, setDesktopShell] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(window.localStorage.getItem("plantify-dashboard-sidebar-collapsed") === "true");
    setDesktopShell(isDesktopShell());
  }, []);

  useEffect(() => {
    window.localStorage.setItem("plantify-dashboard-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const shellPaddingClass = rtl
    ? sidebarCollapsed
      ? "lg:pr-24"
      : "lg:pr-[22rem]"
    : sidebarCollapsed
      ? "lg:pl-24"
      : "lg:pl-[22rem]";

  const sidebar = (
    <DashboardSidebar
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      navItems={navItems}
      activeSection={activeSection}
      onSectionNavigate={onSectionNavigate}
    />
  );

  return (
    <div className={cn("relative min-h-[100dvh] overflow-hidden bg-[var(--bg-primary)]", desktopShell && "pt-12", shellPaddingClass)}>
      {desktopShell ? <DesktopTitleBar className="fixed inset-x-0 top-0 z-[80]" title="Plantify" subtitle="Desktop Workspace" /> : null}

      {rtl ? null : sidebar}

      <main className={cn("min-w-0 px-4 pb-4 pt-4 md:px-6", desktopShell ? "h-[calc(100dvh-3rem)]" : "min-h-[100dvh]", pageClassName)}>
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col">
          <header
            className={cn(
              "mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,245,0.9))] px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]",
              topBarClassName
            )}
          >
            <div className="min-w-0">{topBarLead}</div>

            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                  pathname === "/settings"
                    ? "border-blue-600/30 bg-blue-600/10 text-[var(--text-primary)]"
                    : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-90"
                )}
              >
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </Link>
              <ThemeToggle />
              {showLocaleSwitcher ? <LocaleSwitcher /> : null}
            </div>
          </header>

          <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
        </div>
      </main>

      {rtl ? sidebar : null}
    </div>
  );
}