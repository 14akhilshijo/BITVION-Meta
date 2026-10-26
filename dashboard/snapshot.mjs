const ACT = "act_975152708626051";
const CLINIC_PAGE = "108221834095912";
const INSTITUTE_PAGE = "667897419743348";
const MESSAGE = "onsite_conversion.messaging_conversation_started_7d";
const LEAD_TYPES = ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"];

function kolkataDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T12:00:00+05:30`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function actionMap(actions) {
  const map = {};
  for (const action of actions || []) map[action.action_type] = num(action.value);
  return map;
}

function leadCount(actions, goal) {
  const map = actionMap(actions);
  if (goal === "LEAD_GENERATION") {
    for (const type of LEAD_TYPES) {
      if (map[type] > 0) return map[type];
    }
    return 0;
  }
  return map[MESSAGE] || 0;
}

function leadKind(goal) {
  return goal === "LEAD_GENERATION" ? "Instant form lead" : "WhatsApp conversation";
}

function round(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function geoInfo(targeting) {
  const cities = (targeting?.geo_locations?.cities || []).map((city) => city.name || "");
  const regions = (targeting?.geo_locations?.regions || []).map((region) => region.name || "");
  const names = new Set(cities);
  let key = "other";
  let label = cities.slice(0, 3).join(", ") || regions.join(", ") || "Not set";
  if (names.has("Perumbavoor") && names.has("Koovappady") && cities.length <= 6) {
    key = "perumbavoor";
    label = "Perumbavoor, Koovappady, Kuruppampady";
  } else if (names.has("Bangalore") || names.has("Chennai") || names.has("Pune")) {
    key = "kerala-plus-metros";
    label = "Kerala plus other metros";
  } else if (cities.length > 10) {
    key = "kerala-towns";
    label = `Kerala · ${cities.length} towns`;
  } else if (regions.includes("Kerala")) {
    key = "kerala";
    label = "Kerala";
  }
  return {
    key,
    label,
    advantage: (targeting?.targeting_automation?.advantage_audience ?? 0) === 1,
  };
}

function businessOf(adset) {
  const page = adset.promoted_object?.page_id;
  if (page === CLINIC_PAGE) return "clinic";
  if (page === INSTITUTE_PAGE) return "institute";
  const name = `${adset.name} ${adset.campaignName || ""}`.toLowerCase();
  if (name.includes("iaa") || name.includes("cca")) return "institute";
  return "clinic";
}

function rankLabel(value) {
  const labels = {
    ABOVE_AVERAGE: "Above average",
    AVERAGE: "Average",
    BELOW_AVERAGE_35: "Bottom 35%",
    BELOW_AVERAGE_20: "Bottom 20%",
    BELOW_AVERAGE_10: "Bottom 10%",
    UNKNOWN: "Not enough impressions",
  };
  return labels[value] || null;
}

function learningOf(adset, leads, ageDays) {
  const status = adset.learning_stage_info?.status;
  if (status === "LEARNING") return "Learning";
  if (status === "FAIL") return "Learning limited";
  if (status === "SUCCESS") return "Out of learning";
  if (leads >= 50) return "Past 50 events";
  if (ageDays < 8) return "Learning";
  return "Running";
}

function emptyDay(date) {
  return {
    date,
    spend: 0,
    leads: 0,
    linkClicks: 0,
    clicksAll: 0,
    impressions: 0,
    reach: 0,
  };
}

export async function buildSnapshot(env, targetLeads = 60) {
  const version = env.META_API_VERSION || "v21.0";
  const token = env.META_ACCESS_TOKEN;
  if (!token) throw new Error("Missing access token");

  const today = kolkataDate(0);
  const since = addDays(today, -4);
  const days = [0, 1, 2, 3, 4].map((index) => addDays(since, index));
  const timeRange = JSON.stringify({ since, until: today });

  async function getAll(pathname, params) {
    const rows = [];
    const url = new URL(`https://graph.facebook.com/${version}/${pathname.replace(/^\//, "")}`);
    url.searchParams.set("access_token", token);
    url.searchParams.set("limit", "200");
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") url.searchParams.set(key, String(value));
    }
    let next = url.toString();
    while (next && rows.length < 5000) {
      const response = await fetch(next);
      const body = await response.json();
      if (body.error) throw new Error(body.error.message || "Graph API error");
      rows.push(...(body.data || []));
      next = body.paging?.next || null;
    }
    return rows;
  }

  const [campaigns, adsets, ads, daily, totals, adTotals, recommendationRows] = await Promise.all([
    getAll(`${ACT}/campaigns`, {
      fields: "id,name,effective_status,objective",
      limit: "100",
    }),
    getAll(`${ACT}/adsets`, {
      fields: [
        "id",
        "name",
        "campaign_id",
        "effective_status",
        "daily_budget",
        "optimization_goal",
        "destination_type",
        "bid_strategy",
        "learning_stage_info",
        "promoted_object",
        "created_time",
        "targeting",
      ].join(","),
      limit: "200",
    }),
    getAll(`${ACT}/ads`, {
      fields: "id,name,adset_id,effective_status",
      limit: "300",
    }),
    getAll(`${ACT}/insights`, {
      level: "adset",
      time_range: timeRange,
      time_increment: "1",
      fields: "adset_id,adset_name,campaign_name,spend,impressions,reach,clicks,inline_link_clicks,ctr,cpm,actions,date_start",
      limit: "500",
    }),
    getAll(`${ACT}/insights`, {
      level: "adset",
      time_range: timeRange,
      fields: "adset_id,spend,impressions,reach,frequency,clicks,inline_link_clicks,actions",
      limit: "200",
    }),
    getAll(`${ACT}/insights`, {
      level: "ad",
      time_range: timeRange,
      fields: "ad_id,ad_name,adset_id,spend,quality_ranking,engagement_rate_ranking,conversion_rate_ranking",
      limit: "300",
    }),
    getAll(`${ACT}/recommendations`, { limit: "20" }).catch(() => []),
  ]);

  const campaignNames = new Map(campaigns.map((campaign) => [campaign.id, campaign.name]));
  const activeAds = new Map();
  for (const ad of ads) {
    if (ad.effective_status !== "ACTIVE") continue;
    activeAds.set(ad.adset_id, (activeAds.get(ad.adset_id) || 0) + 1);
  }

  const strategies = new Map();
  for (const adset of adsets) {
    const ageDays = adset.created_time
      ? (Date.now() - new Date(adset.created_time).getTime()) / 86400000
      : 99;
    const geo = geoInfo(adset.targeting);
    strategies.set(adset.id, {
      id: adset.id,
      name: adset.name,
      campaign: campaignNames.get(adset.campaign_id) || "",
      business: businessOf({ ...adset, campaignName: campaignNames.get(adset.campaign_id) }),
      status: adset.effective_status,
      goal: adset.optimization_goal,
      kind: leadKind(adset.optimization_goal),
      destination: adset.destination_type,
      budget: adset.daily_budget ? num(adset.daily_budget) / 100 : 0,
      bid: adset.bid_strategy,
      created: adset.created_time,
      ageDays: round(ageDays, 1),
      learning: learningOf(adset, 0, ageDays),
      geoKey: geo.key,
      geo: geo.label,
      advantage: geo.advantage,
      activeAds: activeAds.get(adset.id) || 0,
      days: Object.fromEntries(days.map((date) => [date, emptyDay(date)])),
      spend: 0,
      leads: 0,
      linkClicks: 0,
      clicksAll: 0,
      impressions: 0,
      reach: 0,
      frequency: null,
      quality: null,
      engagement: null,
      conversion: null,
    });
  }

  for (const row of daily) {
    const strategy = strategies.get(row.adset_id);
    if (!strategy || !strategy.days[row.date_start]) continue;
    const day = strategy.days[row.date_start];
    day.spend = round(num(row.spend), 2);
    day.leads = leadCount(row.actions, strategy.goal);
    day.linkClicks = num(row.inline_link_clicks);
    day.clicksAll = num(row.clicks);
    day.impressions = num(row.impressions);
    day.reach = num(row.reach);
  }

  const totalById = new Map(totals.map((row) => [row.adset_id, row]));
  for (const strategy of strategies.values()) {
    const total = totalById.get(strategy.id);
    strategy.spend = round(Object.values(strategy.days).reduce((sum, day) => sum + day.spend, 0), 2);
    strategy.leads = Object.values(strategy.days).reduce((sum, day) => sum + day.leads, 0);
    strategy.linkClicks = Object.values(strategy.days).reduce((sum, day) => sum + day.linkClicks, 0);
    strategy.clicksAll = Object.values(strategy.days).reduce((sum, day) => sum + day.clicksAll, 0);
    strategy.impressions = Object.values(strategy.days).reduce((sum, day) => sum + day.impressions, 0);
    strategy.reach = total ? num(total.reach) : 0;
    strategy.frequency = total ? round(num(total.frequency), 2) : null;
    strategy.cpr = strategy.leads > 0 ? round(strategy.spend / strategy.leads, 2) : null;
    strategy.ctr = strategy.impressions > 0 ? round((strategy.clicksAll / strategy.impressions) * 100, 2) : 0;
    strategy.cpm = strategy.impressions > 0 ? round((strategy.spend / strategy.impressions) * 1000, 2) : 0;
    strategy.learning = learningOf(
      adsets.find((adset) => adset.id === strategy.id) || {},
      strategy.leads,
      strategy.ageDays
    );
    strategy.fullDayLeads = days
      .filter((date) => date < today)
      .reduce((sum, date) => sum + strategy.days[date].leads, 0);
    strategy.todayLeads = strategy.days[today]?.leads || 0;
  }

  const rankedAds = [...adTotals].sort((a, b) => num(b.spend) - num(a.spend));
  for (const ad of rankedAds) {
    const strategy = strategies.get(ad.adset_id);
    if (!strategy || strategy.quality) continue;
    strategy.quality = rankLabel(ad.quality_ranking);
    strategy.engagement = rankLabel(ad.engagement_rate_ranking);
    strategy.conversion = rankLabel(ad.conversion_rate_ranking);
    strategy.topAd = ad.ad_name;
  }

  const visible = [...strategies.values()].filter(
    (strategy) => strategy.status === "ACTIVE" || strategy.spend > 0 || strategy.leads > 0
  );

  const official = [];
  for (const row of recommendationRows) {
    for (const rec of row.recommendations || []) {
      const names = (rec.object_ids || [])
        .map((id) => strategies.get(id)?.name || campaigns.find((campaign) => campaign.id === id)?.name || id);
      official.push({
        names,
        lift: rec.recommendation_content?.lift_estimate || "",
        body: rec.recommendation_content?.body || "",
        type: rec.type,
      });
    }
  }

  const running = visible.filter((strategy) => strategy.status === "ACTIVE");
  const plan = buildPlan(running, days, today, targetLeads);

  const byDay = days.map((date) => {
    const clinicLeads = running
      .filter((strategy) => strategy.business === "clinic")
      .reduce((sum, strategy) => sum + strategy.days[date].leads, 0);
    const instituteLeads = running
      .filter((strategy) => strategy.business === "institute")
      .reduce((sum, strategy) => sum + strategy.days[date].leads, 0);
    const spend = running.reduce((sum, strategy) => sum + strategy.days[date].spend, 0);
    return {
      date,
      partial: date === today,
      clinicLeads,
      instituteLeads,
      leads: clinicLeads + instituteLeads,
      spend: round(spend, 2),
    };
  });

  const lateDay = kolkataHour() >= 18;
  const countedDays = byDay.filter((day) => lateDay || !day.partial);
  const fullLeads = countedDays.reduce((sum, day) => sum + day.leads, 0);
  const fullSpend = countedDays.reduce((sum, day) => sum + day.spend, 0);

  return {
    generatedAt: new Date().toISOString(),
    account: { name: "Dr kukku", id: "975152708626051", currency: "INR" },
    window: { since, until: today, days, today },
    target: targetLeads,
    byDay,
    runRate: {
      leadsPerDay: countedDays.length ? round(fullLeads / countedDays.length, 1) : 0,
      spendPerDay: countedDays.length ? round(fullSpend / countedDays.length, 0) : 0,
      countedLabel: lateDay ? "Average of these 5 days" : "Average of the last 4 full days",
      costPerLead: fullLeads > 0 ? round(fullSpend / fullLeads, 2) : null,
      todayLeads: byDay.find((day) => day.partial)?.leads || 0,
      fullLeads,
      fullSpend: round(fullSpend, 2),
    },
    strategies: visible
      .map((strategy) => ({
        ...strategy,
        days: days.map((date) => strategy.days[date]),
      }))
      .sort((a, b) => b.leads - a.leads || b.spend - a.spend),
    official,
    plan,
  };
}

