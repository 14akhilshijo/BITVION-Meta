const app = document.querySelector("#app");
const live = document.querySelector("#live");
const synced = document.querySelector("#synced");

const inr = (value, digits = 0) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
};

const dayLabel = (iso) => {
  const date = new Date(`${iso}T12:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(date);
};

const clock = (iso) =>
  new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));

const howFor = (action, strategy) => {
  if (action === "Keep") {
    return [
      "Leave the ad set, the budget, and the creative as they are for the next 3 days.",
      "Do not edit targeting. A significant edit restarts learning.",
      `Raise the daily budget by about 20% only after 3 stable days. ${inr(strategy.budget)} becomes about ${inr(strategy.budget * 1.2)}.`,
    ];
  }
  if (action === "Scale") {
    return [
      "This is where new institute budget goes.",
      "Connect the CRM through Meta Conversions API so the form can optimise for quality leads. Meta estimates about 24% lower cost per quality lead.",
      `Every 3 days, raise the budget about 20%. Jumping from ${inr(strategy.budget)} straight to the full target resets learning and usually makes the lead more expensive.`,
    ];
  }
  if (action === "Learn") {
    return [
      "Do not judge this ad set yet. It needs about 50 results.",
      "Do not add another ad set on the same audience while it learns.",
      "Read cost per lead only after those 50 results. Before that, the cost is noise.",
    ];
  }
  if (action === "Hold") {
    return [
      "Pause this ad set in Ads Manager. Do not delete it.",
      "Leave its creative saved so it can return as the next single test, after the keeper has held its cost for 7 days.",
      "Do not move its budget onto a second ad set in the same towns. Move budget only onto the keeper, in 20% steps.",
    ];
  }
  if (action === "Fix creative") {
    return [
      "Keep the ad set on, and replace the opening of the video.",
      "Use a 9:16 vertical video with audio. That is Meta’s own recommendation where a Reels format note is attached.",
      "Do not increase the budget until the new creative has about 50 results.",
    ];
  }
  if (action === "Turn off") {
    return [
      "Open the ad set and turn it off.",
      "There is no live ad inside it, so the switch does not stop current leads.",
    ];
  }
  if (action === "Rebuild") {
    return [
      "Turn the ad set off tonight so an empty ad set does not sit in the auction.",
      "When CCA is the only other institute WhatsApp campaign, duplicate this ad set and keep the location to Kerala only. Drop Bengaluru, Chennai, Coimbatore, Pune, and Delhi.",
      "Use one existing ad. Do not raise the budget above ₹150 until it has 50 new conversations.",
    ];
  }
  return ["Check this row again on the next refresh."];
};

function hourLabel(range) {
  const hour = Number(String(range).slice(0, 2));
  if (!Number.isFinite(hour)) return range || "Today";
  const fmt = (value) => {
    const suffix = value < 12 ? "am" : "pm";
    const hour12 = value % 12 || 12;
    return `${hour12}${suffix}`;
  };
  return `${fmt(hour)}–${fmt((hour + 1) % 24)}`;
}

function improvement(strategy, decision) {
  const action = decision?.action || "Watch";
  const today = strategy.todayLeads || 0;
  const cost = strategy.cpr == null ? "no cost yet" : inr(strategy.cpr, 0);
  const weak = strategy.engagement === "Bottom 10%" || strategy.engagement === "Bottom 20%" || strategy.conversion === "Bottom 10%" || strategy.conversion === "Bottom 20%";
  const tired = (strategy.frequency || 0) >= 2.2;

  if (action === "Scale") {
    return {
      title: "Put the extra institute budget here",
      detail: `${today} leads today and ${strategy.leads} across 5 days at ${cost}. The daily counts are climbing, so this is the campaign that can move toward 60 without a new audience.`,
      steps: [
        "Connect the CRM with the Conversions API before the next budget change. Meta estimates about 24% lower cost per quality lead.",
        `Raise ${inr(strategy.budget)} by about 20% every 3 days. The next step is ${inr(strategy.budget * 1.2)}.`,
        "Do not duplicate this form in a second campaign. A twin splits learning and the cost goes up.",
      ],
    };
  }
  if (action === "Keep") {
    return {
      title: "Keep this as the clinic price anchor",
      detail: `${today} leads today, ${strategy.leads} in 5 days, ${cost} each. ${strategy.engagement ? `Engagement is ${strategy.engagement.toLowerCase()}.` : ""} ${tired ? "Frequency is high, so more budget in these same towns will get expensive." : "Frequency still has a little room."}`,
      steps: [
        "Do not edit targeting or swap out the current image. That restarts learning.",
        "Add one 9:16 video beside the current ad so the account has a second creative when frequency rises.",
        `After 3 more days near ${cost}, move the budget from ${inr(strategy.budget)} to ${inr(strategy.budget * 1.2)}.`,
      ],
    };
  }
  if (action === "Learn") {
    return {
      title: "Leave it alone until it has 50 leads",
      detail: `${today} leads today and ${inr(strategy.spend)} spent. A campaign this new does not have a real cost yet.`,
      steps: [
        "Do not pause, edit, or raise the budget this week.",
        "Do not launch another campaign to the same towns while this one is learning.",
        "Open it again after about 50 leads. If the cost is near the keeper, keep it. If it is far above, hold it.",
      ],
    };
  }
  if (action === "Rebuild") {
    return {
      title: "This was the cheap institute campaign",
      detail: `${strategy.leads} leads at ${cost} over 5 days, then the ads were switched off and today dropped.`,
      steps: [
        "Turn the empty ad set off so it does not sit in the auction.",
        "After CCA is the only other institute WhatsApp campaign, turn one ad back on with Kerala only. Remove Bengaluru, Chennai, Coimbatore, Pune, and Delhi.",
        "Keep the budget at ₹150 until the new run reaches 50 conversations.",
      ],
    };
  }
  if (action === "Hold") {
    return {
      title: weak || (strategy.cpr || 0) > 100 ? "This campaign is paying too much for the next lead" : "This campaign is bidding against a better one",
      detail: `${today} leads today, ${strategy.leads} in 5 days, ${cost}. ${tired ? `Frequency is ${strategy.frequency}, so the same people are seeing it too often.` : "Advantage+ audience is on, so it enters the same auctions as the keeper."} ${strategy.engagement ? `Engagement is ${strategy.engagement.toLowerCase()}.` : ""}`,
      steps: [
        "Pause the campaign in Ads Manager. Do not delete it.",
        "Keep the creative. It can be the next single test after the keeper holds its cost for 7 days.",
        "Move budget onto the keeper in 20% steps, not into another new campaign in the same towns.",
      ],
    };
  }
  if (action === "Fix creative") {
    return {
      title: "Change the creative before you add budget",
      detail: `${strategy.leads} leads at ${cost}. The engagement ranking says people are not responding, so a higher budget buys the same expensive result.`,
      steps: [
        "Replace the opening of the video with a 9:16 Reel that has audio.",
        "Leave the budget where it is until the new creative has about 50 leads.",
      ],
    };
  }
  if (action === "Turn off") {
    return {
      title: "Switch this empty campaign off",
      detail: "It is active and has no live ad, so it cannot bring leads.",
      steps: ["Turn the campaign off. That does not stop any current leads."],
    };
  }
  return {
    title: "Watch the next refresh",
    detail: `${today} leads today.`,
    steps: ["Read it again after the next sync."],
  };
}

let latestPulse = null;

let view = "live";
let filter = "all";
let latestData = null;
let usingPoll = false;
let buildChoice = "raise";
let buildPlace = "";
let buildRadius = "same";
let buildAudience = "same";
let contentDate = "";

function sourceTag(kind) {
  const form = /form/i.test(kind || "");
  return form ? `<span class="tag form">FORM</span>` : `<span class="tag wa">WHATSAPP</span>`;
}

function tone(action) {
  if (action === "Keep" || action === "Scale") return "ok";
  if (action === "Learn" || action === "Watch" || action === "Rebuild" || action === "Fix creative") return "wait";
  return "bad";
}

function shortFix(strategy, decision) {
  return decision.line || decision.action;
}

function matches(strategy) {
  if (filter === "clinic") return strategy.business === "clinic";
  if (filter === "institute") return strategy.business === "institute";
  if (filter === "whatsapp") return !/form/i.test(strategy.kind || "");
  if (filter === "form") return /form/i.test(strategy.kind || "");
  return true;
}

function rowMatches(row) {
  if (filter === "whatsapp") return !/form/i.test(row.kind || "");
  if (filter === "form") return /form/i.test(row.kind || "");
  if (filter === "clinic" || filter === "institute") {
    const strategy = (latestData?.strategies || []).find((item) => item.id === row.adsetId);
    return strategy ? matches(strategy) : filter === "all";
  }
  return true;
}

function startedAt(iso) {
  if (!iso) return "On now";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

function todayFigures(strategy, data) {
  const liveRow = (latestPulse?.today || []).find((row) => row.adsetId === strategy.id);
  if (liveRow) return { leads: liveRow.leads || 0, spend: liveRow.spend || 0 };
  const day = (strategy.days || []).find((item) => item.date === data?.window?.today);
  return { leads: strategy.todayLeads || day?.leads || 0, spend: day?.spend || 0 };
}

function startedRows(data) {
  const rows = (data.strategies || [])
    .filter((strategy) => strategy.status === "ACTIVE" && matches(strategy))
    .sort((a, b) => (b.activeAds > 0) - (a.activeAds > 0) || todayFigures(b, data).leads - todayFigures(a, data).leads);
  return rows.map((strategy) => {
    const today = todayFigures(strategy, data);
    const on = strategy.activeAds > 0;
    return `<article class="warn">
      <span class="${on ? "ok" : "bad"}">${on ? "Live" : "No ad"}</span>
      <div>
        <strong>${strategy.name}</strong>
        <p class="muted">${sourceTag(strategy.kind)} ${strategy.business} · started ${startedAt(strategy.created)} · ${strategy.geo || "Location not set"}</p>
      </div>
      <div class="count">${today.leads}<div class="muted">today</div></div>
    </article>`;
  }).join("") || `<p class="empty">No campaign is switched on in this view.</p>`;
}

function comingRows(data) {
  const rows = (data.strategies || [])
    .filter((strategy) => matches(strategy))
    .map((strategy) => ({ strategy, ...todayFigures(strategy, data) }))
    .filter((row) => row.leads > 0)
    .sort((a, b) => b.leads - a.leads || b.spend - a.spend);
  return rows.map(({ strategy, leads, spend }) => {
    const each = leads > 0 ? inr(spend / leads, 0) : "—";
    return `<article class="warn">
      <span class="ok">${leads}</span>
      <div>
        <strong>${strategy.name}</strong>
        <p class="muted">${sourceTag(strategy.kind)} ${strategy.business} · ${each} each · ${inr(spend)} today</p>
      </div>
      <div class="count">${strategy.status === "ACTIVE" ? "On" : "Off"}<div class="muted">now</div></div>
    </article>`;
  }).join("") || `<p class="empty">No campaign has a lead today in this view.</p>`;
}

function cheapGate(data) {
  const bar = data.plan?.cheapBar;
  return bar == null ? null : bar * 1.25;
}

function fitsCheap(strategy, data) {
  const cap = cheapGate(data);
  if (strategy.activeAds === 0 || strategy.cpr == null) return false;
  if (cap != null && strategy.cpr > cap) return false;
  if (strategy.frequency != null && strategy.frequency >= 2.2) return false;
  return (strategy.fullDayLeads || 0) >= 5;
}

function allLeadRows(data) {
  const rows = (data.strategies || [])
    .filter(matches)
    .map((strategy) => ({ strategy, ...todayFigures(strategy, data) }))
    .sort((a, b) => b.leads - a.leads || (b.strategy.leads || 0) - (a.strategy.leads || 0));
  return rows.map(({ strategy, leads, spend }) => {
    const fit = fitsCheap(strategy, data);
    const cost = strategy.cpr == null ? "no 5-day cost" : `${inr(strategy.cpr, 0)} over 5 days`;
    return `<article class="warn">
      <span class="${leads ? "ok" : "muted"}">${leads}</span>
      <div>
        <strong>${tidy(strategy.name)}</strong>
        <p class="muted">${sourceTag(strategy.kind)} ${strategy.business} · ${strategy.leads || 0} in 5 days · ${cost}${fit ? " · lowest cost" : ""}</p>
      </div>
      <div class="count">${inr(spend, 0)}<div class="muted">today</div></div>
    </article>`;
  }).join("") || `<p class="empty">No campaigns in this view.</p>`;
}

function allLeadTotal(data) {
  return (data.strategies || []).filter(matches).reduce((sum, strategy) => sum + todayFigures(strategy, data).leads, 0);
}

function liveBoards(data) {
  const started = (data.strategies || []).filter((strategy) => strategy.status === "ACTIVE" && matches(strategy));
  const coming = (data.strategies || []).filter((strategy) => matches(strategy) && todayFigures(strategy, data).leads > 0);
  return `<section class="layout">
    <article class="panel">
      <h2>Live campaigns started <span class="muted" id="started-count">${started.length}</span></h2>
      <div id="started-list" class="warn-list">${startedRows(data)}</div>
    </article>
    <article class="panel">
      <h2>Bringing leads now <span class="muted" id="coming-count">${coming.length}</span></h2>
      <div id="coming-list" class="warn-list">${comingRows(data)}</div>
    </article>
  </section>
  <article class="panel">
    <h2>All campaign leads <span class="muted" id="all-lead-total">${allLeadTotal(data)} today</span></h2>
    <div id="all-leads" class="warn-list">${allLeadRows(data)}</div>
  </article>`;
}

function feedHtml(pulse) {
  const arrivals = pulse?.arrivals || [];
  const hours = (pulse?.hours || []).filter(rowMatches);
  const fresh = arrivals.reduce((sum, row) => sum + row.delta, 0);
  const note = fresh ? `<p class="ok">${fresh} new since this desk opened</p>` : "";
  const items = hours.slice(0, 24).map((row) => {
    const arrived = arrivals.find((item) => item.adsetId === row.adsetId && item.hour === row.hour);
    return `<article class="lead ${arrived ? "fresh" : ""}">
      <time>${hourLabel(row.hour)}</time>
      <div class="who"><strong>${row.campaign}</strong>${sourceTag(row.kind)}</div>
      <div class="count ${arrived ? "new" : ""}">${arrived ? `+${arrived.delta}` : row.leads}</div>
    </article>`;
  }).join("");
  return `${note}<div id="feed-list">${items || `<p class="empty">No leads in this view yet.</p>`}</div>`;
}

function warnHtml(strategies, plan) {
  const items = strategies
    .map((strategy) => ({ strategy, decision: plan.decisions[strategy.id] || { action: "Watch" } }))
    .sort((a, b) => issueOrder(a.decision.action) - issueOrder(b.decision.action));
  return items.map(({ strategy, decision }) => {
    const color = tone(decision.action);
    return `<article class="warn">
      <span class="${color}">${decision.action}</span>
      <div>
        <strong>${strategy.name}</strong>
        <p class="fix ${color}">${shortFix(strategy, decision)}</p>
      </div>
      <div class="count">${strategy.todayLeads}<div class="muted">today</div></div>
    </article>`;
  }).join("") || `<p class="empty">Nothing in this filter.</p>`;
}

function tidy(name) {
  return String(name || "").replace(/\s+/g, " ").trim();
}

function lossReport(data) {
  const plan = data.plan || {};
  const bar = plan.cheapBar;
  const cap = bar == null ? null : bar * 1.25;
  const rows = (data.strategies || [])
    .map((strategy) => {
      const spend = strategy.spend || 0;
      const above = strategy.cpr == null || cap == null || strategy.cpr > cap || strategy.activeAds === 0;
      let lost = 0;
      if (spend > 0 && above) {
        lost = !strategy.leads || bar == null ? spend : Math.max(0, spend - strategy.leads * bar);
      }
      return { strategy, lost };
    })
    .filter((row) => row.lost >= 1)
    .sort((a, b) => b.lost - a.lost);
  return {
    bar,
    cap,
    total: rows.reduce((sum, row) => sum + row.lost, 0),
    rows,
  };
}

function whyLost(strategy, bar) {
  const side = strategy.business === "clinic" ? "Clinic" : "Institute";
  const source = /form/i.test(strategy.kind || "") ? "form" : "WhatsApp";
  if (strategy.status === "ACTIVE" && !strategy.activeAds) return `${side} ${source}. No live ad, so this spend cannot bring a lead.`;
  if (!strategy.leads) return `${side} ${source}. The money went out and no lead came back.`;
  return `${side} ${source} cost ${inr(strategy.cpr, 0)}. A cheap lead is ${inr(bar, 0)}.`;
}

function stepLost(strategy, action, winner) {
  if (strategy.status !== "ACTIVE") return "Leave it off. Do not turn it back on at this cost.";
  if (!strategy.activeAds || action === "Turn off" || action === "Rebuild") return "Turn this ad set off.";
  if (winner) return `No extra budget. New money stays on ${tidy(winner.name)}.`;
  return "No extra budget until a campaign holds the cheap price.";
}

function premiumBlock(plan) {
  const premium = plan?.premium;
  if (!premium) return "";
  const card = (item) => `
    <article class="idea ${item.tone}">
      <p class="kicker">${item.kind === "new" ? "New campaign" : "Current campaign"}</p>
      <h3>${item.title}</h3>
      <p class="fix ${item.tone}">${item.line}</p>
      <p class="muted">${item.note}</p>
    </article>`;
  const current = (premium.edits || []).filter((item) => item.kind !== "new");
  const fresh = (premium.edits || []).filter((item) => item.kind === "new");
  return `
    <article class="lost-hero vision-hero">
      <span>40 leads each day</span>
      <strong>${premium.nowPerDay ?? "—"}</strong>
      <em>a day from the lowest-cost campaigns · ${premium.gap ?? "—"} still to reach 40</em>
    </article>
    <p class="steps-label">Current campaign changes</p>
    <div class="idea-grid">${current.map(card).join("")}</div>
    <p class="steps-label">New campaign</p>
    <div class="idea-grid">${fresh.map(card).join("")}</div>`;
}

function ideasHtml(data) {
  const plan = data.plan || {};
  const loss = lossReport(data);
  const active = (data.strategies || []).filter((strategy) => strategy.status === "ACTIVE");
  const actionOf = (strategy) => plan.decisions?.[strategy.id]?.action || "Watch";
  const scales = active.filter((strategy) => actionOf(strategy) === "Scale");
  const keeps = active.filter((strategy) => actionOf(strategy) === "Keep");
  const holds = active.filter((strategy) => actionOf(strategy) === "Hold").sort((a, b) => b.spend - a.spend);
  const offs = active.filter((strategy) => actionOf(strategy) === "Turn off" || actionOf(strategy) === "Rebuild");
  const cap = loss.cap;
  const lead = scales[0];
  const priced = (strategy) => `${tidy(strategy.name)} · ${inr(strategy.cpr, 0)}`;
  const leaks = loss.rows.map(({ strategy, lost }) => `
    <article class="loss">
      <div class="loss-amt">${inr(lost, 0)}</div>
      <div>
        <strong>${tidy(strategy.name)}</strong>
        <div class="muted">${sourceTag(strategy.kind)} · ${strategy.business}</div>
        <p class="fix bad">${whyLost(strategy, loss.bar)}</p>
        <p class="fix ok">${stepLost(strategy, actionOf(strategy), lead)}</p>
      </div>
    </article>`).join("");
  const cards = [
    {
      tone: "ok",
      kicker: "01 · Clinic · do this",
      title: lead ? "Raise only the cheapest" : "Wait for a cheap winner",
      line: lead
        ? `${tidy(lead.name)} · ${inr(lead.cpr, 0)} · ${inr(lead.budget)} → ${inr(lead.budget * 1.2)}`
        : "No campaign is cheap enough to raise.",
      note: cap ? `One 20% step. Stop if the cost goes above ${inr(cap, 0)}.` : "Judge the next step on cost.",
    },
    {
      tone: "ok",
      kicker: "02 · Clinic · leave on",
      title: "Do not raise the other cheap ads",
      line: keeps.length ? keeps.map(priced).join(" · ") : "No second cheap campaign.",
      note: "They already bring cheap leads. A second raise makes them bid against the winner.",
    },
    {
      tone: "bad",
      kicker: "03 · Above the cheap price",
      title: "No extra budget",
      line: holds.slice(0, 6).map(priced).join("<br>") || "None above the cheap price.",
      note: "Leave these on. The red amounts above are the extra paid on them.",
    },
    {
      tone: "wait",
      kicker: "04 · Next test",
      title: "One new ad set",
      line: lead ? `Copy ${tidy(lead.name)} · 9:16 video or one new town · ${inr(150)}` : "Open nothing new yet.",
      note: cap ? `Angamaly, Muvattupuzha, or Kochi. Keep it only under ${inr(cap, 0)}.` : "One test at a time.",
    },
  ];
  if (offs.length) {
    cards.push({
      tone: "bad",
      kicker: "05 · Empty ads",
      title: "Turn the empty ad sets off",
      line: offs.map((strategy) => tidy(strategy.name)).join(" · "),
      note: "No live ad. Switch the ad set off so it cannot re-enter later.",
    });
  }

  return `
    <section class="ideas">
      <header class="ideas-head">
        <p class="mark">Bitvion strategical ideas</p>
        <blockquote>Building businesses. Creating growth.</blockquote>
        <p class="muted">Dr kukku · 40 leads a day · lowest cost first</p>
      </header>
      ${premiumBlock(plan)}
      <article class="lost-hero">
        <span>Lost in 5 days</span>
        <strong>${inr(loss.total, 0)}</strong>
        <em>Extra paid above ${inr(loss.bar, 0)}, plus spend with no lead</em>
      </article>
      <div class="loss-list">${leaks || `<p class="empty">No lost amount in these 5 days.</p>`}</div>
      <p class="steps-label">Improving steps</p>
      <div class="idea-grid">
        ${cards.map((card) => `
          <article class="idea ${card.tone}">
            <p class="kicker">${card.kicker}</p>
            <h3>${card.title}</h3>
            <p class="fix ${card.tone}">${card.line}</p>
            <p class="muted">${card.note}</p>
          </article>`).join("")}
      </div>
    </section>`;
}

function shiftDate(iso, days) {
  const date = new Date(`${iso || "2026-10-26"}T12:00:00+05:30`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dailyLeads(strategy) {
  const full = Number(strategy.fullDayLeads);
  if (full > 0) return full / 4;
  const counted = (strategy.days || []).filter((day) => day.leads > 0).length || 5;
  return (strategy.leads || 0) / counted;
}

const NEXT_TOWNS = ["Angamaly", "Muvattupuzha", "Kochi", "Aluva", "Kothamangalam"];

function cheapHero(data) {
  const listed = (data.strategies || []).filter((strategy) => strategy.status === "ACTIVE" && matches(strategy));
  const proven = listed.filter((strategy) => fitsCheap(strategy, data));
  const pool = proven.length ? proven : listed.filter((strategy) => strategy.activeAds > 0 && strategy.cpr != null);
  return [...pool].sort((a, b) => a.cpr - b.cpr || b.leads - a.leads)[0] || null;
}

function setupFrom(hero) {
  const running = (hero?.places || []).map((place) => place.name).filter(Boolean);
  const suggested = NEXT_TOWNS.find((name) => !running.includes(name)) || NEXT_TOWNS[0];
  const locations = [...new Set([...running, ...NEXT_TOWNS])];
  if (!locations.includes(buildPlace)) buildPlace = suggested;
  return { running, suggested, locations, hero };
}

function winnerAudience(hero) {
  const age = hero?.ageMin && hero?.ageMax ? `${hero.ageMin}–${hero.ageMax}` : "18–65";
  return `${hero?.gender || "Women"} ${age}, ${hero?.advantage ? "Advantage+ on" : "Advantage+ off"}`;
}

function audienceLine(hero) {
  const age = hero?.ageMin && hero?.ageMax ? `${hero.ageMin}–${hero.ageMax}` : "18–65";
  const who = `${hero?.gender || "Women"} ${age}`;
  const advantage = hero?.advantage ? "Advantage+ on" : "Advantage+ off";
  if (buildAudience === "women") return "Women 18–65, Advantage+ on";
  if (buildAudience === "open") return "All 18–65, Advantage+ on";
  return `${who}, ${advantage}`;
}

function radiusLine(hero) {
  if (buildRadius === "10" || buildRadius === "17" || buildRadius === "25") return `${buildRadius} km`;
  return hero?.radius ? `${hero.radius} km, the same as the winner` : "the same radius as the winner";
}

function strategyOptions(data) {
  const hero = cheapHero(data);
  const cap = cheapGate(data);
  const stop = cap == null ? "the lowest proven cost" : inr(cap, 0);
  const listed = (data.strategies || []).filter((strategy) => strategy.status === "ACTIVE" && matches(strategy) && fitsCheap(strategy, data));
  const base = listed.reduce((sum, strategy) => sum + dailyLeads(strategy), 0);
  const heroDaily = hero && fitsCheap(hero, data) ? dailyLeads(hero) : 0;
  const proven = Boolean(hero) && fitsCheap(hero, data);
  const setup = setupFrom(hero);
  const already = setup.running.includes(buildPlace);
  const startBudget = hero?.budget || 150;
  const freshDaily = hero && hero.cpr > 0 && !already ? startBudget / hero.cpr : 0;
  const ramp = [0.3, 0.5, 0.7, 0.9, 1];
  const start = data.window?.today;
  const days = [1, 2, 3, 4, 5].map((step) => shiftDate(start, step));
  const where = `Location ${buildPlace}. Radius ${radiusLine(hero)}. Audience ${audienceLine(hero)}.`;
  const pack = (id, title, kicker, steps, extra) => {
    const series = days.map((date, index) => {
      const added = typeof extra === "function" ? extra(index) : extra;
      return { date, leads: Math.round((base + added) * 10) / 10 };
    });
    const perDay = series[series.length - 1]?.leads ?? 0;
    return { id, title, kicker, steps, series, perDay, ready: Boolean(hero) || id === "empty" };
  };
  const newSteps = hero
    ? already
      ? `${buildPlace} is already inside ${tidy(hero.name)}. Choose a recommended town that is not running. ${where}`
      : `In Ads Manager, duplicate ${tidy(hero.name)} into one new ad set. ${where} Start that ad set at ${inr(startBudget)} a day, the same as the winner. Keep automatic placements. Keep it only while the cost stays under ${stop}.`
    : "Copy a winner only after one live campaign has 5 leads at the lowest cost.";
  return [
    pack("hold", "Keep the lowest-cost campaigns", "No edit", "Leave budgets, location, radius, and audience as they are. This is the pace the running campaigns already hold.", 0),
    pack(
      "raise",
      proven
        ? `Raise only ${tidy(hero.name)}`
        : "Wait for a lowest-cost winner",
      "Current campaign",
      proven
        ? `In Ads Manager, open ${tidy(hero.name)} and raise only its budget by 20%, from ${inr(hero.budget)} to ${inr(hero.budget * 1.2)}. Leave location ${hero.geo || "as it is"}, radius ${hero.radius ? `${hero.radius} km` : "as it is"}, and audience ${winnerAudience(hero)} unchanged. Stop the test if the cost goes above ${stop}.`
        : "No live campaign is proven at the lowest cost yet. Do not raise a budget.",
      heroDaily * 0.2
    ),
    pack("reel", "New campaign · 9:16 video", "New campaign", hero ? `${newSteps} Creative: one 9:16 video with audio.` : newSteps, (index) => freshDaily * ramp[index]),
    pack("town", "New campaign · one new town", "New campaign", newSteps, (index) => freshDaily * ramp[index]),
    pack("empty", "Turn off empty ad sets only", "Cleanup", "In Ads Manager, switch off ad sets that have no live ad. The lead count does not change, because those ad sets are not delivering.", 0),
  ];
}

function campaignSummary(data) {
  const hero = cheapHero(data);
  const rows = (data.strategies || [])
    .filter(matches)
    .map((strategy) => ({ strategy, ...todayFigures(strategy, data) }))
    .sort((a, b) => b.leads - a.leads || (b.strategy.leads || 0) - (a.strategy.leads || 0));
  const liveCount = rows.filter((row) => row.strategy.status === "ACTIVE" && row.strategy.activeAds > 0).length;
  const cards = rows.map(({ strategy, leads, spend }) => {
    const live = strategy.activeAds > 0 && strategy.status === "ACTIVE";
    const fit = fitsCheap(strategy, data);
    const radius = strategy.radius ? `${strategy.radius} km` : "city radius";
    const learning = strategy.learning || "Delivery";
    return `<article class="camp ${fit ? "fit" : ""}">
      <div class="camp-top">
        <span class="${live ? "ok" : "bad"}">${live ? "Live" : strategy.status === "ACTIVE" ? "No ad" : "Off"}</span>
        ${sourceTag(strategy.kind)}
        ${fit ? `<span class="tag fit-tag">Lowest cost</span>` : ""}
        ${strategy.id === hero?.id ? `<span class="tag">Recommended</span>` : ""}
      </div>
      <h3>${tidy(strategy.name)}</h3>
      <p class="muted">${strategy.business} · ${strategy.geo || "Location not set"} · ${radius} · ${winnerAudience(strategy)}</p>
      <p class="muted">${learning} · started ${startedAt(strategy.created)} · ${inr(spend, 0)} today</p>
      <div class="camp-metrics">
        <div><b data-today="${strategy.id}">${leads}</b><span>today</span></div>
        <div><b>${strategy.leads || 0}</b><span>5 days</span></div>
        <div><b>${strategy.cpr == null ? "—" : inr(strategy.cpr, 0)}</b><span>cost</span></div>
      </div>
    </article>`;
  }).join("");
  return `<header class="summary-head">
      <p class="mark">Running now</p>
      <h2>${rows.length} campaigns · ${liveCount} delivering · <span id="summary-today">${allLeadTotal(data)}</span> leads today</h2>
    </header>
    <section class="summary-grid">${cards || `<p class="empty">No campaigns in this view.</p>`}</section>`;
}

function choiceButtons(items, key, current) {
  return `<div class="choice-row">${items.map((item) => `
    <button type="button" class="${item.id === current ? "on" : ""}" data-${key}="${item.id}">
      ${item.label}${item.rec ? `<span class="rec">Recommended</span>` : ""}
    </button>`).join("")}</div>`;
}

function setupControls(data) {
  if (buildChoice !== "reel" && buildChoice !== "town") return "";
  const hero = cheapHero(data);
  const setup = setupFrom(hero);
  const locations = setup.locations.map((name) => ({
    id: name,
    label: setup.running.includes(name) ? `${name} · already running` : name,
    rec: name === setup.suggested,
  }));
  const radii = [
    { id: "same", label: hero?.radius ? `${hero.radius} km` : "Same radius", rec: true },
    { id: "10", label: "10 km" },
    { id: "17", label: "17 km" },
    { id: "25", label: "25 km" },
  ];
  const audiences = [
    { id: "same", label: winnerAudience(hero), rec: true },
    { id: "women", label: "Women 18–65 · Advantage+" },
    { id: "open", label: "All 18–65 · Advantage+" },
  ];
  return `<section class="panel setup-picks">
    <h2>Location, radius, and audience</h2>
    <p class="muted">Filled from ${hero ? tidy(hero.name) : "the cheapest live campaign"}. The recommended town is the first one that campaign is not already using.</p>
    <p class="pick-label">Location</p>
    ${choiceButtons(locations, "place", buildPlace)}
    <p class="pick-label">Radius</p>
    ${choiceButtons(radii, "radius", buildRadius)}
    <p class="pick-label">Audience</p>
    ${choiceButtons(audiences, "audience", buildAudience)}
  </section>`;
}

function contentPage(data) {
  const today = istDay(0);
  const week = [0, 1, 2, 3, 4, 5, 6].map((offset) => istDay(offset));
  const selected = week.includes(contentDate) ? contentDate : today;
  const pool = contentPool(data);
  const cards = week.map((iso) => {
    const piece = creativeFor(campaignFor(pool, iso), iso);
    return `<button type="button" class="day ${iso === selected ? "on" : ""}" data-content-day="${iso}">
      <span class="muted">${iso === today ? "Today" : weekdayName(iso)}</span>
      <b>${dayLabel(iso)}</b>
      <div class="muted">${esc(piece.campaign)}</div>
      <div>${esc(piece.angle)}</div>
    </button>`;
  }).join("");
  const focus = creativeFor(campaignFor(pool, selected), selected);
  const node = (step, title, lines) => `
    <article class="flow-node">
      <p class="step-no">${step}</p>
      <h3>${esc(title)}</h3>
      <ol>${lines.map((line) => `<li>${esc(line)}</li>`).join("")}</ol>
    </article>`;
  return `<section class="strategy-page">
    <header class="summary-head">
      <p class="mark">Content for each day</p>
      <h2>${selected === today ? "Today" : weekdayName(selected)} · ${esc(focus.campaign)}</h2>
      <p class="muted">Built from the campaigns that are delivering now. At midnight IST the board moves to the next live campaign and the next idea on its own.</p>
    </header>
    <div class="week-board">${cards}</div>
    <section class="flow" aria-label="Reach path for the selected day">
      ${node("1 · Story", focus.story.title, focus.story.lines)}
      <div class="flow-arrow" aria-hidden="true">→</div>
      ${node("2 · Reel", focus.reel.title, focus.reel.lines)}
      <div class="flow-arrow" aria-hidden="true">→</div>
      ${node("3 · Post", focus.post.title, focus.post.lines)}
      <div class="flow-arrow" aria-hidden="true">→</div>
      ${node("4 · Ad", focus.ad.title, focus.ad.lines)}
    </section>
    <article class="panel">
      <h2>One film, four places</h2>
      <p class="fix ok">${esc(focus.reach)}</p>
      <p class="muted">${esc(focus.where)} · ${esc(focus.dest)}. Speak it in Malayalam and put the same words on screen. Skip trending songs. The desk does not publish anything.</p>
    </article>
  </section>`;
}

function istDay(offset = 0) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${today}T12:00:00+05:30`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function weekdayName(iso) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date(`${iso}T12:00:00+05:30`));
}

