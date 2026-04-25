import { spawn } from "node:child_process";

const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";
const START_TIMEOUT_MS = 120000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReady(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // Server not ready yet.
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function assertOk(pathname) {
  const url = `${BASE_URL}${pathname}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Expected ${url} to return 2xx, got ${response.status}`);
  }
}

async function main() {
  const child =
    process.platform === "win32"
      ? spawn("cmd.exe", ["/d", "/s", "/c", "bun run start -p 3100"], {
          cwd: process.cwd(),
          stdio: "inherit",
        })
      : spawn("bun", ["run", "start", "-p", "3100"], {
          cwd: process.cwd(),
          stdio: "inherit",
        });

  try {
    await waitForReady(`${BASE_URL}/login`, START_TIMEOUT_MS);

    await assertOk("/login");
    await assertOk("/signup");
    await assertOk("/auth/code");

    console.log("Frontend e2e smoke checks passed");
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
