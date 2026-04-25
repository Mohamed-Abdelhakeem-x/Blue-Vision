import type {CapacitorConfig} from "@capacitor/cli";

const isReleaseBuild = (process.env.NEXT_PUBLIC_APP_STAGE?.trim() || process.env.NODE_ENV) === "production";

const config: CapacitorConfig = {
  appId: "com.plantify.app",
  appName: "Plantify",
  webDir: "out",
  backgroundColor: "#0a0a0a",
  loggingBehavior: isReleaseBuild ? "none" : "debug",
  server: {
    hostname: "localhost",
    androidScheme: "https",
    cleartext: !isReleaseBuild
  },
  android: {
    allowMixedContent: !isReleaseBuild,
    captureInput: true,
    webContentsDebuggingEnabled: !isReleaseBuild
  },
  ios: {
    contentInset: "always",
    scrollEnabled: true,
    preferredContentMode: "mobile",
    webContentsDebuggingEnabled: !isReleaseBuild
  }
};

export default config;