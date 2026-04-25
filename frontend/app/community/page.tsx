"use client";

import {Users} from "lucide-react";
import {useMemo} from "react";

import {CommunityFeed} from "@/components/community/community-feed";
import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";

export default function CommunityPage() {
  const navItems = useMemo<DashboardNavItem[]>(() => {
    return [];
  }, []);

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="community"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          <Users className="h-3.5 w-3.5" />
          Community
        </div>
      }
      contentClassName="overflow-hidden"
    >
      <section className="min-h-0 flex-1 overflow-auto rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,0.94))] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))] md:p-8">
        <CommunityFeed />
      </section>
    </DashboardShell>
  );
}
