export type BlueVisionPlatform = "web" | "ios" | "android" | "desktop";

declare global {
  interface Window {
    Capacitor?: {
      getPlatform?: () => string;
      isNativePlatform?: () => boolean;
    };
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  }
}

const LOCALHOST_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000/api";
const MOBILE_DEV_API_URL = process.env.NEXT_PUBLIC_MOBILE_DEV_API_URL?.trim() || "http://192.168.1.50:8000/api";
const PRODUCTION_API_URL = process.env.NEXT_PUBLIC_PRODUCTION_API_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://bluevision.limarise.com/api";

function resolveCapacitorPlatform(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const capacitorPlatform = window.Capacitor?.getPlatform?.();
  if (capacitorPlatform === "ios" || capacitorPlatform === "android") {
    return capacitorPlatform;
  }

  return null;
}

function resolveUserAgentPlatform(): BlueVisionPlatform {
  if (typeof navigator === "undefined") {
    return "web";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("android")) {
    return "android";
  }

  if (/(iphone|ipad|ipod)/.test(userAgent)) {
    return "ios";
  }

  if (userAgent.includes("tauri")) {
    return "desktop";
  }

  return "web";
}

export function getPlatform(): BlueVisionPlatform {
  const capacitorPlatform = resolveCapacitorPlatform();
  if (capacitorPlatform === "ios" || capacitorPlatform === "android") {
    return capacitorPlatform;
  }

  if (typeof window !== "undefined" && (window.__TAURI__ || window.__TAURI_INTERNALS__)) {
    return "desktop";
  }

  return resolveUserAgentPlatform();
}

export function isNativeMobilePlatform(): boolean {
  const platform = getPlatform();
  return platform === "ios" || platform === "android";
}

export function isDesktopShell(): boolean {
  return getPlatform() === "desktop";
}

export function getApiUrl(): string {
  const appStage = process.env.NEXT_PUBLIC_APP_STAGE?.trim() || process.env.NODE_ENV || "development";
  const isReleaseBuild = appStage === "production" || appStage === "release";

  if (isReleaseBuild) {
    return PRODUCTION_API_URL;
  }

  if (typeof window === "undefined") {
    return LOCALHOST_API_URL;
  }

  if (isNativeMobilePlatform()) {
    return MOBILE_DEV_API_URL;
  }

  return LOCALHOST_API_URL;
}
