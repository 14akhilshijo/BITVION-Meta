const ACT = "act_975152708626051";
const MESSAGE = "onsite_conversion.messaging_conversation_started_7d";
const LEAD_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function count(actions, goal) {
  const map = {};
  for (const action of actions || []) map[action.action_type] = num(action.value);
  if (goal === "LEAD_GENERATION") {
    for (const type of LEAD_TYPES) {
      if (map[type] > 0) return { leads: map[type], kind: "Instant form lead" };
    }
    return { leads: 0, kind: "Instant form lead" };
  }
  if (goal === "CONVERSATIONS" || goal == null) {
    const chats = map[MESSAGE] || 0;
    if (chats > 0 || goal === "CONVERSATIONS") return { leads: chats, kind: "WhatsApp conversation" };
  }
  const forms = LEAD_TYPES.map((type) => map[type] || 0).find((value) => value > 0) || 0;
  if (forms > 0) return { leads: forms, kind: "Instant form lead" };
  return { leads: map[MESSAGE] || 0, kind: "WhatsApp conversation" };
}

export async function pulseToday(env, goals) {
  const version = env.META_API_VERSION || "v21.0";
  const token = env.META_ACCESS_TOKEN;
  const url = new URL(`https://graph.facebook.com/${version}/${ACT}/insights`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("level", "adset");
  url.searchParams.set("date_preset", "today");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("breakdowns", "hourly_stats_aggregated_by_advertiser_time_zone");
  url.searchParams.set(
    "fields",
    "adset_id,adset_name,campaign_name,spend,actions"
  );
  url.searchParams.set("limit", "500");

  const rows = [];
  let next = url.toString();
  while (next && rows.length < 2000) {
    const response = await fetch(next);
    const body = await response.json();
    if (body.error) throw new Error(body.error.message || "Pulse failed");
    rows.push(...(body.data || []));
    next = body.paging?.next || null;
  }

  const hours = rows.map((row) => {
    const goal = goals.get(row.adset_id);
    const result = count(row.actions, goal);
    return {
      adsetId: row.adset_id,
      name: row.adset_name,
      campaign: row.campaign_name,
      hour: row.hourly_stats_aggregated_by_advertiser_time_zone || "",
      spend: num(row.spend),
      leads: result.leads,
      kind: result.kind,
    };
  });

  const today = new Map();
  for (const row of hours) {
    const current = today.get(row.adsetId) || {
      adsetId: row.adsetId,
      name: row.name,
      campaign: row.campaign,
      kind: row.kind,
      leads: 0,
      spend: 0,
    };
    current.leads += row.leads;
    current.spend += row.spend;
    today.set(row.adsetId, current);
  }

  return {
    type: "pulse",
    generatedAt: new Date().toISOString(),
    hours: hours.filter((row) => row.leads > 0).sort((a, b) => b.hour.localeCompare(a.hour)),
    today: [...today.values()].sort((a, b) => b.leads - a.leads),
    todayLeads: [...today.values()].reduce((sum, row) => sum + row.leads, 0),
  };
}
