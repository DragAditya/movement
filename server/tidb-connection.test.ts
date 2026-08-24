import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";

const connectionUrl = process.env.TIDB_DATABASE_URL;
const suite = connectionUrl ? describe : describe.skip;

suite("configured TiDB Cloud connection", () => {
  it("can run a lightweight TLS database health query", async () => {
    const url = new URL(connectionUrl!);
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port || 4000),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      ssl: { rejectUnauthorized: true },
    });
    try {
      const [rows] = await connection.query<Array<{ healthy: number }>>("SELECT 1 AS healthy");
      expect(rows[0]?.healthy).toBe(1);
    } finally {
      await connection.end();
    }
  }, 15_000);
});
