import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const digest = JSON.parse(
  fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/digest.json"), "utf8")
);
const item = digest.find((row) => row.account.name === "Dr kukku");

function brief(row) {
  const { actions, ...rest } = row;
  const msg = (actions || []).find((a) => a.startsWith("onsite_conversion.messaging_conversation_started_7d"));
  const lead = (actions || []).find((a) => a.startsWith("lead:") || a.includes("pixel_lead") || a.startsWith("onsite_conversion.lead"));
  const purchase = (actions || []).find((a) => a.includes("purchase"));
  return { ...rest, msg, lead, purchase };
}

const lines = [];
lines.push("ACTIVE CAMPAIGNS");
for (const row of item.activeCampaigns) lines.push(JSON.stringify(row));
lines.push("ACTIVE ADSETS");
for (const row of item.activeAdsets) lines.push(JSON.stringify(row));
lines.push("CAMPAIGN 7");
for (const row of item.campaign7) lines.push(JSON.stringify(brief(row)));
lines.push("CAMPAIGN 30");
for (const row of item.campaign30) lines.push(JSON.stringify(brief(row)));
lines.push("ADSET 7");
for (const row of item.adset7) lines.push(JSON.stringify(brief(row)));
lines.push("ADS 7");
for (const row of item.ads7) lines.push(JSON.stringify(brief(row)));
lines.push("PLACEMENTS");
for (const row of item.placements) lines.push(JSON.stringify(row));
lines.push("TRENDS");
for (const row of item.daily) {
  const t = row.trend;
  lines.push(JSON.stringify({
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
    last3: t.days.slice(-3),
    first2: t.days.slice(0, 2),
  }));
}
lines.push("RECS " + JSON.stringify(item.recommendations));
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data/kukku.txt");
fs.writeFileSync(out, lines.join("\n"));
console.log("lines", lines.length, "bytes", fs.statSync(out).size);
