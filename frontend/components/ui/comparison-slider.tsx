"use client";

import {motion, useMotionValue, useSpring, useTransform} from "framer-motion";
import {GripVertical} from "lucide-react";
import {useCallback, useRef} from "react";
import Image from "next/image";

interface ComparisonSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** Height of the image viewport (Tailwind h-* class), default h-72 */
  className?: string;
}

export function ComparisonSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Processed",
  className = "h-72"
}: ComparisonSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /** Raw position (0–100 percent), smooth spring follows it */
  const rawX = useMotionValue(50);
  const smoothX = useSpring(rawX, {stiffness: 420, damping: 36});

  const handleLeft = useTransform(smoothX, (v) => `${v}%`);
  const clipBefore = useTransform(smoothX, (v) => `inset(0 ${100 - v}% 0 0)`);

  const setPosition = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      rawX.set(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
    },
    [rawX]
  );

  // ── Mouse drag ──────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setPosition(e.clientX);
      const onMove = (ev: MouseEvent) => setPosition(ev.clientX);
      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [setPosition]
  );

  // ── Touch drag ──────────────────────────────────────────
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setPosition(e.touches[0].clientX);
      const onMove = (ev: TouchEvent) => setPosition(ev.touches[0].clientX);
      const onEnd = () => {
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
      };
      window.addEventListener("touchmove", onMove, {passive: true});
      window.addEventListener("touchend", onEnd);
    },
    [setPosition]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`relative w-full select-none cursor-col-resize overflow-hidden rounded-2xl border border-lumaris-border bg-black/50 ${className}`}
    >
      {/* After image — always fully visible underneath */}
      <Image
        src={afterSrc}
        alt={afterLabel}
        fill
        unoptimized
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Before image — reveals from left as handle moves right */}
      <motion.div
        style={{clipPath: clipBefore}}
        className="absolute inset-0"
      >
        <Image
          src={beforeSrc}
          alt={beforeLabel}
          fill
          unoptimized
          draggable={false}
          className="h-full w-full object-cover"
        />
      </motion.div>

      {/* Divider line + handle */}
      <motion.div
        className="pointer-events-none absolute inset-y-0"
        style={{left: handleLeft}}
      >
        {/* Vertical rule */}
        <div className="absolute inset-y-0 left-0 w-px bg-lumaris-lime shadow-[0_0_12px_rgba(200,228,59,0.5)]" />

        {/* Circular handle */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-lumaris-lime bg-lumaris-dark shadow-[0_0_18px_rgba(200,228,59,0.45)]">
            <GripVertical className="h-5 w-5 text-lumaris-lime" />
          </div>
        </div>
      </motion.div>

      {/* Corner labels */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-between px-3">
        <span className="rounded-lg bg-black/70 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm">
          {beforeLabel}
        </span>
        <span className="rounded-lg bg-black/70 px-2 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}

