import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const summary = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/summary.json"), "utf8")
);

function round(n, d = 2) {
  if (n == null || Number.isNaN(n)) return null;
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function topActions(actions, n = 8) {
  return Object.entries(actions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([type, count]) => `${type}:${count}`);
}

function rowBrief(row) {
  return {
    campaign: row.campaignName,
    adset: row.adsetName,
    ad: row.adName,
    spend: round(row.spend),
    impr: row.impressions,
    reach: row.reach,
    freq: round(row.frequency),
    clicksAll: row.clicksAll,
    ctrAll: round(row.ctrAll),
    cpm: round(row.cpm),
    linkClicks: row.linkClicks,
    linkCtr: round(row.linkCtr),
    cpcLink: round(row.costPerLinkClick),
    result: row.resultType,
    results: row.results,
    cpr: round(row.costPerResult),
    roas: round(row.purchaseRoas),
    quality: row.quality,
    engagement: row.engagement,
    conversion: row.conversion,
    goal: row.goal,
    learning: row.learning,
    status: row.status,
    budget: row.budget,
    bid: row.bidStrategy,
    actions: topActions(row.actions),
  };
}

function trend(days) {
  if (!days?.length) return null;
  const first = days.slice(0, Math.ceil(days.length / 2));
  const last = days.slice(Math.floor(days.length / 2));
  const avg = (list, key) => {
    const vals = list.map((d) => d[key]).filter((v) => v != null && v > 0);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const spend = days.reduce((t, d) => t + d.spend, 0);
  const results = days.reduce((t, d) => t + d.results, 0);
  return {
    days: days.map((d) => ({
      date: d.date,
      spend: round(d.spend),
      results: d.results,
      type: d.resultType,
      cpr: round(d.costPerResult),
      ctr: round(d.ctrAll),
      cpm: round(d.cpm),
      impr: d.impressions,
    })),
    spend: round(spend),
    results,
    cpr: results ? round(spend / results) : null,
    earlyCpr: round(avg(first, "costPerResult")),
    lateCpr: round(avg(last, "costPerResult")),
    earlyCtr: round(avg(first, "ctrAll")),
    lateCtr: round(avg(last, "ctrAll")),
    earlyCpm: round(avg(first, "cpm")),
    lateCpm: round(avg(last, "cpm")),
  };
}

const digest = summary.map((account) => {
  const trulyActiveAdsets = account.activeAdsets.filter((item) => item.status === "ACTIVE");
  const placementRollup = {};
  for (const row of account.placements) {
    const key = `${row.platform || "unknown"} / ${row.position || "unknown"}`;
    if (!placementRollup[key]) {
      placementRollup[key] = { spend: 0, impressions: 0, linkClicks: 0, results: 0, resultTypes: {} };
    }
    const bucket = placementRollup[key];
    bucket.spend += row.spend;
    bucket.impressions += row.impressions;
    bucket.linkClicks += row.linkClicks;
    bucket.results += row.results;
    if (row.resultType) bucket.resultTypes[row.resultType] = (bucket.resultTypes[row.resultType] || 0) + row.results;
  }
  const placements = Object.entries(placementRollup)
    .map(([name, bucket]) => ({
      name,
      spend: round(bucket.spend),
      impressions: bucket.impressions,
      linkClicks: bucket.linkClicks,
      results: bucket.results,
      cpr: bucket.results ? round(bucket.spend / bucket.results) : null,
      types: bucket.resultTypes,
    }))
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 12);

  const daily = Object.entries(account.daily).map(([id, item]) => ({
    id,
    adset: item.adsetName,
    campaign: item.campaignName,
    trend: trend(item.days),
  })).sort((a, b) => b.trend.spend - a.trend.spend);

  return {
    account: account.account,
    structure: account.structure,
    totals: {
      last7: { ...account.totals.last7, spend: round(account.totals.last7.spend) },
      last30: { ...account.totals.last30, spend: round(account.totals.last30.spend) },
    },
    activeCampaigns: account.activeCampaignMeta,
    activeAdsets: trulyActiveAdsets,
    campaign7: account.campaign7.map(rowBrief),
    campaign30: account.campaign30.map(rowBrief),
    adset7: account.adset7.map(rowBrief),
    adset30: account.adset30.filter((row) => row.spend >= 100).map(rowBrief),
    ads7: account.ad7.map(rowBrief),
    placements,
    daily: daily.slice(0, 25),
    recommendations: account.recommendations,
  };
});

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/digest.json");
fs.writeFileSync(out, JSON.stringify(digest, null, 2));
console.log("bytes", fs.statSync(out).size);
for (const item of digest) {
  console.log("\n==", item.account.name, "==");
  console.log("active campaigns", item.activeCampaigns.length, "active adsets", item.activeAdsets.length);
  console.log("7d spend", item.totals.last7.spend, "30d spend", item.totals.last30.spend);
}
