import { runMigrations } from "../lib/db/migrate";
import { initStore, flushStore } from "../lib/store";

await runMigrations();
await initStore();
await flushStore();
console.log("migrations applied");
process.exit(0);