function kolkataHour() {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());
  return Number(hour);
}

function weightedCpr(list) {
  const leads = list.reduce((sum, strategy) => sum + strategy.leads, 0);
  const spend = list.reduce((sum, strategy) => sum + strategy.spend, 0);
  if (!leads) return null;
  return { leads, spend, cpr: spend / leads, perDay: leads / 5, today: list.reduce((sum, strategy) => sum + strategy.todayLeads, 0) };
}

function healthy(strategy) {
  const weak = ["Bottom 10%", "Bottom 20%"];
  if (weak.includes(strategy.engagement) || weak.includes(strategy.conversion)) return false;
  return true;
}

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `₹${Math.round(value)}`;
}

function lineFor(strategy, action, bar) {
  const cost = strategy.cpr == null ? "no leads" : money(strategy.cpr);
  const barText = bar == null ? "the cheap price" : money(bar);
  if (action === "Scale") return `Cheapest · ${cost} · next ${money(strategy.budget * 1.2)} · stop if cost rises above ${bar == null ? barText : money(bar * 1.25)}`;
  if (action === "Keep") return `Leave on · ${cost} · no extra budget`;
  if (action === "Learn") return `Only new test · end it if cost stays above ${barText}`;
  if (action === "Hold") return `No budget · ${cost} · above the cheap leads`;
  if (action === "Fix creative") return `New video first · ${cost} · do not add budget`;
  if (action === "Rebuild") return `Was cheap · ${cost} · bring back one ad only if it stays under ${barText}`;
  if (action === "Turn off") return "Turn off · no live ad";
  return "Watch the cost · do not edit yet";
}

