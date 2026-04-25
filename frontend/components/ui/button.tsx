import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "success";
  size?: "sm" | "md" | "lg" | "icon";
};

const buttonStyles = {
  base: "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  
  variants: {
    primary: "bg-accent text-zinc-950 hover:text-zinc-950 dark:text-zinc-50 dark:hover:text-zinc-50 font-semibold hover:bg-accent-hover active:scale-95",
    secondary: "border border-card-border bg-card-bg text-text-primary hover:border-accent",
    ghost: "text-text-primary hover:bg-bg-secondary dark:hover:bg-bg-secondary/70",
    destructive: "bg-error text-white hover:bg-error/90 active:scale-95",
    success: "bg-success text-white hover:bg-success/90 active:scale-95"
  },
  
  sizes: {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
    icon: "h-10 w-10 p-0"
  }
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        buttonStyles.base,
        buttonStyles.variants[variant],
        buttonStyles.sizes[size],
        className
      )}
      {...props}
    />
  );
}

