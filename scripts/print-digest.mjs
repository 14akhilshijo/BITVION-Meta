import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const digest = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/digest.json"), "utf8")
);

function line(obj) {
  return JSON.stringify(obj);
}

for (const item of digest) {
  console.log("\n######## " + item.account.name + " ########");
  console.log("META", line(item.account));
  console.log("STRUCTURE", line(item.structure));
  console.log("TOTALS", line(item.totals));
  console.log("-- ACTIVE CAMPAIGNS --");
  for (const row of item.activeCampaigns) console.log(line(row));
  console.log("-- ACTIVE ADSETS --");
  for (const row of item.activeAdsets) console.log(line(row));
  console.log("-- CAMPAIGN 7D --");
  for (const row of item.campaign7) console.log(line(row));
  console.log("-- CAMPAIGN 30D --");
  for (const row of item.campaign30) console.log(line(row));
  console.log("-- ADSET 7D --");
  for (const row of item.adset7) console.log(line(row));
  console.log("-- ADSET 30D spend>=100 --");
  for (const row of item.adset30) console.log(line(row));
  console.log("-- ADS 7D --");
  for (const row of item.ads7) console.log(line(row));
  console.log("-- PLACEMENTS 14D --");
  for (const row of item.placements) console.log(line(row));
  console.log("-- DAILY TRENDS --");
  for (const row of item.daily) {
    const t = row.trend;
    console.log(line({
      adset: row.adset,
      campaign: row.campaign,
      spend: t.spend,
      results: t.results,
      cpr: t.cpr,
      earlyCpr: t.earlyCpr,
      lateCpr: t.lateCpr,
      earlyCtr: t.earlyCtr,
      lateCtr: t.lateCtr,
      earlyCpm: t.earlyCpm,
      lateCpm: t.lateCpm,
      days: t.days,
    }));
  }
  console.log("-- RECS --");
  console.log(line(item.recommendations));
}
