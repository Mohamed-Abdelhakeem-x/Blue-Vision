import {type InputHTMLAttributes, useId} from "react";

import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

interface FloatingFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FloatingField({label, className, ...props}: FloatingFieldProps) {
  const id = useId();

  return (
    <div className="group relative">
      <Input
        id={id}
        placeholder=" "
        className={cn(
          "peer h-12 border-[var(--card-border)] bg-[var(--bg-primary)] pt-5 text-[var(--text-primary)]",
          "focus:border-[#2563eb] focus:ring-0 focus:outline-none",
          className
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute start-3 top-2.5 text-xs text-[var(--text-tertiary)] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2.5 peer-focus:text-xs peer-focus:text-[#2563eb]"
      >
        {label}
      </label>
      <span className="pointer-events-none absolute inset-0 rounded-lg ring-0 transition group-focus-within:ring-2 group-focus-within:ring-[#2563eb]" />
    </div>
  );
}
