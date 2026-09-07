import fs from "node:fs";
import path from "node:path";
import { initStore, isStoreReady, writeDbAsync } from "../lib/store";

const JSON_PATH = path.join(process.cwd(), "data", "db.json");

if (!fs.existsSync(JSON_PATH)) {
  console.log("No data/db.json found — nothing to migrate.");
  process.exit(0);
}

await initStore();
if (!isStoreReady()) {
  console.error("Store failed to initialize");
  process.exit(1);
}
await writeDbAsync({});
const backup = `${JSON_PATH}.migrated.${Date.now()}`;
fs.copyFileSync(JSON_PATH, backup);
console.log(`JSON store imported into PostgreSQL. Backup: ${backup}`);
console.log("Keep data/db.json until you verify users/orders/courses in the admin panel.");
process.exit(0);
