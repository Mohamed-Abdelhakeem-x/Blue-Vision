"use client";

import {motion, useMotionValue, useSpring, useTransform} from "framer-motion";
import {type HTMLMotionProps} from "framer-motion";
import {useCallback} from "react";

import {cn} from "@/lib/utils";

export function BentoTile({className, ...props}: HTMLMotionProps<"div">) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, {stiffness: 220, damping: 18});
  const springY = useSpring(y, {stiffness: 220, damping: 18});

  const rotateX = useTransform(springY, [-10, 10], [2, -2]);
  const rotateY = useTransform(springX, [-10, 10], [-2, 2]);

  const onMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width - 0.5) * 20;
    const py = ((event.clientY - rect.top) / rect.height - 0.5) * 20;
    x.set(px);
    y.set(py);
  }, [x, y]);

  const onLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{rotateX, rotateY}}
      whileHover={{scale: 1.01}}
      transition={{type: "spring", stiffness: 260, damping: 20}}
      className={cn(
        "group relative overflow-hidden rounded-xl border-[0.5px] border-white/10 bg-[#09090b] p-5",
        "shadow-[0_0_0_0.5px_rgba(200,228,59,0)_inset] hover:border-[#C8E43B]/70",
        "shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.04)]",
        "hover:shadow-[0_0_0_0.5px_rgba(200,228,59,0.6)_inset,0_20px_45px_rgba(0,0,0,0.45)]",
        className
      )}
      {...props}
    />
  );
}
