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
        <p class="muted">Dr kukku · cheap bar ${inr(plan.cheapBar, 0)} · ${plan.cheapPerDay ?? "—"} leads/day at that price</p>
      </header>
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
    <section class="stats">
      <article class="stat target"><span>Cheap bar</span><strong>${inr(bar, 0)}</strong><em>lowest proven cost</em></article>
      <article class="stat"><span>5-day rate</span><strong>${rate.leadsPerDay}</strong><em>${rate.countedLabel || "average"}</em></article>
      <article class="stat"><span>Today</span><strong id="today-count">${pulseTodayCount(data)}</strong><em>live</em></article>
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
    body = `<section class="layout">
      <article class="panel">
        <h2>Leads now · time and source</h2>
        <div id="feed">${feedHtml(latestPulse)}</div>
      </article>
      <article class="panel">
        <h2>Change now</h2>
        <div class="warn-list">${warnHtml(running, plan)}</div>
      </article>
    </section>${ideasHtml(data)}`;
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
  const today = document.querySelector("#today-count");
  if (feed) feed.innerHTML = feedHtml(pulse);
  if (today && pulse.todayLeads != null) today.textContent = pulse.todayLeads;
  if (pulse.generatedAt) synced.textContent = `Leads ${clock(pulse.generatedAt)} IST`;
}

document.querySelector("#app").addEventListener("click", (event) => {
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
  setInterval(() => load().catch(() => {}), 180000);
  setInterval(() => tick().catch(() => {}), 180000);
}

function connect() {
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
