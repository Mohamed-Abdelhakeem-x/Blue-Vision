"use client";

import {useEffect, useState} from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 border border-[var(--card-border)] bg-[var(--card-bg)] p-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      aria-label="Toggle color mode"
      title={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle color mode"}
      disabled={!mounted}
    >
      {mounted && isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
    </Button>
  );
}
