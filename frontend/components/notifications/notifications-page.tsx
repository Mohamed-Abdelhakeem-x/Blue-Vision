"use client";

import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {Bell, Loader2} from "lucide-react";
import {useMemo} from "react";
import {useLocale} from "next-intl";

import {DashboardShell} from "@/components/dashboard/dashboard-shell";
import {type DashboardNavItem} from "@/components/dashboard/dashboard-sidebar";
import {Button} from "@/components/ui/button";
import {useAuthSession} from "@/hooks/use-auth-session";
import {fetchNotifications, markNotificationRead} from "@/lib/api";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).notifications;
  const {token} = useAuthSession();
  const navItems = useMemo<DashboardNavItem[]>(() => [], []);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", token],
    queryFn: async () => fetchNotifications(token ?? ""),
    enabled: Boolean(token)
  });

  const readMutation = useMutation({
    mutationFn: async (notificationId: string) => markNotificationRead({token: token ?? "", notificationId}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey: ["notifications"]});
    }
  });

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="notifications"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          <Bell className="h-3.5 w-3.5" />
          {copy.lead}
        </div>
      }
      contentClassName="overflow-auto"
    >
      <section className="rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        {!notificationsQuery.data ? (
          <div className="flex min-h-[280px] items-center justify-center text-[var(--text-secondary)]">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {copy.loading}
          </div>
        ) : notificationsQuery.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
            {copy.empty}
          </div>
        ) : (
          <div className="space-y-4">
            {notificationsQuery.data.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-2xl border p-4 ${notification.is_read ? "border-[var(--card-border)] bg-[var(--bg-secondary)]" : "border-blue-600/25 bg-blue-600/10"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{notification.message}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                      <span suppressHydrationWarning>{new Date(notification.created_at.endsWith("Z") ? notification.created_at : notification.created_at + "Z").toLocaleString()}</span>
                    </p>
                  </div>
                  {!notification.is_read ? (
                    <Button type="button" variant="secondary" size="sm" className="rounded-xl" onClick={() => readMutation.mutate(notification.id)}>
                      {copy.markRead}
                    </Button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
