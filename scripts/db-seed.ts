import { isProduction } from "../lib/env";
import { initStore, seed, writeDbAsync } from "../lib/store";

if (isProduction() && process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Refusing to seed production. Set ALLOW_DEMO_SEED=true only for a disposable environment.");
  process.exit(1);
}

await initStore();
await writeDbAsync(seed());
console.log("development seed written (demo users only; do not use these passwords in production)");
process.exit(0);
