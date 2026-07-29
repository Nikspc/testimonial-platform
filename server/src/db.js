const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing. Check server/.env");
}

// Parse URL ourselves so query params (sslmode=...) don't change ssl behavior
const u = new URL(process.env.DATABASE_URL);

const pool = new Pool({
  host: u.hostname,
  port: Number(u.port || 5432),
  database: u.pathname.replace(/^\//, ""),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),

  // IMPORTANT: bypass cert verification (fixes SELF SIGNED CERT IN CHAIN)
  ssl: { rejectUnauthorized: false },
});

module.exports = { pool };