import * as React from "react";
import {cn} from "@/lib/utils";

const badgeVariants = {
  default: "bg-bg-secondary text-text-primary border border-card-border",
  lime: "bg-cobalt-100 text-cobalt-900 dark:bg-cobalt-900/30 dark:text-cobalt-300",
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  outline: "border border-accent text-accent hover:bg-accent/10"
} as const;

type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium gap-1.5",
        badgeVariants[variant ?? "default"],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
