import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const envPath = path.join(projectDir, ".env.meta-ads");

function loadEnv(file) {
  const env = {};
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
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

function saveEnv(file, env) {
  const lines = [
    "# Meta Ads credentials",
    "# DO NOT COMMIT THIS FILE",
    `export META_APP_ID="${env.META_APP_ID || ""}"`,
    `export META_APP_SECRET="${env.META_APP_SECRET || ""}"`,
    `export META_ACCESS_TOKEN="${env.META_ACCESS_TOKEN || ""}"`,
    `export META_API_VERSION="${env.META_API_VERSION || "v21.0"}"`,
    "",
  ];
  fs.writeFileSync(file, lines.join("\n"), "utf8");
}

async function graph(version, pathname, token, params = {}) {
  const url = new URL(`https://graph.facebook.com/${version}/${pathname.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json();
  return { ok: response.ok, status: response.status, body };
}

const VERSIONS = ["v21.0", "v22.0", "v23.0", "v24.0", "v25.0"];

const env = loadEnv(envPath);
const appId = env.META_APP_ID;
const appSecret = env.META_APP_SECRET;
let token = env.META_ACCESS_TOKEN;

if (!appId || !appSecret || !token) {
  console.error("Missing META_APP_ID, META_APP_SECRET, or META_ACCESS_TOKEN");
  process.exit(1);
}

const appToken = `${appId}|${appSecret}`;
let version = env.META_API_VERSION || "v21.0";
let debug = await graph(version, "debug_token", appToken, { input_token: token });

if (debug.body?.error) {
  for (const candidate of VERSIONS) {
    if (candidate === version) continue;
    const attempt = await graph(candidate, "debug_token", appToken, { input_token: token });
    if (!attempt.body?.error) {
      version = candidate;
      debug = attempt;
      break;
    }
    debug = attempt;
  }
}

const data = debug.body?.data;
if (!data?.is_valid) {
  console.error("TOKEN_INVALID");
  console.error(JSON.stringify(debug.body?.error || debug.body, null, 2));
  process.exit(1);
}

const now = Math.floor(Date.now() / 1000);
const expiresAt = data.expires_at || 0;
const secondsLeft = expiresAt > 0 ? expiresAt - now : 0;
const alreadyLongLived = expiresAt === 0 || secondsLeft > 20 * 24 * 60 * 60;

let exchanged = false;
if (!alreadyLongLived) {
  const exchange = await graph(version, "oauth/access_token", token, {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: token,
  });
  if (exchange.body?.access_token) {
    token = exchange.body.access_token;
    exchanged = true;
    env.META_ACCESS_TOKEN = token;
    env.META_API_VERSION = version;
    saveEnv(envPath, env);
    debug = await graph(version, "debug_token", appToken, { input_token: token });
  } else {
    console.error("LONG_LIVED_EXCHANGE_FAILED");
    console.error(JSON.stringify(exchange.body?.error || exchange.body, null, 2));
  }
} else {
  env.META_API_VERSION = version;
  saveEnv(envPath, env);
}

const info = debug.body?.data || data;
const expires = info.expires_at
  ? new Date(info.expires_at * 1000).toISOString()
  : "never";

const accounts = await graph(version, "me/adaccounts", token, {
  fields: "name,account_id,account_status,currency,timezone_name,amount_spent,balance,disable_reason,business_name",
  limit: "50",
});

if (accounts.body?.error) {
  console.error("AD_ACCOUNTS_FAILED");
  console.error(JSON.stringify(accounts.body.error, null, 2));
  process.exit(1);
}

const summary = {
  apiVersion: version,
  tokenValid: true,
  exchangedForLongLived: exchanged,
  tokenType: info.type,
  scopes: info.scopes || [],
  expiresAt: expires,
  userId: info.user_id,
  adAccounts: accounts.body?.data || [],
};

const dataDir = path.join(projectDir, "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "connection.json"), JSON.stringify(summary, null, 2));

console.log(JSON.stringify(summary, null, 2));
