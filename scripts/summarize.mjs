import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "../data");

const ACTION_PRIORITY = [
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "complete_registration",
  "offsite_conversion.fb_pixel_complete_registration",
  "submit_application",
  "contact",
  "schedule",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
  "landing_page_view",
  "link_click",
  "add_to_cart",
  "initiate_checkout",
  "post_engagement",
  "page_engagement",
  "video_view",
];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function actionMap(actions) {
  const map = {};
  for (const action of actions || []) map[action.action_type] = num(action.value);
  return map;
}

function pickResult(actions, costPer, goal) {
  const counts = actionMap(actions);
  const costs = actionMap(costPer);
  const preferred = [];
  if (goal === "LEAD_GENERATION" || goal === "QUALITY_LEAD") {
    preferred.push("lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead");
  } else if (goal === "VALUE" || goal === "OFFSITE_CONVERSIONS") {
    preferred.push("purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase", "lead");
  } else if (goal === "CONVERSATIONS") {
    preferred.push(
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.messaging_first_reply"
    );
  } else if (goal === "LANDING_PAGE_VIEWS") {
    preferred.push("landing_page_view");
  } else if (goal === "LINK_CLICKS") {
    preferred.push("link_click");
  } else if (goal === "POST_ENGAGEMENT") {
    preferred.push("post_engagement");
  } else if (goal === "THRUPLAY") {
    preferred.push("video_view");
  }
  preferred.push(...ACTION_PRIORITY);
  for (const type of preferred) {
    if (counts[type] > 0) {
      return { type, count: counts[type], cost: costs[type] || null };
    }
  }
  const ranked = Object.entries(counts)
    .filter(([type]) => !type.includes("."))
    .sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return { type: null, count: 0, cost: null };
  const [type, count] = ranked[0];
  return { type, count, cost: costs[type] || null };
}

function roas(row) {
  const list = row.purchase_roas || [];
  const omni = list.find((item) => item.action_type === "omni_purchase") || list[0];
  return omni ? num(omni.value) : null;
}

function moneyOffset(account) {
  return account.currency === "JPY" ? 1 : 100;
}

function budget(entity, offset) {
  const daily = num(entity.daily_budget);
  const life = num(entity.lifetime_budget);
  return {
    daily: daily ? daily / offset : null,
    lifetime: life ? life / offset : null,
  };
}

function slimRow(row, goal) {
  const result = pickResult(row.actions, row.cost_per_action_type, goal);
  const spend = num(row.spend);
  return {
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adsetId: row.adset_id,
    adsetName: row.adset_name,
    adId: row.ad_id,
    adName: row.ad_name,
    spend,
    impressions: num(row.impressions),
    reach: num(row.reach),
    frequency: num(row.frequency),
    clicksAll: num(row.clicks),
    ctrAll: num(row.ctr),
    cpcAll: num(row.cpc),
    cpm: num(row.cpm),
    linkClicks: num(row.inline_link_clicks),
    linkCtr: num(row.inline_link_click_ctr),
    costPerLinkClick: num(row.cost_per_inline_link_click),
    resultType: result.type,
    results: result.count,
    costPerResult: result.count ? spend / result.count : null,
    reportedCostPerResult: result.cost,
    purchaseRoas: roas(row),
    quality: row.quality_ranking || null,
    engagement: row.engagement_rate_ranking || null,
    conversion: row.conversion_rate_ranking || null,
    dateStart: row.date_start,
    dateStop: row.date_stop,
    platform: row.publisher_platform || null,
    position: row.platform_position || null,
    actions: actionMap(row.actions),
  };
}

function learningLabel(info) {
  if (!info) return "Unknown";
  const status = info.status || "Unknown";
  if (status === "FAIL") return "Learning limited";
  if (status === "LEARNING") return "Learning";
  if (status === "SUCCESS") return "Active (exited learning)";
  return status;
}

const files = fs.readdirSync(dataDir).filter((name) => name.startsWith("account-") && name.endsWith(".json"));
const report = [];

