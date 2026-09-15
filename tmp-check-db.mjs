import postgres from "postgres";

const urls = [
  "postgres://asadzedeh@127.0.0.1:5432/asadzedeh",
  "postgres://postgres@127.0.0.1:5432/postgres",
  "postgres://@127.0.0.1:5432/postgres",
  "postgres://postgres:postgres@127.0.0.1:5432/asadzedeh",
  "postgres://postgres:postgres@127.0.0.1:5432/postgres",
];

for (const url of urls) {
  try {
    const sql = postgres(url, { connect_timeout: 5 });
    const r = await sql`SELECT 1 as test, current_user as user, current_database() as db`;
    console.log(`OK: ${url} ->`, r[0]);
    await sql.end();
  } catch (e) {
    console.log(`ERR: ${url} -> ${e.message}`);
  }
}
process.exit(0);
