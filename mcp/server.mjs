import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(projectDir, ".env.meta-ads");

function loadEnv() {
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
const version = env.META_API_VERSION || "v21.0";
const token = env.META_ACCESS_TOKEN;

async function graph(pathname, params = {}) {
  const url = new URL(`https://graph.facebook.com/${version}/${pathname.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json();
  if (body.error) {
    throw new Error(body.error.message || "Graph API error");
  }
  return body;
}

const tools = [
  {
    name: "list_ad_accounts",
    description: "List Meta ad accounts available to the connected token.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_campaign_insights",
    description: "Pull campaign insights for one ad account. datePreset examples: last_7d, last_30d.",
    inputSchema: {
      type: "object",
      properties: {
        accountId: { type: "string", description: "Ad account id, with or without act_ prefix" },
        datePreset: { type: "string", description: "Meta date preset, default last_7d" },
        level: { type: "string", description: "campaign, adset, or ad. Default campaign" },
      },
      required: ["accountId"],
    },
  },
];

async function callTool(name, args) {
  if (!token) throw new Error("META_ACCESS_TOKEN is missing from .env.meta-ads");
  if (name === "list_ad_accounts") {
    const body = await graph("me/adaccounts", {
      fields: "name,account_id,account_status,currency,timezone_name,amount_spent,balance",
      limit: "50",
    });
    return body.data || [];
  }
  if (name === "get_campaign_insights") {
    const accountId = String(args.accountId || "").replace(/^act_/, "");
    const body = await graph(`act_${accountId}/insights`, {
      level: args.level || "campaign",
      date_preset: args.datePreset || "last_7d",
      fields: "campaign_name,adset_name,ad_name,spend,impressions,reach,frequency,clicks,ctr,cpm,inline_link_clicks,inline_link_click_ctr,actions,cost_per_action_type",
      limit: "100",
    });
    return body.data || [];
  }
  throw new Error(`Unknown tool: ${name}`);
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

const rl = readline.createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  if (message.method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: message.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "meta-ads", version: "1.0.0" },
      },
    });
    return;
  }
  if (message.method === "notifications/initialized") return;
  if (message.method === "tools/list") {
    send({ jsonrpc: "2.0", id: message.id, result: { tools } });
    return;
  }
  if (message.method === "tools/call") {
    try {
      const data = await callTool(message.params?.name, message.params?.arguments || {});
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] },
      });
    } catch (error) {
      send({
        jsonrpc: "2.0",
        id: message.id,
        result: { isError: true, content: [{ type: "text", text: error.message }] },
      });
    }
    return;
  }
  if (message.id != null) {
    send({
      jsonrpc: "2.0",
      id: message.id,
      error: { code: -32601, message: "Method not found" },
    });
  }
});