for (const file of files) {
  const entry = JSON.parse(fs.readFileSync(path.join(dataDir, file), "utf8"));
  const offset = moneyOffset(entry.account);
  const campaigns = new Map(entry.campaigns.map((item) => [item.id, item]));
  const adsets = new Map(entry.adsets.map((item) => [item.id, item]));
  const ads = entry.ads;

  const activeCampaigns = entry.campaigns.filter((item) =>
    ["ACTIVE", "PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(item.effective_status) ||
    item.status === "ACTIVE"
  );

  const campaign7 = (entry.insights.campaign_last_7d || []).map((row) => slimRow(row));
  const campaign30 = (entry.insights.campaign_last_30d || []).map((row) => slimRow(row));
  const adset7 = (entry.insights.adset_last_7d || []).map((row) => {
    const meta = adsets.get(row.adset_id);
    return { ...slimRow(row, meta?.optimization_goal), goal: meta?.optimization_goal, learning: learningLabel(meta?.learning_stage_info), learningRaw: meta?.learning_stage_info || null, status: meta?.effective_status, budget: meta ? budget(meta, offset) : null, bidStrategy: meta?.bid_strategy, bidAmount: meta?.bid_amount ? num(meta.bid_amount) / offset : null };
  });
  const adset30 = (entry.insights.adset_last_30d || []).map((row) => {
    const meta = adsets.get(row.adset_id);
    return { ...slimRow(row, meta?.optimization_goal), goal: meta?.optimization_goal, learning: learningLabel(meta?.learning_stage_info), status: meta?.effective_status, budget: meta ? budget(meta, offset) : null, bidStrategy: meta?.bid_strategy };
  });
  const ad7 = (entry.insights.ad_last_7d || []).map((row) => slimRow(row)).filter((row) => row.spend > 0 || row.impressions > 0);
  const ad30 = (entry.insights.ad_last_30d || []).map((row) => slimRow(row)).filter((row) => row.spend > 0);

  const daily = {};
  for (const row of entry.insights.adset_daily_14d || []) {
    const key = row.adset_id;
    if (!daily[key]) daily[key] = { adsetName: row.adset_name, campaignName: row.campaign_name, days: [] };
    const meta = adsets.get(row.adset_id);
    const slim = slimRow(row, meta?.optimization_goal);
    daily[key].days.push({
      date: row.date_start,
      spend: slim.spend,
      results: slim.results,
      resultType: slim.resultType,
      costPerResult: slim.costPerResult,
      linkClicks: slim.linkClicks,
      ctrAll: slim.ctrAll,
      cpm: slim.cpm,
      impressions: slim.impressions,
    });
  }
  for (const item of Object.values(daily)) {
    item.days.sort((a, b) => a.date.localeCompare(b.date));
  }

  const placements = (entry.insights.placement_14d || []).map((row) => slimRow(row));

  const activeAdsets = entry.adsets
    .filter((item) => item.effective_status === "ACTIVE" || item.status === "ACTIVE")
    .map((item) => {
      const campaign = campaigns.get(item.campaign_id);
      return {
        id: item.id,
        name: item.name,
        campaignId: item.campaign_id,
        campaignName: campaign?.name,
        campaignObjective: campaign?.objective,
        campaignBudget: campaign ? budget(campaign, offset) : null,
        cbo: Boolean(campaign && (num(campaign.daily_budget) || num(campaign.lifetime_budget))),
        status: item.effective_status,
        goal: item.optimization_goal,
        billing: item.billing_event,
        bidStrategy: item.bid_strategy,
        bidAmount: item.bid_amount ? num(item.bid_amount) / offset : null,
        budget: budget(item, offset),
        learning: learningLabel(item.learning_stage_info),
        learningRaw: item.learning_stage_info || null,
        destination: item.destination_type,
        pacing: item.pacing_type,
        promoted: item.promoted_object || null,
      };
    });

  const statusCounts = {};
  for (const item of entry.campaigns) {
    statusCounts[item.effective_status] = (statusCounts[item.effective_status] || 0) + 1;
  }
  const adsetStatus = {};
  for (const item of entry.adsets) {
    adsetStatus[item.effective_status] = (adsetStatus[item.effective_status] || 0) + 1;
  }
  const adStatus = {};
  for (const item of ads) {
    adStatus[item.effective_status] = (adStatus[item.effective_status] || 0) + 1;
  }

  const sum = (rows, key) => rows.reduce((total, row) => total + num(row[key]), 0);

  report.push({
    account: {
      name: entry.account.name,
      id: entry.account.account_id,
      currency: entry.account.currency,
      timezone: entry.account.timezone_name,
      status: entry.account.account_status,
      lifetimeSpend: num(entry.account.amount_spent) / offset,
      balance: num(entry.account.balance) / offset,
    },
    structure: {
      campaigns: entry.campaigns.length,
      adsets: entry.adsets.length,
      ads: ads.length,
      campaignStatus: statusCounts,
      adsetStatus,
      adStatus,
    },
    totals: {
      last7: {
        spend: sum(campaign7, "spend"),
        impressions: sum(campaign7, "impressions"),
        reach: sum(campaign7, "reach"),
        linkClicks: sum(campaign7, "linkClicks"),
        clicksAll: sum(campaign7, "clicksAll"),
        results: sum(campaign7, "results"),
      },
      last30: {
        spend: sum(campaign30, "spend"),
        impressions: sum(campaign30, "impressions"),
        reach: sum(campaign30, "reach"),
        linkClicks: sum(campaign30, "linkClicks"),
        clicksAll: sum(campaign30, "clicksAll"),
        results: sum(campaign30, "results"),
      },
    },
    activeAdsets,
    activeCampaignMeta: activeCampaigns
      .filter((item) => item.effective_status === "ACTIVE" || item.status === "ACTIVE")
      .map((item) => ({
        id: item.id,
        name: item.name,
        objective: item.objective,
        status: item.effective_status,
        bidStrategy: item.bid_strategy,
        budget: budget(item, offset),
        cbo: Boolean(num(item.daily_budget) || num(item.lifetime_budget)),
        smart: item.smart_promotion_type,
        updated: item.updated_time,
      })),
    campaign7: campaign7.sort((a, b) => b.spend - a.spend),
    campaign30: campaign30.sort((a, b) => b.spend - a.spend),
    adset7: adset7.sort((a, b) => b.spend - a.spend),
    adset30: adset30.sort((a, b) => b.spend - a.spend),
    ad7: ad7.sort((a, b) => b.spend - a.spend).slice(0, 40),
    ad30: ad30.sort((a, b) => b.spend - a.spend).slice(0, 25),
    daily: Object.fromEntries(
      Object.entries(daily).filter(([, item]) => item.days.reduce((t, d) => t + d.spend, 0) > 0)
    ),
    placements: placements
      .filter((row) => row.spend > 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 80),
    recommendations: (entry.recommendations || []).slice(0, 30),
    errors: entry.errors,
  });
}

const out = path.join(dataDir, "summary.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.map((item) => ({
  account: item.account,
  structure: item.structure,
  totals: item.totals,
  activeCampaigns: item.activeCampaignMeta.length,
  activeAdsets: item.activeAdsets.length,
  campaign7: item.campaign7.length,
  recommendations: item.recommendations.length,
})), null, 2));
