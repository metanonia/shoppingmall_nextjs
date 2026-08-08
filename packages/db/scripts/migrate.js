const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const mariadb = require("mariadb");

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {
  // DATABASE_URL may already be provided by the caller or deployment environment.
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const baselineOnly = process.argv.includes("--baseline");

function connectionOptions(urlString) {
  const url = new URL(urlString);
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!database) throw new Error("DATABASE_URL must include a database name");

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    multipleStatements: true,
  };
}

async function migrationFiles() {
  const sqlDir = path.join(__dirname, "..", "sql");
  const names = (await fs.readdir(sqlDir))
    .filter((name) => /^\d{3}_.+\.sql$/.test(name))
    .sort((a, b) => a.localeCompare(b));
  return names.map((name) => ({ name, path: path.join(sqlDir, name) }));
}

async function main() {
  const connection = await mariadb.createConnection(connectionOptions(databaseUrl));
  let lockAcquired = false;

  try {
    const lockRows = await connection.query("SELECT GET_LOCK('shoppingmall_schema_migrate', 30) AS acquired");
    lockAcquired = Number(lockRows[0]?.acquired) === 1;
    if (!lockAcquired) throw new Error("Could not acquire the schema migration lock");

    await connection.query(`
      CREATE TABLE IF NOT EXISTS _shoppingmall_migrations (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const appliedRows = await connection.query("SELECT name, checksum FROM _shoppingmall_migrations");
    const applied = new Map(appliedRows.map((row) => [row.name, row.checksum]));
    const files = await migrationFiles();

    if (baselineOnly) {
      if (applied.size > 0) throw new Error("Cannot baseline: migration history is not empty");
      for (const file of files) {
        const sql = await fs.readFile(file.path, "utf8");
        const checksum = crypto.createHash("sha256").update(sql).digest("hex");
        await connection.query(
          "INSERT INTO _shoppingmall_migrations (name, checksum) VALUES (?, ?)",
          [file.name, checksum],
        );
        console.log(`base  ${file.name}`);
      }
      return;
    }

    for (const file of files) {
      const sql = await fs.readFile(file.path, "utf8");
      const checksum = crypto.createHash("sha256").update(sql).digest("hex");
      const previousChecksum = applied.get(file.name);

      if (previousChecksum) {
        if (previousChecksum !== checksum) {
          throw new Error(`Applied migration was modified: ${file.name}`);
        }
        console.log(`skip  ${file.name}`);
        continue;
      }

      console.log(`apply ${file.name}`);
      await connection.query(sql);
      await connection.query(
        "INSERT INTO _shoppingmall_migrations (name, checksum) VALUES (?, ?)",
        [file.name, checksum],
      );
    }
  } finally {
    if (lockAcquired) await connection.query("SELECT RELEASE_LOCK('shoppingmall_schema_migrate')");
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
