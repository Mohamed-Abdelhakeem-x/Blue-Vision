"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Fish, Loader2, Sparkles, UploadCloud, Video, X, XCircle, AlertOctagon, HelpCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

import { detectFish, detectBehaviorAnomaly, getStoredAccessToken, getPonds, PondResponse } from "@/lib/api";
import { formatBoostedConfidence } from "@/lib/confidence";
import type { DetectionResult } from "@/lib/types";
import { compressImage } from "@/hooks/use-image-compression";
import { cn } from "@/lib/utils";

interface DetectionCardProps {
  token: string | null;
  onDetected: (result: DetectionResult) => void;
  onPondSelected?: (pondId: string) => void;
  triggerReloadPonds?: boolean;
}

export function DetectionCard({ token, onDetected, onPondSelected, triggerReloadPonds }: DetectionCardProps) {
  const maxSize = 50 * 1024 * 1024;
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Ponds selection states
  const [ponds, setPonds] = useState<PondResponse[]>([]);
  const [selectedPondId, setSelectedPondId] = useState<string>("");

  const isVideo = file?.type.startsWith("video/") ?? false;

  const preview = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // Load ponds on mount
  useEffect(() => {
    getPonds()
      .then((data) => {
        setPonds(data);
        if (data.length > 0) {
          setSelectedPondId(data[0].id);
          if (onPondSelected) onPondSelected(data[0].id);
        }
      })
      .catch((err) => console.error("Error loading ponds:", err));
  }, [triggerReloadPonds]);

  const handlePondChange = (id: string) => {
    setSelectedPondId(id);
    if (onPondSelected) onPondSelected(id);
  };

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
    if (!selectedPondId) { setError("Please select a target pond first."); return; }
    if (!file) { setError("Please upload a fish photo or video first."); return; }

    setLoading(true);
    setError(null);

    try {
      if (isVideo) {
        // Run behavior anomaly for videos (can take ~3 mins)
        const response = await detectBehaviorAnomaly(activeToken, file, selectedPondId);
        const mappedResult: DetectionResult = {
          health_status: response.prediction === "Abnormal" ? "Abnormal Swimming Behavior" : "Healthy Swimming Behavior",
          fish_species: "Nile Tilapia",
          disease: response.prediction === "Abnormal" ? "Abnormal Swimming Behavior" : "Healthy Swimming Behavior",
          confidence_score: 0.95, // mock high confidence
          treatment_recommendations: response.prediction === "Abnormal" ? "Immediate isolation required." : "No action needed.",
          domain: "video",
          fish_count: response.fish_count,
          analysis_note: `Tracked ${response.healthy_tracks} healthy fish and ${response.abnormal_tracks} abnormal fish across the video.`,
          is_low_confidence: false
        };
        setResult(mappedResult);
        onDetected(mappedResult);
      } else {
        // Run color analysis for images
        const compressed = await compressImage(file);
        const response = await detectFish({ 
          token: activeToken, 
          image: compressed, 
          pondId: selectedPondId,
          domain: "color" 
        });
        setResult(response);
        onDetected(response);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => { setFile(null); setResult(null); setError(null); };

  const isHealthy = result?.health_status.toLowerCase().includes("healthy") ?? false;

  return (
    <div className="w-full rounded-[1.75rem] border border-[var(--card-border)] bg-[var(--card-bg)] overflow-hidden shadow-[0_4px_32px_rgba(15,23,42,0.08)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--card-border)] bg-gradient-to-r from-blue-600/8 to-transparent px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15">
            <Fish className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">AI Video & Photo Diagnosis Hub</h3>
            <p className="text-xs text-[var(--text-tertiary)]">Interactive Computer Vision scanning for active ponds</p>
          </div>
        </div>

        {/* Mandatory Pond Selection Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Target Pond:</label>
          {ponds.length === 0 ? (
            <span className="text-xs text-red-400 font-medium">Deploy a pond first!</span>
          ) : (
            <select
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500 font-medium"
              value={selectedPondId}
              onChange={(e) => handlePondChange(e.target.value)}
            >
              {ponds.map((p) => (
                <option key={p.id} value={p.id}>{p.name ? `${p.name} (${p.type})` : `${p.type} (${p.id.slice(0, 8)})`}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        {/* Left column – upload + preview */}
        <div className="flex flex-col gap-4">
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
            <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-[var(--card-border)] relative flex flex-col">
              <div className="relative">
                <video
                  ref={videoRef}
                  src={preview ?? undefined}
                  controls
                  crossOrigin="anonymous"
                  className="max-h-56 w-full object-contain"
                />
                {!loading && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-2 right-2 rounded-lg p-1.5 bg-black/60 hover:bg-red-500/20 text-zinc-300 hover:text-white backdrop-blur-sm transition z-10"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="bg-zinc-950 px-4 py-2.5 flex items-center justify-between border-t border-zinc-800">
                <span className="text-xs text-zinc-400 truncate max-w-[200px]" title={file.name}>{file.name}</span>
                <span className="text-xs font-medium text-blue-400">Ready for behavior scan</span>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-[var(--card-border)]">
              {/* Responsive container for visual SVG overlays */}
              <div className="relative w-full h-[220px]">
                <Image
                  src={preview ?? ""}
                  alt="Fish preview"
                  fill
                  unoptimized
                  className="object-cover"
                />

                {/* VISUAL BOUNDING BOX OVERLAYS */}
                {result?.bounding_boxes && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {result.bounding_boxes.map((bbox: any, i: number) => {
                      const [ymin, xmin, ymax, xmax] = bbox.box;
                      const isBBoxHealthy = bbox.label.toLowerCase().includes("healthy");
                      const color = isBBoxHealthy ? "#10b981" : "#ef4444";
                      
                      return (
                        <g key={i}>
                          <rect
                            x={`${xmin * 100}%`}
                            y={`${ymin * 100}%`}
                            width={`${(xmax - xmin) * 100}%`}
                            height={`${(ymax - ymin) * 100}%`}
                            fill={isBBoxHealthy ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.12)"}
                            stroke={color}
                            strokeWidth="2.5"
                            strokeDasharray={isBBoxHealthy ? "none" : "4 2"}
                            className={isBBoxHealthy ? "" : "animate-pulse"}
                          />
                          <foreignObject
                            x={`${xmin * 100}%`}
                            y={`${(ymin * 100) - 8}%`}
                            width="140"
                            height="20"
                          >
                            <span 
                              style={{ backgroundColor: color }}
                              className="text-[8px] font-black text-white px-1.5 py-0.5 rounded shadow uppercase tracking-wide inline-block"
                            >
                              {bbox.label} ({(bbox.confidence * 100).toFixed(0)}%)
                            </span>
                          </foreignObject>
                        </g>
                      );
                    })}
                  </svg>
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 flex items-center justify-between right-3 pointer-events-none">
                <p className="rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                  {file.name}
                </p>
                {file && !loading && (
                  <button
                    type="button"
                    onClick={clearFile}
                    className="rounded-lg p-1 bg-black/60 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 backdrop-blur-sm pointer-events-auto transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Analyze button */}
          <motion.button
            type="button"
            onClick={onSubmit}
            disabled={loading || !file || !selectedPondId}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-all",
              loading || !file || !selectedPondId
                ? "cursor-not-allowed bg-blue-600/40 text-white/60"
                : "bg-blue-600 text-white shadow-[0_4px_14px_rgba(37,99,235,0.4)] hover:bg-blue-700 hover:shadow-[0_6px_20px_rgba(37,99,235,0.5)]"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> 
                {isVideo ? "Analyzing video behavior (this may take a few minutes)..." : "Analyzing..."}
              </>
            ) : (
              <><Sparkles className="h-4 w-4" /> Run Diagnosis Scan</>
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
                isHealthy
                  ? "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10"
                  : "border-red-500/20 bg-red-500/5 dark:bg-red-950/10"
              )}>
                <CheckCircle2 className={cn("h-5 w-5", isHealthy ? "text-emerald-400 animate-pulse" : "text-red-400 animate-bounce")} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Diagnosis Status</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {isHealthy ? "Healthy Nile Tilapia" : `Disease Flagged: ${result.health_status}`}
                  </p>
                </div>
                <span className="ml-auto text-lg font-bold text-[var(--text-primary)]">
                  {formatBoostedConfidence(result.confidence_score, 1)}
                </span>
              </div>

              {/* Fish Count Badge */}
              {result.fish_count !== undefined && result.fish_count > 0 && (
                <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/10 px-4 py-3">
                  <div className="text-blue-500">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Population Count</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {result.fish_count} Fish Detected
                    </p>
                  </div>
                </div>
              )}

              {/* DYNAMIC ALERT & ISOLATION PROTOCOLS CARD */}
              {!isHealthy && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-2 animate-pulse"
                >
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertOctagon className="h-5 w-5 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Immediate Biosecurity Isolation Required</h4>
                  </div>
                  <p className="text-xs leading-4 text-zinc-700 dark:text-zinc-300 font-medium">
                    Critical infection profile identified. Place Pond units under immediate quarantine and isolate affected stock specimens to prevent biological leakage.
                  </p>
                </motion.div>
              )}

              {/* Confidence bar */}
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                  <span>Inference Confidence</span>
                  <span>{formatBoostedConfidence(result.confidence_score, 1)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-300/30 dark:bg-zinc-700/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: formatBoostedConfidence(result.confidence_score, 1) }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${isHealthy ? "bg-emerald-500" : "bg-red-500"}`}
                  />
                </div>
              </div>

              {/* Treatment */}
              {result.treatment_recommendations ? (
                <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--bg-secondary)] px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Isolation & Treatment Recommendations</p>
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
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--card-border)] text-center bg-zinc-50/20 dark:bg-zinc-950/10"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10">
                <Fish className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Diagnosis scan results</p>
                <p className="mt-1 text-xs text-[var(--text-tertiary)] font-medium">Select a pond, upload a fish photo/video, and execute scan</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