function buildPlan(running, days, today, target) {
  const active = running.filter((strategy) => strategy.status === "ACTIVE");
  const proven = active.filter((strategy) => strategy.fullDayLeads >= 5 && strategy.cpr != null);
  const cheapBar = proven.length ? Math.min(...proven.map((strategy) => strategy.cpr)) : null;
  const nearCheap = (strategy) => cheapBar != null && strategy.cpr != null && strategy.cpr <= cheapBar * 1.25;
  const decisions = new Map(active.map((strategy) => [strategy.id, { action: "Watch", reason: "Running. Judge the next move on cost, not on a lead target." }]));
  void today;
  void target;

  const clinicTown = active.filter(
    (strategy) =>
      strategy.business === "clinic" &&
      strategy.geoKey === "perumbavoor" &&
      strategy.destination === "WHATSAPP" &&
      strategy.activeAds > 0
  );
  const provenClinic = clinicTown
    .filter((strategy) => strategy.fullDayLeads >= 5 && healthy(strategy))
    .sort((a, b) => (a.cpr || 9999) - (b.cpr || 9999) || b.fullDayLeads - a.fullDayLeads);
  const freshClinic = clinicTown
    .filter((strategy) => strategy.fullDayLeads === 0 && strategy.ageDays < 3)
    .sort((a, b) => new Date(a.created) - new Date(b.created));
  const chosenClinic = [];
  if (provenClinic[0]) chosenClinic.push(provenClinic[0]);
  if (provenClinic[1] && provenClinic[1].cpr <= provenClinic[0].cpr * 1.8) chosenClinic.push(provenClinic[1]);
  if (chosenClinic.length < 2) {
    const test =
      freshClinic.find((strategy) => /micro|brow/i.test(strategy.name)) || freshClinic[0];
    if (test && !chosenClinic.some((strategy) => strategy.id === test.id)) chosenClinic.push(test);
  }
  const chosenClinicIds = new Set(chosenClinic.map((strategy) => strategy.id));
  for (const strategy of clinicTown) {
    if (chosenClinicIds.has(strategy.id)) {
      const isTest = strategy.fullDayLeads === 0;
      const canRaise = !isTest && chosenClinic[0]?.id === strategy.id && nearCheap(strategy) && (strategy.frequency == null || strategy.frequency < 2.2);
      decisions.set(strategy.id, {
        action: isTest ? "Learn" : canRaise ? "Scale" : "Keep",
        reason: isTest
          ? "The one new clinic test. Keep it only if its cost stays with the cheapest leads."
          : canRaise
            ? "Cheapest clinic leads. This is the only clinic budget to test upward."
            : "Leave it on. Extra budget here would not be the cheapest lead.",
      });
    } else {
      const keeperName = chosenClinic[0]?.name || "the keeper";
      decisions.set(strategy.id, {
        action: "Hold",
        reason: `Same Perumbavoor audience as ${keeperName}. Advantage+ audience is on, so these ad sets enter the same auctions. Holding this one keeps the cost of the next lead down.`,
      });
    }
  }

  const instituteChats = active.filter(
    (strategy) =>
      strategy.business === "institute" &&
      strategy.destination === "WHATSAPP" &&
      strategy.activeAds > 0 &&
      strategy.geoKey !== "kerala-plus-metros"
  );
  const provenChats = instituteChats
    .filter((strategy) => strategy.fullDayLeads >= 5 && healthy(strategy) && (strategy.cpr || 999) <= 90)
    .sort((a, b) => (a.cpr || 9999) - (b.cpr || 9999));
  const freshChats = instituteChats
    .filter((strategy) => strategy.ageDays < 3)
    .sort((a, b) => b.budget - a.budget);
  const chosenChat = provenChats[0] || freshChats[0] || null;
  for (const strategy of instituteChats) {
    if (chosenChat && strategy.id === chosenChat.id) {
      const isTest = strategy.fullDayLeads === 0;
      const canRaise = !isTest && nearCheap(strategy) && (strategy.frequency == null || strategy.frequency < 2.2);
      decisions.set(strategy.id, {
        action: isTest ? "Learn" : canRaise ? "Scale" : "Keep",
        reason: isTest
          ? "The one institute WhatsApp test. End it if the cost stays above the cheapest leads."
          : canRaise
            ? "Cheapest institute WhatsApp. A 20% test is allowed only while the cost holds."
            : "Leave it on. Its cost is not low enough for more budget.",
      });
    } else {
      decisions.set(strategy.id, {
        action: "Hold",
        reason: `Same Kerala WhatsApp audience as ${chosenChat?.name || "the institute test"}. Two of these split learning and raise the cost per lead.`,
      });
    }
  }

  const leadSets = active.filter(
    (strategy) => strategy.business === "institute" && strategy.goal === "LEAD_GENERATION" && strategy.activeAds > 0
  );
  const rankedLeads = [...leadSets].sort((a, b) => b.fullDayLeads - a.fullDayLeads || (a.cpr || 9999) - (b.cpr || 9999));
  rankedLeads.forEach((strategy, index) => {
    const canRaise = index === 0 && nearCheap(strategy) && (strategy.frequency == null || strategy.frequency < 2.2);
    if (index === 0) {
      decisions.set(strategy.id, {
        action: canRaise ? "Scale" : "Keep",
        reason: canRaise
          ? "Cheapest form leads. Connect the CRM first, then test 20% more budget only if the cost holds."
          : "Best form, but not the cheapest lead. Leave the budget.",
      });
    } else {
      decisions.set(strategy.id, {
        action: "Hold",
        reason: `Duplicate lead ad set beside ${rankedLeads[0].name}.`,
      });
    }
  });

  for (const strategy of active) {
    if (strategy.geoKey === "kerala-plus-metros" && strategy.activeAds > 0) {
      decisions.set(strategy.id, {
        action: "Hold",
        reason: "This geo includes cities outside Kerala and sits on top of the Kerala institute campaigns.",
      });
    }
    const weakEngagement = strategy.engagement === "Bottom 10%" || strategy.engagement === "Bottom 20%";
    const current = decisions.get(strategy.id);
    if (weakEngagement && strategy.leads >= 5 && current?.action === "Keep") {
      decisions.set(strategy.id, {
        action: "Fix creative",
        reason: "Engagement ranking is weak, so the auction is charging more for the next lead. Replace the opening of the video before adding budget.",
      });
    }
    if (strategy.activeAds === 0) {
      if (strategy.leads >= 8 && strategy.cpr != null && strategy.cpr <= 50) {
        decisions.set(strategy.id, {
          action: "Rebuild",
          reason: `The ads are off, so it has stopped. It was a cheap source at ₹${Math.round(strategy.cpr)} per lead. Turn the ad set off for now, and bring one ad back only in Kerala after the duplicate WhatsApp campaigns are held.`,
        });
      } else {
        decisions.set(strategy.id, {
          action: "Turn off",
          reason: "This ad set is switched on and has no live ad, so it cannot produce leads. Turn the ad set off so it does not re-enter the auction later.",
        });
      }
    }
  }

  for (const business of ["clinic", "institute"]) {
    const scales = active
      .filter((strategy) => strategy.business === business && decisions.get(strategy.id)?.action === "Scale")
      .sort((a, b) => a.cpr - b.cpr || b.leads - a.leads);
    for (const extra of scales.slice(1)) {
      decisions.set(extra.id, {
        action: "Keep",
        reason: "Already cheap. Only the lowest cost on this side gets a budget test.",
      });
    }
  }

  const winner = cheapBar == null
    ? null
    : active
      .filter((strategy) => strategy.activeAds > 0 && strategy.fullDayLeads >= 8 && nearCheap(strategy) && (strategy.frequency == null || strategy.frequency < 2.2))
      .sort((a, b) => a.cpr - b.cpr || b.leads - a.leads)[0] || null;
  for (const strategy of active) {
    if (strategy.activeAds === 0) continue;
    if (winner && strategy.id === winner.id) {
      decisions.set(strategy.id, {
        action: "Scale",
        reason: "Lowest cost with enough leads. This is the only budget to test.",
      });
      continue;
    }
    if (nearCheap(strategy) && strategy.fullDayLeads >= 5) {
      decisions.set(strategy.id, {
        action: "Keep",
        reason: "Inside the cheap range. Leave the budget so it does not bid against the cheapest one.",
      });
      continue;
    }
    const current = decisions.get(strategy.id);
    if (current?.action === "Learn" && !winner) continue;
    decisions.set(strategy.id, {
      action: "Hold",
      reason: "Above the cheap lead price. More budget here buys fewer leads for the money.",
    });
  }

  for (const strategy of active) {
    const decision = decisions.get(strategy.id);
    if (decision?.action === "Scale" && strategy.frequency >= 2.2) {
      decisions.set(strategy.id, {
        action: "Keep",
        reason: "The cost is cheap and people are already seeing it often. More budget would make the next lead cost more.",
      });
    }
  }

  for (const strategy of active) {
    const decision = decisions.get(strategy.id);
    decision.line = lineFor(strategy, decision.action, cheapBar);
  }

  const keepers = active.filter((strategy) => {
    const action = decisions.get(strategy.id)?.action;
    return action === "Keep" || action === "Scale" || action === "Learn" || action === "Fix creative";
  });
  const clinicKeepers = keepers.filter((strategy) => strategy.business === "clinic");
  const instituteKeepers = keepers.filter((strategy) => strategy.business === "institute");
  const clinicStats = weightedCpr(clinicKeepers);
  const instituteStats = weightedCpr(instituteKeepers);
  const clinicPerDay = clinicStats ? clinicStats.perDay : 0;
  const institutePerDay = instituteStats ? instituteStats.perDay : 0;
  const clinicFreq = Math.max(0, ...clinicKeepers.map((strategy) => strategy.frequency || 0));
  const clinicCpr = clinicStats?.cpr || null;
  const instituteCpr = instituteStats?.cpr || null;
  const clinicBudgetNow = clinicKeepers.reduce((sum, strategy) => sum + strategy.budget, 0);
  const instituteBudgetNow = instituteKeepers.reduce((sum, strategy) => sum + strategy.budget, 0);
  const clinicNote = "More clinic budget waits until this side is the cheapest lead.";

  const scales = active.filter((strategy) => decisions.get(strategy.id)?.action === "Scale");
  const keeps = active.filter((strategy) => decisions.get(strategy.id)?.action === "Keep");
  const learns = active.filter((strategy) => decisions.get(strategy.id)?.action === "Learn");
  const wasteSpend = active
    .filter((strategy) => strategy.spend > 0 && !nearCheap(strategy) && decisions.get(strategy.id)?.action !== "Learn")
    .reduce((sum, strategy) => sum + strategy.spend, 0);
  const cheapPerDay = round(active.filter(nearCheap).reduce((sum, strategy) => sum + strategy.leads, 0) / 5, 1);
  const raiseLine = scales.length
    ? `${scales.map((strategy) => `${strategy.name} · ${money(strategy.cpr)} · next ${money(strategy.budget * 1.2)}`).join(" · ")}. Stop if the cost goes above ${money(cheapBar * 1.25)}.`
    : `Do not raise a budget until a campaign holds at or under ${money(cheapBar)}.`;
  const keepLine = keeps.length
    ? `${keeps.map((strategy) => strategy.name).join(" · ")}. Leave those budgets.`
    : "No second cheap campaign.";
  const test = learns[0];
  const testLine = test
    ? `${test.name} is the only new test. End it if the cost stays above ${money(cheapBar == null ? null : cheapBar * 1.25)}.`
    : cheapBar
      ? `One new ad set only: copy ${scales[0]?.name || "the cheapest winner"} into a new 9:16 video, or one new town, at ₹150. Keep it only if the cost stays under ${money(cheapBar * 1.25)}.`
      : "Wait for 5 leads on one campaign before opening a new one.";
  const premiumLeads = 40;
  const premiumBudget = 1700;
  const unitCap = premiumBudget / premiumLeads;
  const weakRank = (strategy) =>
    ["Bottom 10%", "Bottom 20%"].includes(strategy.engagement) ||
    ["Bottom 10%", "Bottom 20%"].includes(strategy.conversion);
  const premiumFit = (strategy) =>
    strategy.activeAds > 0 &&
    strategy.cpr != null &&
    strategy.cpr <= unitCap &&
    strategy.fullDayLeads >= 5 &&
    !weakRank(strategy) &&
    (strategy.frequency == null || strategy.frequency < 2.2);
  const premiumSets = active.filter(premiumFit).sort((a, b) => a.cpr - b.cpr || b.leads - a.leads);
  const hero = premiumSets[0] || null;
  const stopAt = Math.min(unitCap, cheapBar == null ? unitCap : cheapBar * 1.25);
  const premiumPerDay = round(premiumSets.reduce((sum, strategy) => sum + strategy.leads, 0) / 5, 1);
  const edits = [];
  if (hero) {
    edits.push({
      kind: "current",
      tone: "ok",
      title: "One budget test on the cheapest premium campaign",
      line: `${hero.name} · ${money(hero.cpr)} · ${money(hero.budget)} → ${money(hero.budget * 1.2)}`,
      note: `Stop if the cost goes above ${money(stopAt)}. Leave targeting and placements unchanged.`,
    });
  } else {
    edits.push({
      kind: "current",
      tone: "wait",
      title: "No budget change until a campaign holds under ₹42.50",
      line: "No live campaign is both under that price and proven.",
      note: "Wait for 5 leads under ₹42.50 before the first budget edit.",
    });
  }
  if (premiumSets.length > 1) {
    edits.push({
      kind: "current",
      tone: "ok",
      title: "Leave the other premium campaigns unchanged",
      line: premiumSets.slice(1).map((strategy) => `${strategy.name} · ${money(strategy.cpr)}`).join(" · "),
      note: "They already fit ₹1,700. A second raise makes them bid against the cheapest one.",
    });
  }
  const aboveCap = active.filter((strategy) => strategy.activeAds > 0 && strategy.cpr != null && strategy.cpr > unitCap);
  if (aboveCap.length) {
    edits.push({
      kind: "current",
      tone: "bad",
      title: "No extra budget above ₹42.50",
      line: aboveCap.slice(0, 6).map((strategy) => `${strategy.name} · ${money(strategy.cpr)}`).join(" · "),
      note: "Leave them on. A higher average cost is not a reason to turn them off. New money stays inside ₹1,700.",
    });
  }
  const weakFit = active.filter(
    (strategy) => strategy.activeAds > 0 && strategy.cpr != null && strategy.cpr <= unitCap && weakRank(strategy) && strategy.leads >= 5
  );
  if (weakFit.length) {
    edits.push({
      kind: "current",
      tone: "wait",
      title: "New opening before more budget",
      line: weakFit.map((strategy) => strategy.name).join(" · "),
      note: "The price fits, and the quality ranking is in the bottom group. Test one 9:16 video with audio in the same ad set. Keep automatic placements.",
    });
  }
  const emptySets = active.filter((strategy) => strategy.activeAds === 0);
  if (emptySets.length) {
    edits.push({
      kind: "current",
      tone: "bad",
      title: "Turn off ad sets with no live ad",
      line: emptySets.map((strategy) => strategy.name).join(" · "),
      note: "There is no ad to deliver, so this does not stop current leads.",
    });
  }
  const formFit = premiumSets.find((strategy) => strategy.goal === "LEAD_GENERATION");
  if (formFit) {
    edits.push({
      kind: "current",
      tone: "ok",
      title: "Send form quality back before the budget step",
      line: formFit.name,
      note: "Connect the CRM through the Conversions API so the form can optimise for a premium lead, not only a submitted form.",
    });
  }
  edits.push({
    kind: "new",
    tone: "wait",
    title: hero ? "One new campaign from the winner" : "Wait to open a new campaign",
    line: hero
      ? `Copy ${hero.name}. One 9:16 video with audio, or one town: Angamaly, Muvattupuzha, or Kochi. Budget ₹150.`
      : "Open nothing until one campaign has 5 leads under ₹42.50.",
    note: `Keep automatic placements. Keep the new ad set only while the cost stays under ${money(stopAt)}. One test at a time.`,
  });
  const premium = {
    leads: premiumLeads,
    budget: premiumBudget,
    unit: round(unitCap, 2),
    nowPerDay: premiumPerDay,
    gap: round(Math.max(0, premiumLeads - premiumPerDay), 1),
    edits,
  };

  const form = active.find((strategy) => strategy.goal === "LEAD_GENERATION" && nearCheap(strategy));
  const moves = [
    { tone: "ok", title: "Raise only the cheapest", line: raiseLine },
    { tone: "ok", title: "Leave the other cheap ads", line: keepLine },
    { tone: "bad", title: "Stop feeding expensive ads", line: `${money(wasteSpend)} in 5 days went above ${money(cheapBar * 1.25)}. No extra budget there.` },
    { tone: "wait", title: "One new strategy", line: testLine },
  ];
  if (form) {
    moves.push({
      tone: "ok",
      title: "Cut the form cost first",
      line: `Connect the CRM on ${form.name} before the budget step.`,
    });
  }

  return {
    target,
    aim: "40 premium leads inside ₹1700 a day",
    premium,
    cheapBar: cheapBar == null ? null : round(cheapBar, 0),
    cheapPerDay,
    waste: round(wasteSpend, 0),
    moves,
    decisions: Object.fromEntries([...decisions.entries()]),
    clinic: {
      perDay: round(clinicPerDay, 1),
      ceiling: round(clinicPerDay, 1),
      cpr: round(clinicCpr, 2),
      budgetNow: round(clinicBudgetNow, 0),
      budgetTarget: round(clinicBudgetNow, 0),
      note: clinicNote,
      frequency: round(clinicFreq, 2),
      steps: [],
      names: clinicKeepers.map((strategy) => strategy.name),
    },
    institute: {
      perDay: round(institutePerDay, 1),
      need: round(institutePerDay, 1),
      cpr: round(instituteCpr, 2),
      budgetNow: round(instituteBudgetNow, 0),
      budgetTarget: round(instituteBudgetNow, 0),
      steps: [],
      names: instituteKeepers.map((strategy) => strategy.name),
    },
    combinedNow: round(clinicPerDay + institutePerDay, 1),
  };
}