function contentPool(data) {
  const liveSets = (data.strategies || []).filter((strategy) => strategy.status === "ACTIVE" && strategy.activeAds > 0 && matches(strategy));
  return [...liveSets].sort((a, b) => (a.cpr ?? 9999) - (b.cpr ?? 9999) || (b.leads || 0) - (a.leads || 0));
}

function campaignFor(pool, iso) {
  if (!pool.length) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const index = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  return pool[index % pool.length];
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function creativeFor(strategy, iso) {
  const name = tidy(strategy?.name) || "the next live campaign";
  const form = /form/i.test(strategy?.kind || "");
  const institute = strategy?.business === "institute";
  const town = strategy?.places?.[0]?.name || String(strategy?.geo || "").split(",")[0] || "the towns already running";
  const dest = form ? "the instant form" : "WhatsApp";
  const who = institute ? "someone who wants the skill" : "a woman nearby who has been thinking about it";
  const place = institute ? "the classroom" : "the chair";
  const weekday = new Date(`${iso}T12:00:00+05:30`).getUTCDay();
  const angles = [
    {
      angle: "Quiet proof",
      open: `Open on the work, not the logo. Say “${name}” before the first second ends.`,
      middle: `Show ${place} in ${town} for three seconds. No promise of a result.`,
      close: `End on a face and the words “Message on ${dest}.”`,
      sticker: "This-or-that sticker about the visit.",
    },
    {
      angle: "The question",
      open: `First line, spoken: “Still deciding about ${name}?”`,
      middle: `Answer with one real step you do in ${place}. Keep it under four seconds.`,
      close: `Point to ${dest}. The question stops the scroll. The answer is the next message.`,
      sticker: "Question sticker: “What do you want to ask before you come in?”",
    },
    {
      angle: "The hands",
      open: "Start on the hands. No intro card.",
      middle: `Name ${name} while the hands keep moving. One tool, one motion.`,
      close: `A local line: “This is ${town}.” Then ${dest}.`,
      sticker: "Quiz sticker with two honest choices about the visit.",
    },
    {
      angle: "One sentence",
      open: `A person in frame says one sentence about why they asked about ${name}.`,
      middle: "Do not invent a review. Use their words only with permission. Otherwise use your own.",
      close: `${who.charAt(0).toUpperCase()}${who.slice(1)} should see that the next step is ${dest}.`,
      sticker: "Poll: “Want the short version, or the full visit?”",
    },
    {
      angle: "The next step",
      open: `Say where the message goes: ${dest}.`,
      middle: `Show the page they will reach, then cut back to ${place}.`,
      close: "Repeat the campaign name once. Leave the last second with the words on screen.",
      sticker: form ? "Link sticker straight to the form." : "Link sticker to the WhatsApp chat.",
    },
    {
      angle: "The myth",
      open: `“People think ${name} takes the whole day.”`,
      middle: "Show the real length of the visit or the class. Make no guarantee.",
      close: `Invite the question on ${dest} instead of arguing in the caption.`,
      sticker: "Emoji slider from unsure to ready.",
    },
    {
      angle: "Behind the door",
      open: `Open the door of the ${institute ? "institute" : "clinic"} in ${town}.`,
      middle: "One room, one person getting ready, one line about who today is for.",
      close: `Invite them to send the first message on ${dest}.`,
      sticker: "Question box: “Ask what you would ask at the door.”",
    },
  ];
  const angle = angles[weekday] || angles[0];
  return {
    campaign: name,
    angle: angle.angle,
    where: `${institute ? "Institute" : "Clinic"} · ${town}`,
    dest: form ? "Instant form" : "WhatsApp",
    reach: "The story stops the thumb, the reel earns the watch, the post stays on the page, and the ad spends on that same file. One film reaches further than four unrelated pieces.",
    story: {
      title: `${angle.angle} · 3 story frames`,
      lines: [
        `Frame 1. A still of ${place} with six words: “${name} today.” Add a ${angle.sticker}`,
        "Frame 2. Five seconds of the reel, cropped to the face and the hands. No link yet.",
        `Frame 3. The same last line as the reel, then the sticker that opens ${dest}.`,
      ],
    },
    reel: {
      title: "9:16 reel · sound on · 8 to 12 seconds",
      lines: [
        angle.open,
        angle.middle,
        angle.close,
        "Burn the words in the centre, clear of the Reels buttons. Face or hands in the first frame.",
      ],
    },
    post: {
      title: "Feed post from the same film",
      lines: [
        `Frame 1. The spoken first line as large text, with ${name} under it.`,
        `Frame 2. The hands or the class in ${town}.`,
        `Frame 3. Who it is for: ${who}.`,
        `Frame 4. The next step only: open ${dest}. The first caption line is the hook, not the page name.`,
      ],
    },
    ad: {
      title: form ? "Reel ad into the form" : "Reel ad into WhatsApp",
      lines: [
        "Publish the reel on the page first, then use that same reel as the ad.",
        "9:16, sound on, Advantage+ placements. Reels and Stories carry the reach.",
        `Send the click to ${dest}. Leave the location, radius, and audience on the live campaign.`,
        `Open on this idea: ${angle.angle}. That is the line people stop for.`,
      ],
    },
  };
}

function strategyPage(data) {
  const options = strategyOptions(data);
  const chosen = options.find((option) => option.id === buildChoice) || options[0];
  const short = Math.max(0, Math.round((40 - chosen.perDay) * 10) / 10);
  const days = chosen.series.map((day) => `
    <article class="day">
      <span class="muted">${dayLabel(day.date)}</span>
      <b class="${day.leads >= 40 ? "ok" : day.leads >= 20 ? "wait" : ""}">${day.leads}</b>
      <div class="muted">leads that day</div>
    </article>`).join("");
  const columns = options.map((option) => `
    <button type="button" class="strategy-col ${option.id === chosen.id ? "on" : ""}" data-strategy="${option.id}">
      <span class="kicker">${option.kicker}</span>
      <strong>${option.title}</strong>
      <em>${option.perDay} leads / day</em>
    </button>`).join("");
  return `<section class="strategy-page">
    ${campaignSummary(data)}
    <header class="summary-head">
      <p class="mark">Strategy builder</p>
      <h2>Select one move. Each day is a lead count, and the goal is 40 a day.</h2>
    </header>
    <div class="strategy-cols">${columns}</div>
    ${setupControls(data)}
    <section class="panel vision-board">
      <p class="kicker">${chosen.kicker}</p>
      <h2>${chosen.title}</h2>
      <p class="fix ok">${chosen.steps}</p>
      <p class="muted">These are the Ads Manager steps. The desk does not change the live campaigns. A wider radius or a different audience is a new test, not a promise of more leads.</p>
      <div class="days">${days}</div>
      <article class="lost-hero vision-hero">
        <span>Leads per day if the cost holds</span>
        <strong id="strategy-total">${chosen.perDay}</strong>
        <em>Goal is 40 a day. This move is ${short} a day short of 40 by day 5.</em>
      </article>
    </section>
  </section>`;
}

function render(data) {
  if (data.error) {
    live.className = "live wait";
    live.textContent = "Resting";
    synced.textContent = data.error;
    if (!latestData || latestData.error) app.innerHTML = `<section class="error">${data.error}</section>`;
    return;
  }
  latestData = data;

  live.className = "live";
  live.textContent = "Live";
  synced.textContent = `Synced ${clock(data.generatedAt)} IST`;

  const rate = data.runRate;
  const plan = data.plan;
  const running = data.strategies.filter((strategy) => strategy.status === "ACTIVE" && matches(strategy));
  const recent = data.strategies.filter((strategy) => strategy.status !== "ACTIVE" && matches(strategy));
  const bar = plan.cheapBar;
  const costTone = rate.costPerLead == null ? "" : bar != null && rate.costPerLead > bar * 1.2 ? "bad" : "ok";

  const stats = `
    <section class="vision">
      <article class="stat target"><span>Goal</span><strong>40</strong><em>leads / day</em></article>
      <article class="stat"><span>Today</span><strong data-live-today>${pulseTodayCount(data)}</strong><em>live</em></article>
      <article class="stat"><span>At the lowest cost</span><strong class="ok">${plan.cheapPerDay ?? "—"}</strong><em>leads / day</em></article>
      <article class="stat"><span>Still to reach 40</span><strong id="goal-gap">${plan.cheapPerDay == null ? "—" : Math.max(0, Math.round((40 - plan.cheapPerDay) * 10) / 10)}</strong><em>leads / day</em></article>
    </section>
    <section class="stats">
      <article class="stat target"><span>Cheap bar</span><strong>${inr(bar, 0)}</strong><em>lowest proven cost</em></article>
      <article class="stat"><span>5-day rate</span><strong>${rate.leadsPerDay}</strong><em>${rate.countedLabel || "average"}</em></article>
      <article class="stat"><span>Today</span><strong data-live-today>${pulseTodayCount(data)}</strong><em>live</em></article>
      <article class="stat"><span>Cost / lead</span><strong class="${costTone}">${inr(rate.costPerLead, 0)}</strong><em>blended</em></article>
      <article class="stat gap"><span>At that price</span><strong class="ok">${plan.cheapPerDay ?? "—"}</strong><em>leads / day</em></article>
    </section>
    <button type="button" class="goal" data-open="path">
      <span>Cheap bar <b>${inr(bar, 0)}</b></span>
      <span class="ok">At that price <b>${plan.cheapPerDay ?? "—"}</b>/day</span>
      <span class="bad">Lost <b id="lost-total">${inr(lossReport(data).total, 0)}</b></span>
      <span class="link">Bitvion ideas</span>
    </button>`;

  let body = "";
  if (view === "live") {
    body = `${liveBoards(data)}<section class="layout">
      <article class="panel">
        <h2>Leads now · time and source</h2>
        <div id="feed">${feedHtml(latestPulse)}</div>
      </article>
      <article class="panel">
        <h2>Change now</h2>
        <div class="warn-list">${warnHtml(running, plan)}</div>
      </article>
    </section>${ideasHtml(data)}`;
  } else if (view === "build") {
    body = strategyPage(data);
  } else if (view === "content") {
    body = contentPage(data);
  } else if (view === "path") {
    body = ideasHtml(data);
  } else if (view === "days") {
    body = `<section class="days">${data.byDay.map((day) => {
    const total = Math.max(1, day.leads);
    return `
      <article class="day">
        <span class="muted">${dayLabel(day.date)}${day.partial ? " · today" : ""}</span>
        <b class="${day.leads >= 20 ? "ok" : day.leads >= 12 ? "wait" : "bad"}">${day.leads}</b>
        <div class="muted">Clinic ${day.clinicLeads} · Institute ${day.instituteLeads}</div>
        <div class="muted">${inr(day.spend)}</div>
        <div class="bar"><i class="c" style="width:${(day.clinicLeads / total) * 100}%"></i><i class="i" style="width:${(day.instituteLeads / total) * 100}%"></i></div>
      </article>`;
  }).join("")}</section>`;
  } else {
    const headDays = data.window.days.map((date) => `<th class="day">${dayLabel(date)}</th>`).join("");
    const rows = (list) => list.map((strategy) => {
      const decision = plan.decisions[strategy.id] || { action: "Watch" };
      const color = tone(decision.action);
      const cells = strategy.days.map((day) => `<td class="day ${day.leads ? "" : "zero"}">${day.leads}</td>`).join("");
      return `<tr class="${color}">
        <td class="name" data-label="Campaign"><strong>${strategy.name}</strong><small>${sourceTag(strategy.kind)} · ${strategy.business}</small></td>
        ${cells}
        <td data-label="5 days">${strategy.leads}</td>
        <td data-label="Cost" class="${strategy.cpr > 100 ? "bad" : "ok"}">${inr(strategy.cpr, 0)}</td>
        <td data-label="Next" class="${color}">${decision.action}</td>
      </tr>`;
    }).join("");
    body = `<div class="table-wrap"><table>
      <thead><tr><th class="name">Campaign</th>${headDays}<th>5 days</th><th>Cost</th><th>Next</th></tr></thead>
      <tbody>${rows(running)}${rows(recent)}</tbody>
    </table></div>`;
  }

  app.innerHTML = stats + body;
}

function evidence(strategy) {
  const cost = strategy.cpr == null ? "no leads yet" : `${inr(strategy.cpr, 0)} per ${strategy.kind.toLowerCase()}`;
  const rank = [strategy.quality && `quality ${strategy.quality}`, strategy.engagement && `engagement ${strategy.engagement}`, strategy.conversion && `conversion ${strategy.conversion}`]
    .filter(Boolean)
    .join(", ");
  return `${strategy.leads} leads on ${inr(strategy.spend)} over 5 days, ${cost}. Budget ${inr(strategy.budget)}/day. ${rank}`;
}

function actionOrder(action) {
  return ["Scale", "Keep", "Rebuild", "Learn", "Fix creative", "Hold", "Turn off", "Watch"].indexOf(action);
}

function issueOrder(action) {
  return ["Turn off", "Hold", "Fix creative", "Rebuild", "Learn", "Scale", "Keep", "Watch"].indexOf(action);
}

function pulseTodayCount(data) {
  if (latestPulse?.todayLeads != null) return latestPulse.todayLeads;
  return data?.runRate?.todayLeads ?? "—";
}

function applyPulse(pulse) {
  latestPulse = pulse;
  const feed = document.querySelector("#feed");
  const today = document.querySelectorAll("[data-live-today]");
  const started = document.querySelector("#started-list");
  const coming = document.querySelector("#coming-list");
  if (feed) feed.innerHTML = feedHtml(pulse);
  if (started && latestData) {
    started.innerHTML = startedRows(latestData);
    const startedCount = document.querySelector("#started-count");
    const comingCount = document.querySelector("#coming-count");
    const onNow = (latestData.strategies || []).filter((strategy) => strategy.status === "ACTIVE" && matches(strategy));
    const bringing = (latestData.strategies || []).filter((strategy) => matches(strategy) && todayFigures(strategy, latestData).leads > 0);
    if (startedCount) startedCount.textContent = onNow.length;
    if (comingCount) comingCount.textContent = bringing.length;
  }
  if (coming && latestData) coming.innerHTML = comingRows(latestData);
  const allLeads = document.querySelector("#all-leads");
  const allTotal = document.querySelector("#all-lead-total");
  if (allLeads && latestData) allLeads.innerHTML = allLeadRows(latestData);
  if (allTotal && latestData) allTotal.textContent = `${allLeadTotal(latestData)} today`;
  document.querySelectorAll("[data-today]").forEach((node) => {
    const strategy = (latestData?.strategies || []).find((item) => item.id === node.dataset.today);
    if (strategy) node.textContent = todayFigures(strategy, latestData).leads;
  });
  const summaryToday = document.querySelector("#summary-today");
  if (summaryToday && latestData) summaryToday.textContent = allLeadTotal(latestData);
  if (today.length && pulse.todayLeads != null) today.forEach((node) => { node.textContent = pulse.todayLeads; });
  if (pulse.generatedAt) synced.textContent = `Leads ${clock(pulse.generatedAt)} IST`;
}

document.querySelector("#app").addEventListener("click", (event) => {
  const dayPick = event.target.closest("[data-content-day]");
  if (dayPick && latestData) {
    contentDate = dayPick.dataset.contentDay;
    render(latestData);
    return;
  }
  const place = event.target.closest("[data-place]");
  if (place && latestData) {
    buildPlace = place.dataset.place;
    render(latestData);
    return;
  }
  const radius = event.target.closest("[data-radius]");
  if (radius && latestData) {
    buildRadius = radius.dataset.radius;
    render(latestData);
    return;
  }
  const audience = event.target.closest("[data-audience]");
  if (audience && latestData) {
    buildAudience = audience.dataset.audience;
    render(latestData);
    return;
  }
  const pick = event.target.closest("[data-strategy]");
  if (pick && latestData) {
    buildChoice = pick.dataset.strategy;
    render(latestData);
    return;
  }
  const opener = event.target.closest("[data-open]");
  if (!opener || !latestData) return;
  view = opener.dataset.open;
  document.querySelectorAll("#views button").forEach((item) => item.classList.toggle("on", item.dataset.view === view));
  render(latestData);
});

function bindSwitch(id, key) {
  document.querySelectorAll(`#${id} button`).forEach((button) => {
    button.addEventListener("click", () => {
      if (key === "view") view = button.dataset.view;
      else filter = button.dataset.filter;
      document.querySelectorAll(`#${id} button`).forEach((item) => item.classList.toggle("on", item === button));
      if (latestData) render(latestData);
    });
  });
}

function startPoll() {
  if (usingPoll) return;
  usingPoll = true;
  const seen = new Map();
  let quietUntil = 0;
  const resting = (data) => {
    if (!/limit/i.test(data?.error || "")) return false;
    quietUntil = Date.now() + 10 * 60 * 1000;
    render(data);
    return true;
  };
  const load = async () => {
    if (Date.now() < quietUntil) return false;
    const response = await fetch("/api/live");
    const data = await response.json();
    if (resting(data)) return false;
    if (!data.error && data.generatedAt && data.generatedAt === latestData?.generatedAt) return true;
    render(data);
    return !data.error;
  };
  const tick = async () => {
    if (Date.now() < quietUntil) return;
    const response = await fetch("/api/pulse");
    const data = await response.json();
    if (resting(data) || data.error) return;
    const primed = seen.size > 0;
    const fresh = [];
    for (const row of data.hours || []) {
      const key = `${row.adsetId}|${row.hour}`;
      const previous = seen.get(key) || 0;
      if (primed && row.leads > previous) fresh.push({ ...row, delta: row.leads - previous });
      seen.set(key, row.leads);
    }
    data.arrivals = fresh;
    if (data.generatedAt && data.generatedAt === latestPulse?.generatedAt && fresh.length === 0) return;
    applyPulse(data);
  };
  load()
    .then((ok) => {
      if (ok) return tick();
    })
    .catch((error) => {
      live.className = "live wait";
      live.textContent = "Resting";
      synced.textContent = error.message || "Meta did not answer";
    });
  setInterval(() => load().catch(() => {}), 20000);
  setInterval(() => tick().catch(() => {}), 20000);
}

function paintTheme(theme) {
  const button = document.querySelector("#theme");
  document.documentElement.dataset.theme = theme;
  if (!button) return;
  button.textContent = theme === "light" ? "Dark" : "Light";
  button.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
}

function connect() {
  const saved = localStorage.getItem("bitvion-theme") === "light" ? "light" : "dark";
  paintTheme(saved);
  document.querySelector("#theme").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    localStorage.setItem("bitvion-theme", next);
    paintTheme(next);
  });
  bindSwitch("views", "view");
  bindSwitch("filters", "filter");
  openStream();
}

function openStream() {
  const stream = new EventSource("/api/stream");
  let opened = false;
  stream.addEventListener("snapshot", (event) => {
    opened = true;
    render(JSON.parse(event.data));
  });
  stream.addEventListener("pulse", (event) => {
    opened = true;
    applyPulse(JSON.parse(event.data));
  });
  stream.onerror = () => {
    stream.close();
    if (!opened) startPoll();
    else {
      live.className = "live wait";
      live.textContent = "Reconnecting";
      setTimeout(() => {
        if (!usingPoll) openStream();
      }, 3000);
    }
  };
}

connect();
