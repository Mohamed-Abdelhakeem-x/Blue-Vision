"use client";

import {useQuery} from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ClipboardCheck,
  FlaskConical,
  History,
  Home,
  Plant,
  LogOut,
  Menu,
  MessageSquareHeart,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import {useEffect, useState} from "react";
import {useLocale} from "next-intl";

import {Link, usePathname} from "@/i18n/navigation";
import {fetchNotifications, getStoredAccessToken, logoutCurrentSession} from "@/lib/api";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";
import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";

export type DashboardNavItem = {
  id: string;
  label: string;
  icon: "activity" | "clipboard" | "flask" | "history" | "plant" | "message" | "shield" | "users" | "user" | "bell";
  href?: string;
};

function iconForNavItem(icon: DashboardNavItem["icon"]) {
  switch (icon) {
    case "activity":
      return Activity;
    case "clipboard":
      return ClipboardCheck;
    case "flask":
      return FlaskConical;
    case "history":
      return History;
    case "plant":
      return Plant;
    case "message":
      return MessageSquareHeart;
    case "shield":
      return ShieldCheck;
    case "users":
      return Users;
    case "user":
      return UserRound;
    case "bell":
      return Bell;
    default:
      return Settings2;
  }
}

function NavLink({
  collapsed,
  active,
  href,
  label,
  icon: Icon,
  badgeCount
}: {
  collapsed: boolean;
  active: boolean;
  href: string;
  label: string;
  icon: ReturnType<typeof iconForNavItem>;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
        active
          ? "border-blue-600/30 bg-blue-600/10 text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(37,99,235,0.08)]"
          : "border-transparent bg-[var(--bg-secondary)]/55 text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:bg-[var(--bg-secondary)]",
        collapsed && "h-11 w-11 justify-center rounded-full px-0 py-0"
      )}
      aria-current={active ? "location" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? null : <span className="truncate font-semibold">{label}</span>}
      {badgeCount && badgeCount > 0 && !collapsed ? (
        <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-blue-700 px-2 py-0.5 text-[11px] font-semibold text-white">
          {badgeCount}
        </span>
      ) : null}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg group-hover:block rtl:left-auto rtl:right-full rtl:ml-0 rtl:mr-3">
          {label}
        </span>
      ) : null}
    </Link>
  );
}

function NavButton({
  collapsed,
  active,
  onClick,
  label,
  icon: Icon
}: {
  collapsed: boolean;
  active: boolean;
  onClick: () => void;
  label: string;
  icon: ReturnType<typeof iconForNavItem>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
        active
          ? "border-blue-600/30 bg-blue-600/10 text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(37,99,235,0.08)]"
          : "border-transparent bg-[var(--bg-secondary)]/55 text-[var(--text-secondary)] hover:border-[var(--card-border)] hover:bg-[var(--bg-secondary)]",
        collapsed && "h-11 w-11 justify-center rounded-full px-0 py-0"
      )}
      aria-current={active ? "location" : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {collapsed ? null : <span className="truncate font-semibold">{label}</span>}
      {collapsed ? (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-lg group-hover:block rtl:left-auto rtl:right-full rtl:ml-0 rtl:mr-3">
          {label}
        </span>
      ) : null}
    </button>
  );
}

