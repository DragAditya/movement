import mysql from "mysql2/promise";
import { describe, expect, it } from "vitest";

const connectionUrl = process.env.TIDB_DATABASE_URL;
const suite = connectionUrl ? describe : describe.skip;

suite("DragAdi Movement schema", () => {
  it("contains the required gallery, album, and duplicate-review tables", async () => {
    const url = new URL(connectionUrl!);
    const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: Number(url.port || 4000),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      ssl: { rejectUnauthorized: true },
    });
    try {
      const [rows] = await connection.query<Array<{ tableName: string }>>(
        `SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = ?`,
        [database],
      );
      const names = new Set(rows.map((row) => row.tableName));
      for (const table of ["galleryImages", "albums", "albumImages", "duplicateReviewCandidates", "aiSettings"]) {
        expect(names.has(table)).toBe(true);
      }
    } finally {
      await connection.end();
    }
  }, 15_000);
});
