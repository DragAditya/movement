import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const connectionString = process.env.TIDB_DATABASE_URL;
if (!connectionString) throw new Error("TIDB_DATABASE_URL is required");

const url = new URL(connectionString);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 4000),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  ssl: { rejectUnauthorized: true },
});

try {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS _movement_migrations (
      name varchar(255) NOT NULL PRIMARY KEY,
      appliedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrationsDir = path.resolve(import.meta.dirname, "..", "drizzle");
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
  const [appliedRows] = await connection.query("SELECT name FROM _movement_migrations");
  const applied = new Set(appliedRows.map((row) => row.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    const statements = sql.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);
    for (const statement of statements) await connection.query(statement);
    await connection.query("INSERT INTO _movement_migrations (name) VALUES (?)", [file]);
    console.log(`Applied ${file}`);
  }

  console.log("DragAdi schema migration complete.");
} finally {
  await connection.end();
}