function SidePanelContent({
  collapsed,
  navItems,
  activeSection,
  onToggleCollapsed,
  onNavigate,
  pathname
}: {
  collapsed: boolean;
  navItems: DashboardNavItem[];
  activeSection: string;
  onToggleCollapsed: () => void;
  onNavigate: (sectionId: string) => void;
  pathname: string;
}) {
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).sidebar;
  const dashboardLabel = copy.dashboard;
  const logoutLabel = copy.logout;
  const token = typeof window === "undefined" ? null : getStoredAccessToken();
  const workflowItems = navItems.filter((item) => !["scan", "analyze", "act", "scan-history"].includes(item.id));
  const notificationsQuery = useQuery({
    queryKey: ["sidebar-notifications", token],
    queryFn: async () => fetchNotifications(token ?? ""),
    enabled: Boolean(token),
    refetchInterval: 15000
  });
  const unreadCount = notificationsQuery.data?.filter((item) => !item.is_read).length ?? 0;

  const quickLinks = [
    {id: "dashboard", label: copy.home, href: "/dashboard", icon: Home},
    {id: "social", label: locale === "ar" ? "التواصل" : "Social", href: "/social", icon: Users},
    {id: "community", label: copy.community, href: "/community", icon: Users},
    {id: "notifications", label: copy.notifications, href: "/notifications", icon: Bell},
    {id: "profile", label: copy.profile, href: "/profile", icon: UserRound},
    {id: "history", label: copy.history, href: "/scan-history", icon: History},
    {id: "settings", label: copy.settings, href: "/settings", icon: Settings2}
  ];

  return (
    <div className={cn("flex h-full flex-col gap-4 p-4", collapsed && "items-center px-3")}>
      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          "w-full rounded-[1.4rem] border border-[var(--card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,245,0.92))] p-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition-all hover:border-[#2563eb]/40 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]",
          collapsed && "flex h-12 w-12 items-center justify-center rounded-full p-0"
        )}
        title={collapsed ? dashboardLabel : undefined}
      >
        {collapsed ? (
          <Menu className="h-5 w-5 text-[var(--text-primary)]" />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{copy.workspace}</p>
              <span className="mt-1 block text-base font-semibold text-[var(--text-primary)]">{dashboardLabel}</span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-600/20 bg-blue-600/10 text-blue-700 dark:text-blue-300">
              <Menu className="h-4 w-4" />
            </div>
          </div>
        )}
      </button>

      <div className={cn("w-full rounded-[1.6rem] border border-[var(--card-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(246,248,247,0.92))] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(145deg,rgba(24,24,27,0.95),rgba(39,39,42,0.88))]", collapsed && "w-auto border-none bg-transparent p-0 shadow-none")}>
        {workflowItems.length > 0 && !collapsed ? <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{copy.workflow}</p> : null}
        {workflowItems.length > 0 ? <ul className={cn("mt-2 space-y-2", collapsed && "mt-0 flex flex-col items-center gap-2 space-y-0")}>
          {workflowItems.map((item) => {
            const Icon = iconForNavItem(item.icon);
            const isActive = item.href ? pathname === item.href || pathname.startsWith(`${item.href}#`) : activeSection === item.id;

            return (
              <li key={item.id} className="w-full">
                {item.href ? (
                  <NavLink collapsed={collapsed} active={isActive} href={item.href} label={item.label} icon={Icon} />
                ) : (
                  <NavButton collapsed={collapsed} active={isActive} onClick={() => onNavigate(item.id)} label={item.label} icon={Icon} />
                )}
              </li>
            );
          })}
        </ul> : null}

        {collapsed ? null : (
          <>
            {workflowItems.length > 0 ? <div className="my-3 h-px bg-[var(--card-border)]/80" /> : null}
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">{copy.navigate}</p>
          </>
        )}
        <ul className={cn("mt-2 space-y-2", collapsed && "mt-0 flex flex-col items-center gap-2 space-y-0")}>
          {quickLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <li key={link.id} className="w-full">
                <NavLink
                  collapsed={collapsed}
                  active={isActive}
                  href={link.href}
                  label={link.label}
                  icon={link.icon}
                  badgeCount={link.id === "notifications" ? unreadCount : undefined}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className={cn("w-full rounded-[1.35rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-3", collapsed && "hidden")}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/12 text-blue-700 dark:text-blue-300">
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.historyTitle}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">{copy.historyDescription}</p>
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <Button
        type="button"
        onClick={async () => {
          const token = getStoredAccessToken();
          if (token) {
            await logoutCurrentSession();
          }
          window.location.href = "/login";
        }}
        title={collapsed ? logoutLabel : undefined}
        className={cn(
          "mb-14 w-full gap-2 rounded-2xl bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] lg:mb-0",
          collapsed && "h-10 w-10 rounded-full p-0"
        )}
      >
        <LogOut className="h-4 w-4" />
        {collapsed ? null : logoutLabel}
      </Button>
    </div>
  );
}

export function DashboardSidebar({
  collapsed,
  onCollapsedChange,
  navItems,
  activeSection,
  onSectionNavigate
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  navItems: DashboardNavItem[];
  activeSection: string;
  onSectionNavigate?: (sectionId: string) => void;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const rtl = locale === "ar";
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const effectiveCollapsed = isDesktop ? collapsed : false;

  useEffect(() => {
    const updateDesktopState = () => {
      setIsDesktop(window.matchMedia("(min-width: 1024px)").matches);
    };

    updateDesktopState();
    window.addEventListener("resize", updateDesktopState);
    return () => window.removeEventListener("resize", updateDesktopState);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const navigateToSection = (sectionId: string) => {
    onSectionNavigate?.(sectionId);
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.scrollIntoView({behavior: "smooth", block: "start"});
    window.history.replaceState(null, "", `#${sectionId}`);
    setIsOpen(false);
  };

  return (
    <>
      <div className={cn("fixed bottom-6 z-40 block lg:hidden", rtl ? "right-6" : "left-6")}>
        <Button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-12 w-12 rounded-full bg-[var(--accent-primary)] p-3 text-white hover:opacity-90"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {isOpen ? <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} /> : null}

      <aside
        className={cn(
          "fixed inset-y-0 z-40 w-[min(86vw,21rem)] transform bg-[var(--bg-primary)] transition-[transform,width] duration-300 ease-in-out lg:w-[22rem]",
          effectiveCollapsed ? "lg:w-24" : "lg:w-[22rem]",
          rtl ? "right-0 border-l" : "left-0 border-r",
          "border-[var(--card-border)]",
          rtl
            ? isOpen
              ? "translate-x-0"
              : "translate-x-full lg:translate-x-0"
            : isOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--card-border)] p-4 lg:hidden">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{getDashboardCopy(locale as AppLocale).sidebar.dashboard}</h2>
          <button onClick={() => setIsOpen(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("h-full overscroll-contain pb-6 lg:pb-0", effectiveCollapsed ? "overflow-y-hidden" : "overflow-y-auto") }>
          <SidePanelContent
            collapsed={effectiveCollapsed}
            navItems={navItems}
            activeSection={activeSection}
            onToggleCollapsed={() => {
              if (!isDesktop) return;
              onCollapsedChange(!collapsed);
            }}
            onNavigate={navigateToSection}
            pathname={pathname}
          />
        </div>
      </aside>
    </>
  );
}
