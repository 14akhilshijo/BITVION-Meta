import { pulseToday } from "../../dashboard/pulse.mjs";
import { metaEnv } from "../lib/env.mjs";

const ACT = "act_975152708626051";

async function goalsFor(env) {
  const version = env.META_API_VERSION || "v21.0";
  const url = new URL(`https://graph.facebook.com/${version}/${ACT}/adsets`);
  url.searchParams.set("access_token", env.META_ACCESS_TOKEN);
  url.searchParams.set("fields", "id,optimization_goal");
  url.searchParams.set("limit", "500");
  const response = await fetch(url);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "Could not read ad sets");
  return new Map((body.data || []).map((row) => [row.id, row.optimization_goal]));
}

export default async () => {
  try {
    const env = metaEnv();
    if (!env.META_ACCESS_TOKEN) throw new Error("Missing access token");
    const data = await pulseToday(env, await goalsFor(env));
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error.message || "Pulse failed" }, { status: 502, headers: { "cache-control": "no-store" } });
  }
};
