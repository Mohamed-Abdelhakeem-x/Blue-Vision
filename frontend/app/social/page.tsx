"use client";

import {MessagesSquare} from "lucide-react";
import {useMemo} from "react";

import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {SocialHub} from "@/components/profile/social-hub";

export default function SocialPage() {
  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="social"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          <MessagesSquare className="h-3.5 w-3.5" />
          Social
        </div>
      }
      contentClassName="overflow-auto"
    >
      <SocialHub />
    </DashboardShell>
  );
}
