import { spawn, spawnSync } from "node:child_process";

// Playwright starts webServer before its globalSetup hook. Preparing here makes
// the disposable DB and test admin exist before Next accepts the first request.
const prepared = spawnSync(process.execPath, ["--import", "tsx", "e2e/prepare.ts"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});
if (prepared.status !== 0) process.exit(prepared.status ?? 1);

const server = spawn(process.execPath, ["server.mjs", "--dev"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.kill(signal));
}
server.on("exit", (code) => process.exit(code ?? 0));
