import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = {};
for (const line of fs.readFileSync(path.join(root, ".env.meta-ads"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  env[match[1]] = value;
}

const version = env.META_API_VERSION || "v21.0";
const token = env.META_ACCESS_TOKEN;
const act = "act_975152708626051";

async function graph(pathname, params = {}) {
  const url = new URL(`https://graph.facebook.com/${version}/${pathname.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const body = await response.json();
  if (body.error) throw new Error(`${pathname}: ${body.error.message}`);
  return body;
}

function summarizeTargeting(targeting) {
  if (!targeting) return null;
  const geo = targeting.geo_locations || {};
  const interests = [];
  for (const spec of targeting.flexible_spec || []) {
    for (const item of spec.interests || []) interests.push(item.name);
    for (const item of spec.behaviors || []) interests.push(item.name);
  }
  return {
    age: [targeting.age_min, targeting.age_max],
    genders: targeting.genders || [],
    countries: geo.countries || [],
    cities: (geo.cities || []).map((city) => city.name || city.key),
    regions: (geo.regions || []).map((region) => region.name || region.key),
    locationTypes: geo.location_types || [],
    advantageAudience: targeting.targeting_automation?.advantage_audience ?? targeting.advantage_audience ?? null,
    customAudiences: (targeting.custom_audiences || []).map((item) => item.name || item.id),
    excluded: (targeting.excluded_custom_audiences || []).map((item) => item.name || item.id),
    interests: interests.slice(0, 12),
    publisherPlatforms: targeting.publisher_platforms || null,
    devicePlatforms: targeting.device_platforms || null,
  };
}

const adsetsBody = await graph(`${act}/adsets`, {
  fields: [
    "id",
    "name",
    "campaign_id",
    "status",
    "effective_status",
    "daily_budget",
    "optimization_goal",
    "destination_type",
    "bid_strategy",
    "learning_stage_info",
    "pacing_type",
    "promoted_object",
    "targeting",
    "created_time",
    "updated_time",
  ].join(","),
  limit: "200",
  effective_status: JSON.stringify(["ACTIVE"]),
});

const campaignsBody = await graph(`${act}/campaigns`, {
  fields: "id,name,effective_status,objective,created_time,updated_time",
  limit: "100",
  effective_status: JSON.stringify(["ACTIVE"]),
});
const campaigns = new Map((campaignsBody.data || []).map((item) => [item.id, item]));

const adsBody = await graph(`${act}/ads`, {
  fields: "id,name,adset_id,effective_status,creative{id,name,title,body,object_type,thumbnail_url}",
  limit: "200",
  effective_status: JSON.stringify(["ACTIVE"]),
});

const active = (adsetsBody.data || []).map((adset) => {
  const campaign = campaigns.get(adset.campaign_id);
  return {
    id: adset.id,
    name: adset.name,
    campaign: campaign?.name,
    campaignId: adset.campaign_id,
    objective: campaign?.objective,
    created: adset.created_time,
    updated: adset.updated_time,
    budgetInr: adset.daily_budget ? Number(adset.daily_budget) / 100 : null,
    goal: adset.optimization_goal,
    destination: adset.destination_type,
    bid: adset.bid_strategy,
    learning: adset.learning_stage_info || null,
    pacing: adset.pacing_type,
    pageId: adset.promoted_object?.page_id || null,
    targeting: summarizeTargeting(adset.targeting),
    ads: (adsBody.data || [])
      .filter((ad) => ad.adset_id === adset.id)
      .map((ad) => ({
        id: ad.id,
        name: ad.name,
        status: ad.effective_status,
        creative: ad.creative
          ? {
              name: ad.creative.name,
              title: ad.creative.title,
              body: ad.creative.body,
              type: ad.creative.object_type,
            }
          : null,
      })),
  };
});

const out = path.join(root, "data", "kukku-active.json");
fs.writeFileSync(out, JSON.stringify(active, null, 2));
console.log(JSON.stringify(active.map((item) => ({
  name: item.name,
  campaign: item.campaign,
  budgetInr: item.budgetInr,
  goal: item.goal,
  destination: item.destination,
  pageId: item.pageId,
  created: item.created,
  learning: item.learning,
  targeting: item.targeting,
  ads: item.ads.map((ad) => ad.name),
})), null, 2));
