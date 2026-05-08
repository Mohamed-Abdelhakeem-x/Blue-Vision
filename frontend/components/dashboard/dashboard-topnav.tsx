"use client";

import {useQuery} from "@tanstack/react-query";
import {
  Activity,
  Bell,
  ClipboardCheck,
  FlaskConical,
  History,
  Home,
  Fish,
  LogOut,
  Menu,
  MessageSquareHeart,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  X
} from "lucide-react";
import {useState} from "react";
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
  icon: "activity" | "clipboard" | "flask" | "history" | "fish" | "message" | "shield" | "users" | "user" | "bell";
  href?: string;
};

export function iconForNavItem(icon: DashboardNavItem["icon"]) {
  switch (icon) {
    case "activity":
      return Activity;
    case "clipboard":
      return ClipboardCheck;
    case "flask":
      return FlaskConical;
    case "history":
      return History;
    case "fish":
      return Fish;
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

export function DashboardTopNav({
  navItems,
  activeSection,
  onSectionNavigate
}: {
  navItems: DashboardNavItem[];
  activeSection: string;
  onSectionNavigate?: (sectionId: string) => void;
}) {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const copy = getDashboardCopy(locale).sidebar;
  const [isOpen, setIsOpen] = useState(false);

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
    {id: "social", label: locale === "ar" ? "التواصل" : "Social", href: "/social", icon: MessageSquareHeart},
    {id: "community", label: copy.community, href: "/community", icon: Users},
    {id: "notifications", label: copy.notifications, href: "/notifications", icon: Bell},
    {id: "profile", label: copy.profile, href: "/profile", icon: UserRound},
    {id: "history", label: copy.history, href: "/scan-history", icon: History}
  ];

  const handleNavigate = (sectionId: string) => {
    onSectionNavigate?.(sectionId);
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", `#${sectionId}`);
    }
    setIsOpen(false);
  };

  const handleLogout = async () => {
    if (token) await logoutCurrentSession();
    window.location.href = "/login";
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-[var(--card-border)] bg-[var(--bg-primary)]/80 px-4 backdrop-blur-md md:px-6">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="group flex items-center gap-2.5 text-xl font-black tracking-tight select-none">
              {/* Smart Eye / Fish Eyeball Logo */}
              <svg viewBox="0 0 24 24" className="h-8 w-8 transition-transform duration-500 group-hover:scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)] group-hover:drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]" fill="none">
                {/* Outer Eye Shape */}
                <path d="M2 12C2 12 7 4 12 4C17 4 22 12 22 12C22 12 17 20 12 20C7 20 2 12 2 12Z" stroke="url(#nav-grad)" strokeWidth="1.5" fill="rgba(34,211,238,0.05)" />
                {/* AI Scanning Iris Ring */}
                <circle cx="12" cy="12" r="5" stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1 2" className="origin-center animate-[spin_8s_linear_infinite]" />
                {/* Fish Eyeball Body */}
                <path d="M9 12C9 10 11 9 13 9C15 9 17 10 17 12C17 14 15 15 13 15C11 15 9 14 9 12Z" fill="url(#nav-grad)" fillOpacity="0.2" stroke="url(#nav-grad)" strokeWidth="1" />
                {/* Fish Eyeball Tail */}
                <path d="M9 12L6 9.5V14.5L9 12Z" fill="url(#nav-grad)" />
                {/* Fish Pupil (Glowing) */}
                <circle cx="14" cy="11.5" r="0.8" fill="#ffffff" style={{ filter: "drop-shadow(0 0 2px #ffffff)" }} />
                
                <defs>
                  <linearGradient id="nav-grad" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#67e8f9" />
                    <stop offset="1" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="flex items-center transition-opacity group-hover:opacity-90">
                <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 bg-clip-text text-transparent" style={{ filter: "drop-shadow(0 0 12px rgba(34,211,238,0.3))" }}>Blue</span>
                <span className="text-[var(--text-primary)]" style={{ filter: "drop-shadow(0 0 8px rgba(59,130,246,0.25))" }}>Vision</span>
              </div>
            </Link>
          </div>

          <nav className="hidden flex-1 items-center justify-end gap-1 lg:flex">
            {workflowItems.map((item) => {
              const Icon = iconForNavItem(item.icon);
              const isActive = item.href ? pathname === item.href || pathname.startsWith(`${item.href}#`) : activeSection === item.id;
              
              const content = (
                <div className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-blue-600/10 text-blue-600" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                )}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              );

              return item.href ? (
                <Link key={item.id} href={item.href}>{content}</Link>
              ) : (
                <button type="button" key={item.id} onClick={() => handleNavigate(item.id)}>{content}</button>
              );
            })}

            <div className="mx-2 h-6 w-px bg-[var(--card-border)]" />

            {quickLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link key={link.id} href={link.href} className={cn("relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]", isActive ? "text-blue-600 bg-blue-600/10" : "text-[var(--text-secondary)]")} title={link.label}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{link.label}</span>
                  {link.id === "notifications" && unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-2 w-2 rounded-full bg-red-600" />
                  )}
                </Link>
              );
            })}

            <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-2 gap-1.5 text-red-500 hover:bg-red-500/10 hover:text-red-600" title={copy.logout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">{copy.logout}</span>
            </Button>
          </nav>

          <div className="flex items-center lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-x-0 top-16 z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-[var(--card-border)] bg-[var(--bg-primary)] p-4 shadow-lg lg:hidden">
          <div className="flex flex-col gap-4">
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase text-[var(--text-tertiary)]">{copy.workflow}</p>
              {workflowItems.map((item) => {
                const Icon = iconForNavItem(item.icon);
                const isActive = item.href ? pathname === item.href || pathname.startsWith(`${item.href}#`) : activeSection === item.id;
                const content = (
                  <div className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                    isActive ? "bg-blue-600/10 text-blue-600" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  )}>
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </div>
                );
                return item.href ? (
                  <Link key={item.id} href={item.href} onClick={() => setIsOpen(false)}>{content}</Link>
                ) : (
                  <button type="button" key={item.id} className="w-full text-left" onClick={() => handleNavigate(item.id)}>{content}</button>
                );
              })}
            </div>
            
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold uppercase text-[var(--text-tertiary)]">{copy.navigate}</p>
              {quickLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                const Icon = link.icon;
                return (
                  <Link key={link.id} href={link.href} onClick={() => setIsOpen(false)} className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium",
                    isActive ? "bg-blue-600/10 text-blue-600" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  )}>
                    <Icon className="h-5 w-5" />
                    {link.label}
                    {link.id === "notifications" && unreadCount > 0 && (
                      <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </div>

            <Button variant="destructive" onClick={handleLogout} className="mt-4 w-full gap-2">
              <LogOut className="h-4 w-4" />
              {copy.logout}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
