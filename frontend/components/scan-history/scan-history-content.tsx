"use client";

import {ImageIcon, Search, AlertCircle, CheckCircle2, Info, X} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import Image from "next/image";
import {useLocale, useTranslations} from "next-intl";
import {useQuery} from "@tanstack/react-query";

import {fetchHistory, getStoredAccessToken} from "@/lib/api";
import {boostDisplayedConfidence, formatBoostedConfidence} from "@/lib/confidence";
import {getDashboardCopy} from "@/lib/dashboard-copy";
import type {AppLocale} from "@/i18n/routing";
import type {ScanHistory} from "@/lib/types";
import {cn} from "@/lib/utils";

type NoticeKind = "error" | "success" | "info";

type Notice = {
  id: number;
  kind: NoticeKind;
  message: string;
};

function HistoryImage({row}: {row: ScanHistory}) {
  const imageSrc = row.before_image_b64 ? `data:image/jpeg;base64,${row.before_image_b64}` : null;

  if (imageSrc) {
    return (
      <Image
        src={imageSrc}
        alt="Scan thumbnail"
        width={160}
        height={96}
        unoptimized
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--bg-secondary)] text-[var(--text-tertiary)]">
      <ImageIcon className="h-4 w-4" />
    </div>
  );
}

export function ScanHistoryContent() {
  const t = useTranslations("dashboard");
  const locale = useLocale() as AppLocale;
  const copy = getDashboardCopy(locale).scanHistory;
  const [token, setToken] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState<"all" | "24h" | "7d" | "30d" | "90d">("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "attention">("all");
  const [minConfidence, setMinConfidence] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    setToken(getStoredAccessToken());
  }, []);

  const pushNotice = (kind: NoticeKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setNotices((prev) => [...prev, {id, kind, message}]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((notice) => notice.id !== id));
    }, 4500);
  };

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: () => fetchHistory(token ?? ""),
    enabled: Boolean(token)
  });

  useEffect(() => {
    if (historyQuery.error) {
      pushNotice("error", historyQuery.error instanceof Error ? historyQuery.error.message : t("errors.scan"));
    }
  }, [historyQuery.error, t]);

  const domains = useMemo(() => {
    const rows: ScanHistory[] = historyQuery.data ?? [];
    return Array.from(new Set(rows.map((row) => row.domain).filter(Boolean))).sort((left, right) => left.localeCompare(right));
  }, [historyQuery.data]);

  const filteredRows = useMemo(() => {
    const rows: ScanHistory[] = historyQuery.data ?? [];
    const sortedRows = [...rows].sort((a, b) => new Date(b.created_at.endsWith("Z") ? b.created_at : b.created_at + "Z").getTime() - new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at + "Z").getTime());
    const now = Date.now();
    const timeThreshold =
      timeFilter === "24h"
        ? now - 24 * 60 * 60 * 1000
        : timeFilter === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : timeFilter === "30d"
            ? now - 30 * 24 * 60 * 60 * 1000
            : timeFilter === "90d"
              ? now - 90 * 24 * 60 * 60 * 1000
              : null;
    const minimumConfidenceValue = Number(minConfidence) / 100;

    return sortedRows.filter((row) => {
      const haystack = `${row.fish_species ?? ""} ${row.health_status} ${row.domain} ${row.treatment_recommendations ?? ""}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const createdAt = new Date(row.created_at.endsWith("Z") ? row.created_at : row.created_at + "Z").getTime();
      const diseaseLabel = row.health_status.toLowerCase();
      const matchesTime = timeThreshold === null || createdAt >= timeThreshold;
      const matchesDomain = domainFilter === "all" || row.domain === domainFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "healthy" ? diseaseLabel.includes("healthy") : !diseaseLabel.includes("healthy"));
      const matchesConfidence = boostDisplayedConfidence(row.confidence_score) >= minimumConfidenceValue;
      const matchesStart = !startDate || createdAt >= new Date(`${startDate}T00:00:00`).getTime();
      const matchesEnd = !endDate || createdAt <= new Date(`${endDate}T23:59:59`).getTime();

      return matchesQuery && matchesTime && matchesDomain && matchesStatus && matchesConfidence && matchesStart && matchesEnd;
    });
  }, [domainFilter, endDate, historyQuery.data, minConfidence, query, startDate, statusFilter, timeFilter]);

  return (
    <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
      {notices.length > 0 ? (
        <div className="fixed right-4 top-4 z-[70] flex w-[min(90vw,24rem)] flex-col gap-2">
          {notices.map((notice) => {
            const tone =
              notice.kind === "error"
                ? "border-red-300/70 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                : notice.kind === "success"
                  ? "border-blue-300/70 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
                  : "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200";

            const Icon = notice.kind === "error" ? AlertCircle : notice.kind === "success" ? CheckCircle2 : Info;

            return (
              <div key={notice.id} className={cn("rounded-xl border px-3 py-2 shadow-lg backdrop-blur", tone)}>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-sm leading-5">{notice.message}</p>
                  <button
                    type="button"
                    onClick={() => setNotices((prev) => prev.filter((n) => n.id !== notice.id))}
                    className="ml-auto rounded p-1 opacity-70 transition hover:opacity-100"
                    aria-label={copy.dismiss}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">{t("history.title")}</h3>
        <div className="flex w-full flex-col gap-3 lg:max-w-3xl">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("history.searchPlaceholder")}
                className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563eb]"
              />
            </label>
            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              className="h-10 rounded-lg border border-[var(--card-border)] bg-[var(--bg-primary)] px-4 text-sm font-medium text-[var(--text-primary)] hover:border-[#2563eb]/50"
            >
              {advancedOpen ? copy.hideFilters : copy.advancedSearch}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {value: "all", label: copy.allTime},
              {value: "24h", label: "24h"},
              {value: "7d", label: "7d"},
              {value: "30d", label: "30d"},
              {value: "90d", label: "90d"}
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeFilter(option.value as typeof timeFilter)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition",
                  timeFilter === option.value
                    ? "border-blue-600/30 bg-blue-600/10 text-[var(--text-primary)]"
                    : "border-[var(--card-border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[#2563eb]/40"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {advancedOpen ? (
        <div className="mb-4 grid gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-primary)] p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-sm text-[var(--text-secondary)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{copy.domain}</span>
            <select
              value={domainFilter}
              onChange={(event) => setDomainFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563eb]"
            >
              <option value="all">{copy.allDomains}</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>{domain}</option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-[var(--text-secondary)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{copy.status}</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563eb]"
            >
              <option value="all">{copy.allOutcomes}</option>
              <option value="healthy">{copy.healthyOnly}</option>
              <option value="attention">{copy.needsAttention}</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-[var(--text-secondary)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{copy.minConfidence}</span>
            <select
              value={minConfidence}
              onChange={(event) => setMinConfidence(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563eb]"
            >
              <option value="0">{copy.anyConfidence}</option>
              <option value="50">50%+</option>
              <option value="70">70%+</option>
              <option value="85">85%+</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-[var(--text-secondary)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{copy.startDate}</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563eb]"
            />
          </label>

          <label className="space-y-1 text-sm text-[var(--text-secondary)]">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{copy.endDate}</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#2563eb]"
            />
          </label>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[var(--text-tertiary)]">
        <span>{filteredRows.length} {copy.results}</span>
        {(query || domainFilter !== "all" || statusFilter !== "all" || minConfidence !== "0" || startDate || endDate || timeFilter !== "all") ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setTimeFilter("all");
              setDomainFilter("all");
              setStatusFilter("all");
              setMinConfidence("0");
              setStartDate("");
              setEndDate("");
            }}
            className="font-semibold text-[var(--text-primary)] hover:text-[#2563eb]"
          >
            {copy.resetFilters}
          </button>
        ) : null}
      </div>

      <div className="space-y-3">
        {historyQuery.isLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("history.loading")}</p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("history.empty")}</p>
        ) : (
          filteredRows.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-2xl border border-[var(--card-border)] p-3 md:grid-cols-[112px_1fr_auto] md:items-center">
              <div className="h-24 overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                <HistoryImage row={row} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{row.fish_species || row.health_status}</p>
                  <span className="rounded-full bg-[var(--bg-secondary)] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                    {row.domain}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      row.health_status.toLowerCase().includes("healthy")
                        ? "bg-blue-600/15 text-blue-700 dark:text-blue-300"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    )}
                  >
                    {row.health_status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  <span suppressHydrationWarning>{new Date(row.created_at.endsWith("Z") ? row.created_at : row.created_at + "Z").toLocaleString()}</span>
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{row.treatment_recommendations}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]">{t("result.metrics.modelConfidence")}</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{formatBoostedConfidence(row.confidence_score, 1)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
