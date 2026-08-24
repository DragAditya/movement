import mysql from "mysql2/promise";

const connectionString = process.env.TIDB_DATABASE_URL;
if (!connectionString) throw new Error("TIDB_DATABASE_URL is required");

const url = new URL(connectionString);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  ssl: { rejectUnauthorized: true },
});

try {
  const [rows] = await connection.query("SELECT enabled, autoAnalyzeNew, provider, model, batchSize FROM aiSettings LIMIT 1");
  console.log(JSON.stringify(rows[0] ?? null));
} finally {
  await connection.end();
}
