import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
for (const file of fs.readdirSync(dir).filter((name) => name.startsWith("account-"))) {
  const entry = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const bad = entry.ads.filter((ad) =>
    ["DISAPPROVED", "WITH_ISSUES", "PENDING_REVIEW"].includes(ad.effective_status)
  );
  console.log("\n##", entry.account.name);
  for (const ad of bad) {
    console.log(ad.effective_status, ad.name, ad.id, "adset", ad.adset_id);
  }
  for (const rec of entry.recommendations || []) {
    const content = rec.recommendation_content || rec;
    console.log("REC", JSON.stringify({
      type: rec.type,
      stage: rec.recommendation_stage,
      objects: rec.object_ids,
      title: content.title || content.lift_estimate,
      body: content.body,
    }));
  }
}
