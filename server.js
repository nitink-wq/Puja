/*
  Minimal dependency-free static file server for the pooja fake-door site.
  No framework needed — this app has no backend, just static HTML/CSS/JS/images.
  Serves index.html for any path that doesn't match a real file (SPA fallback;
  routing itself is hash-based and never hits the server).
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

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
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const requested = path.join(ROOT, safePath === "/" ? "index.html" : safePath);

  fs.stat(requested, function (err, stat) {
    if (!err && stat.isFile()) {
      send(res, 200, requested);
      return;
    }
    // Anything else (unknown path, direct hash-route hit) falls back to
    // index.html — the client-side router takes over from there.
    send(res, 200, path.join(ROOT, "index.html"));
  });
});

server.listen(PORT, function () {
  console.log("Serving pooja-fakedoor on port " + PORT);
});
