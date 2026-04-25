"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedContainerProps {
  children: ReactNode;
  staggerChildren?: boolean;
  staggerDelay?: number;
  fadeIn?: boolean;
  slideUp?: boolean;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

export function AnimatedContainer({
  children,
  staggerChildren = true,
  staggerDelay = 0,
  fadeIn = false,
  slideUp = false,
  className = "",
}: AnimatedContainerProps) {
  const variants = staggerChildren
    ? {
        ...containerVariants,
        visible: {
          ...containerVariants.visible,
          transition: {
            ...containerVariants.visible.transition,
            delayChildren: staggerDelay,
          },
        },
      }
    : undefined;
  
  if (!staggerChildren && (fadeIn || slideUp)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: slideUp ? 10 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={variants}
      initial={staggerChildren ? "hidden" : "visible"}
      animate="visible"
      className={className}
    >
      {staggerChildren
        ? Array.isArray(children)
          ? children.map((child, index) => (
              <motion.div key={index} variants={itemVariants}>
                {child}
              </motion.div>
            ))
          : children
        : children}
    </motion.div>
  );
}
