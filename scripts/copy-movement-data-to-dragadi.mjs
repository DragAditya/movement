import mysql from "mysql2/promise";

const sourceConnectionString = process.env.DATABASE_URL;
const targetConnectionString = process.env.TIDB_DATABASE_URL;
if (!sourceConnectionString || !targetConnectionString) {
  throw new Error("DATABASE_URL and TIDB_DATABASE_URL are required");
}

function connectionOptions(connectionString, secure = false) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ...(secure ? { ssl: { rejectUnauthorized: true } } : {}),
  };
}

function quoteIdentifier(name) {
  return `\`${name.replace(/`/g, "``")}\``;
}

const source = await mysql.createConnection(connectionOptions(sourceConnectionString, true));
const target = await mysql.createConnection(connectionOptions(targetConnectionString, true));

try {
  const [sourceTableRows] = await source.query("SHOW TABLES");
  const sourceTables = sourceTableRows
    .map((row) => Object.values(row)[0])
    .filter((table) => typeof table === "string" && !table.startsWith("_"));

  await target.query("SET foreign_key_checks = 0");
  for (const table of sourceTables) {
    const quotedTable = quoteIdentifier(table);
    const [rows] = await source.query(`SELECT * FROM ${quotedTable}`);
    if (!rows.length) {
      console.log(`${table}: 0 rows`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const columnSql = columns.map(quoteIdentifier).join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT IGNORE INTO ${quotedTable} (${columnSql}) VALUES (${placeholders})`;
    for (const row of rows) {
      await target.execute(sql, columns.map((column) => row[column]));
    }

    const [[targetCount]] = await target.query(`SELECT COUNT(*) AS count FROM ${quotedTable}`);
    if (Number(targetCount.count) < rows.length) {
      throw new Error(`${table}: destination row count is lower than source after copy`);
    }
    console.log(`${table}: ${rows.length} rows copied`);
  }
  await target.query("SET foreign_key_checks = 1");
  console.log("Movement metadata transfer complete.");
} finally {
  await source.end();
  await target.end();
}
