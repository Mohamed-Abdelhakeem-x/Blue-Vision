import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        `
        w-full px-4 py-2.5 rounded-lg
        bg-card-bg border border-card-border
        text-text-primary placeholder:text-text-tertiary
        focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
        dark:focus:ring-offset-transparent
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        resize-vertical
        `,
        className
      )}
      {...props}
    />
  );
}
