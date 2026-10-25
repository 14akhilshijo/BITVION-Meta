import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { buildSnapshot } from "./snapshot.mjs";
import { pulseToday } from "./pulse.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4173);

function loadEnv() {
  const env = {};
  const file = path.join(root, ".env.meta-ads");
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

const env = loadEnv();
const clients = new Set();
let cache = null;
let inflight = null;
let lastError = null;
let pulseCache = null;
let pulseInflight = null;
const seenHours = new Map();
let arrivals = [];

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) client.write(payload);
}

async function pulse() {
  if (pulseInflight || inflight || !cache?.data) return pulseCache;
  const goals = new Map((cache?.data?.strategies || []).map((strategy) => [strategy.id, strategy.goal]));
  pulseInflight = pulseToday(env, goals)
    .then((data) => {
      const primed = seenHours.size > 0;
      const fresh = [];
      for (const row of data.hours) {
        const key = `${row.adsetId}|${row.hour}`;
        const previous = seenHours.get(key) || 0;
        if (primed && row.leads > previous) {
          fresh.push({ ...row, delta: row.leads - previous, at: data.generatedAt });
        }
        seenHours.set(key, row.leads);
      }
      if (fresh.length) arrivals = [...fresh.reverse(), ...arrivals].slice(0, 40);
      data.arrivals = arrivals;
      pulseCache = data;
      broadcast("pulse", data);
      console.log(`PULSE today=${data.todayLeads} new=${fresh.reduce((sum, row) => sum + row.delta, 0)}`);
      return data;
    })
    .catch((error) => {
      console.error("PULSE_FAILED", error.message);
      return pulseCache;
    })
    .finally(() => {
      pulseInflight = null;
    });
  return pulseInflight;
}

async function refresh(target = 60) {
  if (inflight) return inflight;
  inflight = buildSnapshot(env, target)
    .then((data) => {
      cache = { at: Date.now(), target, data };
      lastError = null;
      broadcast("snapshot", data);
      console.log(
        `SNAPSHOT leads/day=${data.runRate.leadsPerDay} strategies=${data.strategies.length}`
      );
      return data;
    })
    .catch((error) => {
      lastError = error.message || "Snapshot failed";
      console.error("SNAPSHOT_FAILED", lastError);
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === "/api/live") {
    try {
      const target = Number(url.searchParams.get("target") || 60);
      const data =
        cache && cache.target === target && Date.now() - cache.at < 50000
          ? cache.data
          : await refresh(target);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: error.message || lastError }));
    }
    return;
  }
  if (url.pathname === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    clients.add(res);
    if (cache) res.write(`event: snapshot\ndata: ${JSON.stringify(cache.data)}\n\n`);
    else {
      refresh(60).catch((error) => {
        res.write(`event: snapshot\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      });
    }
    if (pulseCache) res.write(`event: pulse\ndata: ${JSON.stringify(pulseCache)}\n\n`);
    else pulse().catch(() => {});
    req.on("close", () => clients.delete(res));
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(publicDir, path.normalize(requested).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (error, body) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(body);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`LISTENING http://127.0.0.1:${port}`);
  refresh(60).then(() => pulse()).catch(() => {});
});

setInterval(() => {
  refresh(cache?.target || 60).catch(() => {});
}, 90000);

setInterval(() => {
  pulse().catch(() => {});
}, 20000);
