"use client";

import {motion} from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  Sparkles,
  UploadCloud,
  X
} from "lucide-react";
import {useEffect, useMemo, useState} from "react";
import Image from "next/image";
import {useTranslations} from "next-intl";
import {useDropzone} from "react-dropzone";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {Button} from "@/components/ui/button";
import {cn} from "@/lib/utils";
import {compressImage} from "@/hooks/use-image-compression";
import {boostDisplayedConfidence} from "@/lib/confidence";
import {
  detectPlant,
  fetchStats,
  getStoredAccessToken
} from "@/lib/api";
import type {DetectionResult} from "@/lib/types";

function createPreview(file: File | null): string | null {
  return file ? URL.createObjectURL(file) : null;
}

type NoticeKind = "error" | "success" | "info";

type Notice = {
  id: number;
  kind: NoticeKind;
  message: string;
};

function parseTreatmentSections(text: string | null | undefined) {
  const fallback = {
    immediate: "",
    next: "",
    monitor: ""
  };

  if (!text) {
    return fallback;
  }

  const sections = {...fallback};
  for (const line of text.split(/\n+/g).map((part) => part.trim()).filter(Boolean)) {
    const [label, ...rest] = line.split(":");
    const body = rest.join(":").trim();
    const normalized = label.toLowerCase();
    if (normalized.startsWith("immediate")) {
      sections.immediate = body;
    } else if (normalized.startsWith("next")) {
      sections.next = body;
    } else if (normalized.startsWith("monitor")) {
      sections.monitor = body;
    }
  }

  return sections;
}

function ConfidenceBar({label, value}: {label: string; value: number}) {
  const tone = value >= 75 ? "bg-[#2563eb]" : value >= 45 ? "bg-[#f59e0b]" : "bg-[#ef4444]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-300/50 dark:bg-zinc-800">
        <motion.div
          className={cn("h-full rounded-full", tone)}
          initial={{width: 0}}
          animate={{width: `${Math.max(0, Math.min(100, value))}%`}}
          transition={{duration: 0.45, ease: "easeOut"}}
        />
      </div>
    </div>
  );
}

