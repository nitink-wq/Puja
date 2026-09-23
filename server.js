/*
  Static file server for the pooja fake-door site, plus a minimal event-
  capture API (POST /api/events, GET /api/events/export) backed by Postgres
  when DATABASE_URL is set. Without DATABASE_URL (e.g. local dev via
  _devserver.py, or this file run without the env var), event capture just
  logs to console instead of failing - the UI must never break because of
  analytics.
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATABASE_URL = process.env.DATABASE_URL || "";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ---------- Event capture (Postgres) ----------

let pool = null;

function getPool() {
  if (!DATABASE_URL) return null;
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

function ensureEventsTable() {
  const p = getPool();
  if (!p) return Promise.resolve();
  return p.query(
    "CREATE TABLE IF NOT EXISTS events (" +
      "id SERIAL PRIMARY KEY, " +
      "user_id TEXT, " +
      "event_name TEXT NOT NULL, " +
      "page TEXT, " +
      "page_name TEXT, " +
      "recharge_count TEXT, " +
      "variant TEXT, " +
      "props JSONB, " +
      "created_at TIMESTAMPTZ NOT NULL DEFAULT now()" +
      ")"
  );
}

ensureEventsTable().catch(function (err) {
  console.error("[events] failed to ensure events table:", err.message);
});

function handleEventPost(req, res) {
  let body = "";
  req.on("data", function (chunk) {
    body += chunk;
    if (body.length > 1e6) req.destroy(); // guard against absurdly large payloads
  });
  req.on("end", function () {
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "invalid JSON" }));
      return;
    }

    const eventName = String(payload.event_name || "unknown");
    const props = payload.props || {};
    const userId = props.user_id != null ? String(props.user_id) : "";
    const page = props.page != null ? String(props.page) : "";
    const pageName = props.page_name != null ? String(props.page_name) : "";
    const rechargeCount = props.recharge_count != null ? String(props.recharge_count) : "";
    const variant = props.variant != null ? String(props.variant) : "";

    const p = getPool();
    if (!p) {
      // No DATABASE_URL configured (local dev) - log instead of failing.
      console.info("[events:fallback]", eventName, props);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, stored: false }));
      return;
    }

    p.query(
      "INSERT INTO events (user_id, event_name, page, page_name, recharge_count, variant, props) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [userId, eventName, page, pageName, rechargeCount, variant, JSON.stringify(props)]
    )
      .then(function () {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, stored: true }));
      })
      .catch(function (err) {
        console.error("[events] insert failed:", err.message);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "insert failed" }));
      });
  });
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function handleEventsExport(req, res) {
  const p = getPool();
  if (!p) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("DATABASE_URL not configured - no events to export.");
    return;
  }
  p.query(
    "SELECT id, user_id, event_name, page, page_name, recharge_count, variant, props, created_at " +
      "FROM events ORDER BY created_at ASC"
  )
    .then(function (result) {
      const columns = ["id", "user_id", "event_name", "page", "page_name", "recharge_count", "variant", "props", "created_at"];
      const lines = [columns.join(",")];
      result.rows.forEach(function (row) {
        lines.push(
          columns
            .map(function (col) {
              const val = col === "props" ? JSON.stringify(row[col]) : row[col];
              return csvEscape(val);
            })
            .join(",")
        );
      });
      res.writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=pooja-fakedoor-events.csv",
      });
      res.end(lines.join("\n"));
    })
    .catch(function (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Export failed: " + err.message);
    });
}

// ---------- Static file serving ----------

function send(res, status, filePath) {
  const ext = path.extname(filePath);
  const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
  // Static assets are cache-busted via ?v=N query strings, so they can be
  // cached aggressively. index.html itself must always revalidate so a new
  // deploy is picked up immediately.
  const cacheControl =
    filePath.endsWith("index.html")
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable";

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(500);
      res.end("Internal Server Error");
      return;
    }
    res.writeHead(status, { "Content-Type": contentType, "Cache-Control": cacheControl });
    res.end(data);
  });
}

const server = http.createServer(function (req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);

  if (req.method === "GET" && urlPath === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method === "POST" && urlPath === "/api/events") {
    handleEventPost(req, res);
    return;
  }

  if (req.method === "GET" && urlPath === "/api/events/export") {
    handleEventsExport(req, res);
    return;
  }

  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const requested = path.join(ROOT, safePath === "/" ? "index.html" : safePath);

  fs.stat(requested, function (err, stat) {
    if (!err && stat.isFile()) {
      send(res, 200, requested);
      return;
    }
    // Anything else (unknown path, direct hash-route hit) falls back to
    // index.html - the client-side router takes over from there.
    send(res, 200, path.join(ROOT, "index.html"));
  });
});

server.listen(PORT, function () {
  console.log("Serving pooja-fakedoor on port " + PORT + (DATABASE_URL ? " (events -> Postgres)" : " (events -> console only, no DATABASE_URL)"));
});
