"use client";

import type {CSSProperties, ReactNode} from "react";
import {useEffect, useState} from "react";

import {cn} from "@/lib/utils";
import {getPlatform, type BlueVisionPlatform} from "@/lib/platform";

const MOBILE_SAFE_AREA_STYLE: CSSProperties = {
  paddingTop: "max(env(safe-area-inset-top, 0px), 0px)",
  paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
  paddingLeft: "max(env(safe-area-inset-left, 0px), 0px)",
  paddingRight: "max(env(safe-area-inset-right, 0px), 0px)"
};

export function MobileWrapper({children}: {children: ReactNode}) {
  const [platform, setPlatform] = useState<BlueVisionPlatform>("web");

  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  const usesMobileInsets = platform === "ios" || platform === "android";

  return (
    <div
      data-platform={platform}
      className={cn("min-h-screen w-full", usesMobileInsets && "bg-[var(--bg-primary)]")}
      style={usesMobileInsets ? MOBILE_SAFE_AREA_STYLE : undefined}
    >
      {children}
    </div>
  );
}