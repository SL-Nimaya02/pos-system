import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "root",
  database: "pos_db",
});

await conn.execute(`
  CREATE TABLE IF NOT EXISTS balance_sheet_accounts (
    id          VARCHAR(36)                              NOT NULL PRIMARY KEY,
    name        VARCHAR(200)                             NOT NULL,
    type        ENUM('asset','liability','capital')      NOT NULL,
    category    VARCHAR(100)                             NOT NULL,
    balance     DECIMAL(15,2)                            NOT NULL DEFAULT '0',
    notes       TEXT,
    created_at  TIMESTAMP                                NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP                                NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

const [rows] = await conn.execute("SHOW TABLES LIKE 'balance_sheet_accounts'");
console.log(rows.length ? "✓ Table balance_sheet_accounts created/exists" : "✗ Table not found");

await conn.end();
