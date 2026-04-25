"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud, XCircle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

import { detectPlant, getStoredAccessToken } from "@/lib/api";
import { formatBoostedConfidence } from "@/lib/confidence";
import type { DetectionResult } from "@/lib/types";
import { compressImage } from "@/hooks/use-image-compression";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface DetectionCardProps {
  token: string | null;
  onDetected: () => void;
}

export function DetectionCard({ token, onDetected }: DetectionCardProps) {
  const maxSize = 5 * 1024 * 1024;
  const [file, setFile] = useState<File | null>(null);
  const [segmented, setSegmented] = useState<File | null>(null);
  const [domain, setDomain] = useState("color");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateCandidate = (candidate: File): string | null => {
    if (!candidate.type.startsWith("image/")) {
      return "Only image files are allowed.";
    }
    if (candidate.size > maxSize) {
      return "File exceeds 5MB limit.";
    }
    return null;
  };

  const onDropOriginal = (accepted: File[]) => {
    const candidate = accepted[0];
    if (!candidate) {
      return;
    }
    const validationError = validateCandidate(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setFile(candidate);
  };

  const onDropSegmented = (accepted: File[]) => {
    const candidate = accepted[0];
    if (!candidate) {
      return;
    }
    const validationError = validateCandidate(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSegmented(candidate);
  };

  const originalZone = useDropzone({
    onDrop: onDropOriginal,
    maxFiles: 1,
    maxSize,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    }
  });

  const segmentedZone = useDropzone({
    onDrop: onDropSegmented,
    maxFiles: 1,
    maxSize,
    multiple: false,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"]
    }
  });

  const preview = useMemo(() => {
    if (!file) {
      return null;
    }
    return URL.createObjectURL(file);
  }, [file]);

  const onSubmit = async () => {
    const activeToken = token ?? getStoredAccessToken();
    if (!activeToken) {
      setError("Please sign in first.");
      return;
    }
    if (!file) {
      setError("Please upload an image first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const compressed = await compressImage(file);
      const compressedSegmented = segmented ? await compressImage(segmented) : undefined;
      const response = await detectPlant({
        token: activeToken,
        image: compressed,
        segmented: compressedSegmented,
        domain
      });
      setResult(response);
      onDetected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <h3 className="text-base font-semibold">Leaf Scan Intake</h3>
      <p className="mb-4 text-sm text-muted-foreground">Upload source and segmented samples for fast crop-health predictions.</p>

      <div className="grid gap-3">
        <div
          {...originalZone.getRootProps()}
          className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm transition hover:border-primary/80 dark:bg-muted/20"
        >
          <input {...originalZone.getInputProps()} />
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            <p>Original image: drag & drop or click to browse</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, max 5MB</p>
          {file ? (
            <p className="mt-2 text-xs text-blue-300">Selected: {file.name}</p>
          ) : null}
        </div>

        <div
          {...segmentedZone.getRootProps()}
          className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 text-sm transition hover:border-primary/80 dark:bg-muted/20"
        >
          <input {...segmentedZone.getInputProps()} />
          <div className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            <p>Segmented image (optional): drag & drop or click</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Used for before/after visualization</p>
          {segmented ? (
            <p className="mt-2 text-xs text-blue-300">Selected: {segmented.name}</p>
          ) : null}
        </div>

        <label className="text-sm text-muted-foreground">
          Domain
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="mt-2 h-11 w-full rounded-2xl border border-border bg-card px-3 text-foreground"
          >
            <option value="color">Color</option>
            <option value="grayscale">Grayscale</option>
            <option value="segmented">Segmented</option>
          </select>
        </label>

        <Button onClick={onSubmit} disabled={loading}>
          {loading ? "Detecting..." : "Run Detection"}
        </Button>
      </div>

      {preview ? (
        <Image
          src={preview}
          alt="Preview"
          width={800}
          height={320}
          unoptimized
          className="mt-4 h-40 w-full rounded-2xl object-cover"
        />
      ) : null}

      <AnimatePresence>
        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 dark:bg-muted/20"
          >
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Prediction</p>
            <h4 className="mt-1 text-lg font-semibold">{result.disease_type}</h4>
            <p className="text-sm">Confidence: {formatBoostedConfidence(result.confidence_score, 2)}</p>
            {result.analysis_note ? (
              <p className={`mt-2 rounded-xl border px-3 py-2 text-sm ${result.is_low_confidence ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-border bg-background/60 text-muted-foreground"}`}>
                {result.analysis_note}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-muted-foreground">{result.treatment_recommendations}</p>

            {result.top_predictions && result.top_predictions.length > 1 ? (
              <div className="mt-3 rounded-xl border border-border bg-background/50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Top Alternatives</p>
                <div className="mt-2 space-y-2">
                  {result.top_predictions.map((candidate) => (
                    <div key={`${candidate.index}-${candidate.label}`} className="flex items-center justify-between gap-3 text-sm">
                      <span className="line-clamp-1 text-foreground">{candidate.label}</span>
                      <span className="shrink-0 text-muted-foreground">{formatBoostedConfidence(candidate.confidence, 2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {(result.before_image_b64 || result.after_image_b64) ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {result.before_image_b64 ? (
                  <Image
                    src={`data:image/jpeg;base64,${result.before_image_b64}`}
                    alt="Before"
                    width={240}
                    height={96}
                    unoptimized
                    className="h-24 w-full rounded-lg object-cover"
                  />
                ) : null}
                {result.after_image_b64 ? (
                  <Image
                    src={`data:image/jpeg;base64,${result.after_image_b64}`}
                    alt="After"
                    width={240}
                    height={96}
                    unoptimized
                    className="h-24 w-full rounded-lg object-cover"
                  />
                ) : null}
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      {(originalZone.fileRejections.length > 0 || segmentedZone.fileRejections.length > 0) ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-red-400">
          <XCircle className="h-3.5 w-3.5" />
          One or more files were rejected. Ensure image format and 5MB max size.
        </p>
      ) : null}
    </Card>
  );
}
