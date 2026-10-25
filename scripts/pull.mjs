import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const envPath = path.join(projectDir, ".env.meta-ads");
const dataDir = path.join(projectDir, "data");

function loadEnv(file) {
  const env = {};
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

const env = loadEnv(envPath);
const version = env.META_API_VERSION || "v21.0";
const token = env.META_ACCESS_TOKEN;

async function graphGet(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (body.error) {
    const error = new Error(body.error.message || "Graph API error");
    error.details = body.error;
    throw error;
  }
  return body;
}

function firstUrl(pathname, params) {
  const url = new URL(`https://graph.facebook.com/${version}/${pathname.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "100");
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function getAll(pathname, params, cap = 1500) {
  const rows = [];
  let url = firstUrl(pathname, params);
  while (url && rows.length < cap) {
    const body = await graphGet(url);
    rows.push(...(body.data || []));
    url = body.paging?.next || null;
  }
  return rows;
}

async function tryGetAll(pathname, params, cap) {
  try {
    return { ok: true, data: await getAll(pathname, params, cap) };
  } catch (error) {
    return {
      ok: false,
      error: error.details || { message: error.message },
      data: [],
    };
  }
}

const INSIGHT_FIELDS = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "spend",
  "impressions",
  "reach",
  "frequency",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "inline_link_clicks",
  "inline_link_click_ctr",
  "cost_per_inline_link_click",
  "actions",
  "action_values",
  "cost_per_action_type",
  "purchase_roas",
  "video_thruplay_watched_actions",
  "date_start",
  "date_stop",
].join(",");

const AD_INSIGHT_FIELDS = `${INSIGHT_FIELDS},quality_ranking,engagement_rate_ranking,conversion_rate_ranking`;

const connection = JSON.parse(fs.readFileSync(path.join(dataDir, "connection.json"), "utf8"));
const accounts = connection.adAccounts || [];
const snapshot = { pulledAt: new Date().toISOString(), apiVersion: version, accounts: [] };

for (const account of accounts) {
  const act = account.id;
  console.error(`Pulling ${account.name} (${act})`);
  const entry = { account, campaigns: [], adsets: [], ads: [], insights: {}, errors: [] };

  const campaigns = await tryGetAll(`${act}/campaigns`, {
    fields: [
      "id",
      "name",
      "status",
      "effective_status",
      "objective",
      "daily_budget",
      "lifetime_budget",
      "bid_strategy",
      "buying_type",
      "smart_promotion_type",
      "created_time",
      "updated_time",
      "start_time",
      "stop_time",
      "budget_remaining",
    ].join(","),
    limit: "200",
  });
  entry.campaigns = campaigns.data;
  if (!campaigns.ok) entry.errors.push({ step: "campaigns", error: campaigns.error });

  const adsets = await tryGetAll(`${act}/adsets`, {
    fields: [
      "id",
      "name",
      "campaign_id",
      "status",
      "effective_status",
      "daily_budget",
      "lifetime_budget",
      "bid_strategy",
      "bid_amount",
      "optimization_goal",
      "billing_event",
      "learning_stage_info",
      "destination_type",
      "start_time",
      "end_time",
      "pacing_type",
      "promoted_object",
      "daily_spend_cap",
    ].join(","),
    limit: "200",
  });
  entry.adsets = adsets.data;
  if (!adsets.ok) entry.errors.push({ step: "adsets", error: adsets.error });

  const ads = await tryGetAll(`${act}/ads`, {
    fields: "id,name,adset_id,campaign_id,status,effective_status,created_time,updated_time",
    limit: "300",
  });
  entry.ads = ads.data;
  if (!ads.ok) entry.errors.push({ step: "ads", error: ads.error });

  for (const preset of ["last_7d", "last_30d"]) {
    for (const level of ["campaign", "adset", "ad"]) {
      const fields = level === "ad" ? AD_INSIGHT_FIELDS : INSIGHT_FIELDS;
      const result = await tryGetAll(`${act}/insights`, {
        level,
        date_preset: preset,
        fields,
        limit: "500",
      }, 2000);
      entry.insights[`${level}_${preset}`] = result.data;
      if (!result.ok) entry.errors.push({ step: `${level}_${preset}`, error: result.error });
    }
  }

  const daily = await tryGetAll(`${act}/insights`, {
    level: "adset",
    date_preset: "last_14d",
    time_increment: "1",
    fields: "adset_id,adset_name,campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,ctr,cpm,cpc,actions,cost_per_action_type,date_start",
    limit: "500",
  }, 4000);
  entry.insights.adset_daily_14d = daily.data;
  if (!daily.ok) entry.errors.push({ step: "adset_daily_14d", error: daily.error });

  const placements = await tryGetAll(`${act}/insights`, {
    level: "campaign",
    date_preset: "last_14d",
    breakdowns: "publisher_platform,platform_position",
    fields: "campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,actions,cost_per_action_type",
    limit: "500",
  }, 2000);
  entry.insights.placement_14d = placements.data;
  if (!placements.ok) entry.errors.push({ step: "placement_14d", error: placements.error });

  const recommendations = await tryGetAll(`${act}/recommendations`, { limit: "50" }, 200);
  entry.recommendations = recommendations.data;
  if (!recommendations.ok) entry.errors.push({ step: "recommendations", error: recommendations.error });

  snapshot.accounts.push(entry);
  const file = path.join(dataDir, `account-${account.account_id}.json`);
  fs.writeFileSync(file, JSON.stringify(entry, null, 2));
  console.error(
    `  campaigns=${entry.campaigns.length} adsets=${entry.adsets.length} ads=${entry.ads.length} errors=${entry.errors.length}`
  );
}

fs.writeFileSync(path.join(dataDir, "snapshot-index.json"), JSON.stringify({
  pulledAt: snapshot.pulledAt,
  accounts: snapshot.accounts.map((entry) => ({
    id: entry.account.id,
    name: entry.account.name,
    campaigns: entry.campaigns.length,
    adsets: entry.adsets.length,
    ads: entry.ads.length,
    errors: entry.errors,
    insightCounts: Object.fromEntries(
      Object.entries(entry.insights).map(([key, rows]) => [key, rows.length])
    ),
    recommendations: (entry.recommendations || []).length,
  })),
}, null, 2));

console.log("PULL_DONE");
