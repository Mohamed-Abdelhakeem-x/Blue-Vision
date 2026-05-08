"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Fish, Loader2, Sparkles, UploadCloud, Video, X, XCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

import { detectFish, getStoredAccessToken } from "@/lib/api";
import { formatBoostedConfidence } from "@/lib/confidence";
import type { DetectionResult } from "@/lib/types";
import { compressImage } from "@/hooks/use-image-compression";
import { cn } from "@/lib/utils";

interface DetectionCardProps {
  token: string | null;
  onDetected: () => void;
}

export function DetectionCard({ token, onDetected }: DetectionCardProps) {
  const maxSize = 50 * 1024 * 1024;
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isVideo = file?.type.startsWith("video/") ?? false;

  const preview = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: (accepted) => {
      const candidate = accepted[0];
      if (!candidate) return;
      setError(null);
      setResult(null);
      setFile(candidate);
    },
    maxFiles: 1,
    maxSize,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "video/mp4": [".mp4"],
      "video/webm": [".webm"],
      "video/quicktime": [".mov"],
    },
  });

  const captureVideoFrame = (): Promise<File> =>
    new Promise((resolve, reject) => {
      const video = videoRef.current;
      if (!video) { reject(new Error("Video element not ready")); return; }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas context failed")); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("Frame capture failed")); return; }
        resolve(new File([blob], "captured-frame.jpg", { type: "image/jpeg" }));
      }, "image/jpeg", 0.92);
    });

  const onSubmit = async () => {
    const activeToken = token ?? getStoredAccessToken();
    if (!activeToken) { setError("Please sign in first."); return; }
    if (!file) { setError("Please upload a fish photo or video first."); return; }

    setLoading(true);
    setError(null);

    try {
      const imageToAnalyze = isVideo ? await captureVideoFrame() : file;
      const compressed = await compressImage(imageToAnalyze);
      const response = await detectFish({ token: activeToken, image: compressed, domain: "color" });
      setResult(response);
      onDetected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => { setFile(null); setResult(null); setError(null); };

  return (
    <div className="w-full rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden shadow-[0_4px_32px_rgba(15,23,42,0.08)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--card-border)] bg-gradient-to-r from-blue-600/8 to-transparent px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15">
          <Fish className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Fish Health Analysis</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Upload a photo or video — AI will analyze fish health instantly</p>
        </div>
        {file ? (
          <button
            type="button"
            onClick={clearFile}
            className="ml-auto rounded-lg p-1.5 text-[var(--text-tertiary)] transition hover:bg-red-500/10 hover:text-red-400"
            aria-label="Clear file"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        {/* Left column – upload + controls */}
        <div className="flex flex-col gap-4">
          {/* Dropzone / Preview */}
          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
                isDragActive
                  ? "border-blue-500 bg-blue-500/8 scale-[1.01]"
                  : "border-[var(--card-border)] hover:border-blue-400/60 hover:bg-blue-500/4"
              )}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
                  isDragActive ? "bg-blue-500/20" : "bg-[var(--bg-secondary)]"
                )}>
                  <UploadCloud className={cn("h-7 w-7", isDragActive ? "text-blue-400" : "text-[var(--text-tertiary)]")} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {isDragActive ? "Drop your file here" : "Drag & drop or click to upload"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    JPG, PNG, WEBP, MP4, WebM, MOV · max 50 MB
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-tertiary)]">
                    <Fish className="h-3 w-3" /> Photo
                  </span>
                  <span className="flex items-center gap-1 rounded-full border border-[var(--card-border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] text-[var(--text-tertiary)]">
                    <Video className="h-3 w-3" /> Video
                  </span>
                </div>
              </motion.div>
            </div>
          ) : isVideo ? (
            <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-[var(--card-border)]">
              <video
                ref={videoRef}
                src={preview ?? undefined}
                controls
                crossOrigin="anonymous"
                className="max-h-56 w-full object-contain"
              />
              <p className="bg-zinc-950 px-4 py-2 text-center text-xs text-zinc-400">
                Pause on the best frame, then click <strong className="text-zinc-200">Analyze</strong>
              </p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl">
              <Image
                src={preview ?? ""}
                alt="Fish preview"
                width={800}
                height={320}
                unoptimized
                className="h-[220px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <p className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                {file.name}
              </p>
            </div>
          )}


          {/* Analyze button */}
          <motion.button
            type="button"
            onClick={onSubmit}
            disabled={loading || !file}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all",
              loading || !file
                ? "cursor-not-allowed bg-blue-600/40 text-white/60"
                : "bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)]"
            )}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analyze Fish</>
            )}
          </motion.button>

          {/* Errors */}
          <AnimatePresence>
            {(error ?? fileRejections.length > 0) ? (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400"
              >
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                {error ?? "File rejected — use JPG/PNG/WEBP/MP4/WebM/MOV, max 50 MB."}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Right column – results */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="flex flex-col gap-3"
            >
              {/* Status badge */}
              <div className={cn(
                "flex items-center gap-2 rounded-2xl border px-4 py-3",
                result.health_status.toLowerCase().includes("healthy")
                  ? "border-blue-500/20 bg-blue-500/8"
                  : "border-amber-500/20 bg-amber-500/8"
              )}>
                <CheckCircle2 className={cn("h-5 w-5", result.health_status.toLowerCase().includes("healthy") ? "text-blue-400" : "text-amber-400")} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Diagnosis</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{result.health_status}</p>
                </div>
                <span className="ml-auto text-lg font-bold text-[var(--text-primary)]">
                  {formatBoostedConfidence(result.confidence_score, 1)}
                </span>
              </div>

              {/* Confidence bar */}
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                  <span>Model confidence</span>
                  <span>{formatBoostedConfidence(result.confidence_score, 1)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-300/30 dark:bg-zinc-700/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: formatBoostedConfidence(result.confidence_score, 1) }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-blue-500"
                  />
                </div>
              </div>

              {/* Treatment */}
              {result.treatment_recommendations ? (
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Recommendation</p>
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{result.treatment_recommendations}</p>
                </div>
              ) : null}

              {/* Analysis note */}
              {result.analysis_note ? (
                <p className={cn(
                  "rounded-xl border px-3 py-2 text-xs leading-relaxed",
                  result.is_low_confidence
                    ? "border-amber-500/20 bg-amber-500/8 text-amber-300"
                    : "border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
                )}>
                  {result.analysis_note}
                </p>
              ) : null}

              {/* Before/after images */}
              {(result.before_image_b64 || result.after_image_b64) ? (
                <div className="grid grid-cols-2 gap-2">
                  {result.before_image_b64 ? (
                    <div className="overflow-hidden rounded-xl">
                      <p className="mb-1 text-[10px] text-[var(--text-tertiary)]">Before</p>
                      <Image src={`data:image/jpeg;base64,${result.before_image_b64}`} alt="Before" width={240} height={96} unoptimized className="h-24 w-full rounded-lg object-cover" />
                    </div>
                  ) : null}
                  {result.after_image_b64 ? (
                    <div className="overflow-hidden rounded-xl">
                      <p className="mb-1 text-[10px] text-[var(--text-tertiary)]">After</p>
                      <Image src={`data:image/jpeg;base64,${result.after_image_b64}`} alt="After" width={240} height={96} unoptimized className="h-24 w-full rounded-lg object-cover" />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--card-border)] text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10">
                <Fish className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Analysis results</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">Upload a fish photo or video and click Analyze</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
