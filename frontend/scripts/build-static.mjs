import {spawn} from "node:child_process";
import path from "node:path";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PLATFORM_TARGET: "static"
  },
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});