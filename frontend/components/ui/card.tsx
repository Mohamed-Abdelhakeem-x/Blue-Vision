import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  glow?: boolean;
};

export function Card({
  className,
  interactive = false,
  glow = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-card-border bg-card-bg transition-all duration-200",
        glow && "shadow-cobalt dark:shadow-cobalt-md hover:shadow-cobalt-lg",
        !glow && "shadow-sm dark:shadow-glass",
        interactive && "cursor-pointer hover:shadow-md dark:hover:shadow-glass-sm hover:border-accent/50 active:scale-[0.98]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-2xl font-bold tracking-tight text-text-primary",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-6 pt-0", className)} {...props} />
  );
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-card-border p-6 pt-4",
        className
      )}
      {...props}
    />
  );
}