export function FarmerDashboard() {
  const t = useTranslations("dashboard");
  const queryClient = useQueryClient();
  const token = getStoredAccessToken();

  const [original, setOriginal] = useState<File | null>(null);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  const pushNotice = (kind: NoticeKind, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 10000);
    setNotices((prev) => [...prev, {id, kind, message}]);
    window.setTimeout(() => {
      setNotices((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  const previewUrl = useMemo(() => createPreview(original), [original]);

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: () => fetchStats(token ?? ""),
    enabled: Boolean(token)
  });

  const detectMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error(t("errors.signIn"));
      }
      if (!original) {
        throw new Error(t("errors.upload"));
      }

      const compressed = await compressImage(original);
      return detectPlant({
        token,
        image: compressed,
        domain: "color"
      });
    },
    onSuccess: (payload) => {
      setResult(payload);
      pushNotice("success", `${payload.plant_name}: ${payload.disease}`);
      void queryClient.invalidateQueries({queryKey: ["history"]});
      void queryClient.invalidateQueries({queryKey: ["stats"]});
    }
  });

  useEffect(() => {
    if (!detectMutation.error) return;
    pushNotice("error", detectMutation.error instanceof Error ? detectMutation.error.message : t("errors.scan"));
  }, [detectMutation.error, t]);

  useEffect(() => {
    if (statsQuery.error) {
      pushNotice("error", statsQuery.error instanceof Error ? statsQuery.error.message : t("errors.scan"));
    }
  }, [statsQuery.error, t]);

  const zone = useDropzone({
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    },
    onDrop: (accepted) => {
      setOriginal(accepted[0] ?? null);
      if (accepted[0]) {
        pushNotice("info", "Image ready for scanning.");
      }
    }
  });

  const confidence = boostDisplayedConfidence(result?.confidence_score ?? 0) * 100;
  const treatment = parseTreatmentSections(result?.treatment_recommendations);
  const isHealthy = result?.disease_type.toLowerCase().includes("healthy") ?? false;

  const beforeSrc = result?.before_image_b64
    ? `data:image/jpeg;base64,${result.before_image_b64}`
    : previewUrl;
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
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
                    aria-label="Dismiss notification"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{t("eyebrow")}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{t("title")}</h2>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[30rem]">
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-xs text-[var(--text-tertiary)]">{t("snapshot.totalScans")}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{statsQuery.data?.total_scans ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-xs text-[var(--text-tertiary)]">{t("snapshot.healthyRatio")}</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{((statsQuery.data?.healthy_ratio ?? 0) * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
            <p className="text-xs text-[var(--text-tertiary)]">{t("snapshot.topDisease")}</p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">{statsQuery.data?.top_disease ?? t("snapshot.noDominantDisease")}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section id="scan" data-dashboard-section className="scroll-mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Scan</h3>
            <span className="text-xs text-[var(--text-tertiary)]">
              {detectMutation.isPending ? t("scanIntake.statusProcessing") : original ? t("scanIntake.statusReady") : t("scanIntake.statusWaiting")}
            </span>
          </div>

          <div
            {...zone.getRootProps()}
            className={cn(
              "relative flex min-h-[22rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed p-4 transition",
              zone.isDragActive ? "border-[#2563eb] bg-[#2563eb]/10" : "border-[var(--card-border)] bg-transparent"
            )}
          >
            <input {...zone.getInputProps()} />
            {previewUrl ? (
              <>
                <Image
                  src={previewUrl}
                  alt="Leaf preview"
                  width={1200}
                  height={720}
                  unoptimized
                  className="h-full w-full rounded-xl object-cover"
                />
                {detectMutation.isPending ? (
                  <div className="absolute inset-0 bg-black/15">
                    <div className="line-sweep absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563eb] to-transparent" />
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-[var(--text-tertiary)]" />
                <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">{t("scanIntake.dropzoneTitle")}</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">JPG, PNG, or WEBP</p>
              </div>
            )}
          </div>

          <Button
            type="button"
            onClick={() => detectMutation.mutate()}
            disabled={detectMutation.isPending || !original}
            className="mt-4 h-11 w-full bg-[#2563eb] text-zinc-50 hover:bg-[#1d4ed8] active:scale-[0.98]"
          >
            {detectMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("scanIntake.scanning")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("scanIntake.cta")}
              </>
            )}
          </Button>

        </section>
          <section id="analyze" data-dashboard-section className="scroll-mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Analyze</h3>
              {result ? <span className="text-xs text-[var(--text-tertiary)]">{t("result.domainLabel")} {result.domain}</span> : null}
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)]">
                  {beforeSrc ? (
                    <Image
                      src={beforeSrc}
                      alt="Scan source"
                      width={1200}
                      height={448}
                      unoptimized
                      className="h-56 w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)]">{t("result.plantLabel")}</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{result.plant_name}</p>
                    </div>
                    <div className="hidden sm:block sm:border-l sm:border-[var(--card-border)] sm:pl-4">
                      <p className="text-xs text-[var(--text-tertiary)]">{t("result.statusLabel")}</p>
                      <p className="text-lg font-semibold text-[var(--text-primary)]">{result.disease}</p>
                    </div>
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      isHealthy ? "bg-blue-600/15 text-blue-700 dark:text-blue-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                    )}>
                      {isHealthy ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <AlertTriangle className="mr-1 h-3.5 w-3.5" />}
                      {isHealthy ? t("result.statusHealthy") : t("result.statusAttention")}
                    </span>
                  </div>
                  <div className="mt-4">
                    <ConfidenceBar label={t("result.metrics.modelConfidence")} value={confidence} />
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)]/60 p-6 text-center">
                <Clock3 className="h-7 w-7 text-[var(--text-tertiary)]" />
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Run a scan to generate analysis details.</p>
              </div>
            )}
          </section>

          <section id="act" data-dashboard-section className="scroll-mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Act</h3>
              {result ? (
                <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
                  Treatment plan
                </span>
              ) : null}
            </div>

            {result ? (
              <div className="grid gap-3">
                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{t("result.immediate")}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{treatment.immediate}</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{t("result.next")}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{treatment.next}</p>
                </div>
                <div className="rounded-2xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{t("result.monitor")}</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{treatment.monitor}</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)]/60 p-6 text-center">
                <Sparkles className="h-7 w-7 text-[var(--text-tertiary)]" />
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Treatment guidance appears here after analysis completes.</p>
              </div>
            )}
          </section>
      </div>

    </main>
  );
}
