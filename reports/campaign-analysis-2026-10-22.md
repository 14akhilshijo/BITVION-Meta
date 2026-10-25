# Meta Ads analysis — 22 October 2026

Live data from the Marketing API, Asia/Kolkata. Last 7 days and last 30 days exclude today. Currency is INR. Reach is Accounts Center accounts.

None of the live campaigns use Advantage+ campaign budget. The correct evaluation level is the **ad set**, not a placement or a single ad. Placement averages are explained only through the Breakdown Effect.

Meta did not return `learning_stage_info` on these ad sets. Learning status below is inferred from optimization events. About 50 results in 7 days are required to leave learning. Findings on ad sets under that line are preliminary.

## Executive summary

1. **Dr kukku is the live account, and its efficiency is concentrated in two creatives that are no longer the focus.** Microshading produced WhatsApp conversations at about ₹17, and the paused Combination brow campaign produced them at about ₹15. Today four new campaigns were launched (Lip, Microshading, GFC, CCA). That resets learning on offers that already had a working ad set.
2. **Botox and Oxygeno Facial are expensive for a delivery reason, not because the budget is too small.** Botox engagement ranking is bottom 10% and the 7-day cost per conversation is about 58% above the 30-day cost. Oxygeno has 5 conversations at about ₹224, frequency 2.25, and Meta’s own recommendation is a 9:16 Reels creative with audio.
3. **Rimsha Paulose Dr.K has one clear winner.** `lip 17/10/26` is at about ₹11 per WhatsApp conversation, stable, and past 50 results. Filler is still in learning with a below-average quality ranking. Microblading’s budget cannot produce 50 conversations a week at the current cost.
4. **SBA 3.0 is fully paused.** The last 30 days still show the pattern to avoid on relaunch: the same treatments were duplicated across Advantage, Lookalike, and Lux campaigns.

## Accounts

| Account | Status | Last 7 days spent | Last 30 days spent | Lifetime spent | Amount due |
|---|---|---:|---:|---:|---:|
| Dr kukku | Active | ₹13,371 | ₹41,733 | ₹44,173 | ₹1,500 |
| Rimsha Paulose Dr.K | Active | ₹3,870 | ₹15,324 | ₹143,438 | ₹654 |
| SBA 3.0 | Active, all campaigns paused | ₹0 | ₹26,060 | ₹501,157 | ₹0 |
| Rimsha Paulose | Active, no campaigns | ₹0 | ₹0 | ₹0 | ₹0 |

All four accounts accepted the token. Permissions on the token are `ads_read`, `ads_management`, and `business_management`. The long-lived token expires on 21 December 2026.

Bid strategy on the active ad sets is highest volume (`LOWEST_COST_WITHOUT_CAP`). That is consistent with maximizing conversations. There is no bid cap to loosen.

## Dr kukku — `act_975152708626051`

12 campaigns are active. Several were created or renamed today (22 Oct), so they have no results yet. Judge those only after they approach 50 optimization events.

### WhatsApp conversations, last 7 days

| Ad set | Amount spent | Conversations | Cost | Frequency | What the rankings say |
|---|---:|---:|---:|---:|---|
| Microshading reel | ₹1,281 | 74 | ₹17.32 | 1.24 | Quality above average, engagement average, conversion above average |
| Chin Filler image | ₹1,469 | 37 | ₹39.71 | 1.70 | Quality, engagement, and conversion all above average |
| IAA 15/10 image | ₹1,029 | 26 | ₹39.58 | 1.38 | Engagement and conversion below average (bottom 35%) |
| GFC Hair | ₹862 | 20 | ₹43.09 | 1.30 | Quality above average, engagement bottom 20% |
| Lip post | ₹423 | 14 | ₹30.24 | 1.28 | Quality above average, engagement bottom 35% |
| Botox | ₹1,127 | 10 | ₹112.74 | 1.69 | Quality above average, engagement bottom 10%, conversion bottom 35% |
| Oxygeno Facial | ₹1,119 | 5 | ₹223.77 | 2.25 | Quality above average, engagement and conversion bottom 35% |
| IAA 21/10 image | ₹730 | 4 | ₹182.56 | 1.46 | Engagement and conversion above average, but only 4 conversations |

Microshading, GFC Hair, and the older Lip ad set are **not** in the active campaign list anymore. They spent during the last 7 days and were replaced today.

### Learning

| Ad set | Events in the window | Reading |
|---|---:|---|
| Microshading | 74 conversations / 7 days | Enough events to trust the result |
| Chin Filler | 41 / 7 days | Borderline. Treat as almost out of learning |
| IAA 15/10 | 26 / 7 days | Still learning |
| Botox | 10 / 7 days | Will not exit learning at this rate |
| Oxygeno | 5 / 7 days | Learning, and the sample is too small for a hard stop |
| Lip, Microshading, GFC, CCA launched today | 0 | Learning started today. No judgment yet |

### Diagnosis

**The account is splitting learning across duplicate offers.** Two campaigns are both named `IAA | 18/9/26` and both are active, on the same Page as the other IAA ad sets. Lip, Microshading, and GFC now have a new campaign beside the ad set that was already delivering. Meta will enter fewer auctions with each ad set, and the new ad sets need another ~50 results before delivery stabilizes.

**Botox is a creative problem.** Cost per conversation moved from about ₹72 over 30 days to about ₹113 over 7 days. That is above the 50% line that separates normal noise from a real slide. CTR (all) is 0.71% and Link CTR is 0.24%. The engagement ranking in the bottom 10% means the estimated action rate in the auction is weak, so the same bid buys fewer conversations. Raising the budget would buy more of the same expensive delivery.

**Oxygeno matches Meta’s own recommendation.** The recommendations API says a full-screen 9:16 Reels video with audio can lower cost per messaging conversation by about 25% on ad set `DRK OXYGENO FACIAL 17/10/26`. Frequency is already 2.25 on only 6,141 Accounts Center accounts in 7 days, so the audience is also being hit repeatedly while the creative under-engages. This recommendation is aligned with the rankings. Follow it.

**Chin Filler is healthy, with an early fatigue signal.** All three rankings are above average, so the higher cost versus Microshading is the offer, not a bad ad. CTR (all) eased from about 1.05% in the first half of the 14-day series to about 0.72% in the second half, and the later cost per conversation is higher. Add a second creative next to the current image. Do not replace the current ad, and do not cut this ad set because its average cost is higher than Microshading.

**Lead campaigns are a different, more expensive auction.** `IAA | Leads | 6/10/26` spent ₹2,127 in 7 days for 20 leads (about ₹106 per lead) at a CPM near ₹379. The newer Karnataka ad set is about ₹78 per lead; the older one is about ₹173. Meta’s recommendation on this live lead campaign, and on the paused GFC lead campaign, is to connect the CRM through the Conversions API. The stated potential is about 24% lower cost per quality lead. That recommendation should be followed if lead forms stay on. It should not be used as a reason to keep lead ads and WhatsApp ads aimed at the same IAA audience.

**Combination brow is the missed winner.** Over 30 days it spent ₹3,207, started 210 WhatsApp conversations, and cost about ₹15.27 each. CTR (all) was 2.21% and cost per Link Click was ₹4.45. It is paused. If that treatment is still offered, it is a stronger restart than another new learning campaign.

### What to test

1. **Resume the proven Microshading ad set if today’s new Microshading campaign uses a new learning start for the same offer.** Expected effect: conversations stay near ₹17 instead of resetting. If the new campaign is a genuinely new creative, pause the old one and do not edit the new one until it has about 50 conversations.
2. **Replace the Botox creative (hook and first seconds). Do not increase its budget.** Expected effect: engagement ranking and Link CTR move first; cost per conversation follows only after that. Check again after 50 conversations.
3. **Apply Meta’s Reels recommendation on Oxygeno: one 9:16 video with audio, placed in Reels.** Keep the budget at ₹150 until 50 conversations. Expected effect: the recommendations API estimates about 25% lower cost per conversation. This is a hypothesis until the new creative proves it.
4. **Turn off `IAA | 21/10/26 IM` as an overlap test**, not because its average cost is high in isolation. It spent about ₹730 for 4 conversations while other IAA ad sets on the same Page are also in learning. Move that ₹300 daily budget only after one remaining IAA ad set is the single WhatsApp learner.
5. **Connect Conversions API / CRM on the live IAA lead campaign** if that funnel stays. This matches Meta’s recommendation. Do not run that lead ad set against the same audience as the IAA WhatsApp ad sets.
6. **Leave automatic placements on.** See Breakdown Effect below.

## Rimsha Paulose Dr.K — `act_853021051812404`

Three ad sets are active. All optimize for WhatsApp conversations. None use campaign budget. `Microblading` uses day parting, so some days have zero delivery on purpose.

| Ad set | Daily budget | 7-day spent | Conversations | Cost | 30-day cost | Rankings |
|---|---:|---:|---:|---:|---:|---|
| lip 17/10/26 | ₹200 | ₹961 | 87 | ₹11.05 | ₹11.05 (new) | Quality average, engagement above average, conversion average |
| Filler 17/10/26 | ₹200 | ₹894 | 38 | ₹23.51 | ₹23.51 (new) | Quality bottom 20%, conversion bottom 35% |
| Microblading 18/9/26 | ₹150 | ₹1,035 | 24 | ₹43.14 | ₹35.29 | Quality above average, engagement bottom 35%, conversion bottom 20% |

Lip daily cost per conversation from 17–21 Oct stayed between ₹8.24 and ₹12.40. That is stable. It is past 50 conversations, so this reading is usable. Do not change targeting, budget, or the creative this week.

Filler has 38 conversations in five days, so it is still in learning. Frequency is already 2.14 on 5,265 Accounts Center accounts. The quality ranking, not the higher average cost versus Lip, is the reason to change the creative. A higher cost on a different treatment is not a reason to pause it.

Microblading’s 7-day cost is about 22% above its 30-day cost. That sits inside normal 20–30% movement, except 21 Oct, which was one conversation at ₹178. The structural issue is the budget. At ₹43 per conversation, ₹150 a day buys roughly 25 conversations a week, under the 50 needed to leave learning. Day parting removes more days. Raising the budget before the conversation rate improves would scale a below-average conversion ranking. Change the hook that asks for the WhatsApp chat first. Revisit the budget only if cost per conversation moves toward the ₹35 30-day level.

One ad, `Combination brows | 4/9/26`, has delivery issues. Clear that in Ads Manager before using that creative again.

## SBA 3.0 — `act_1107788297835090`

Nothing is delivering. All 43 campaigns are paused. Last 30 days:

| Campaign | Amount spent | Conversations | Cost | CTR (all) |
|---|---:|---:|---:|---:|
| WINNER Advantage 09/09/26 | ₹7,594 | 257 | ₹29.55 | 1.39% |
| WINNER Lookalike 09/09/26 | ₹7,734 | 213 | ₹36.31 | 1.18% |
| WINNER Lux Rules 28/09/26 | ₹8,200 | 224 | ₹36.61 | 1.51% |
| GFC Lookalike 09/09/26 | ₹2,533 | 65 | ₹38.97 | 0.50% |

The same treatments (chin filler, facial rejuvenation, lip, micro pigmentation, Botox) were split across those campaigns at ₹100–₹300 a day. Chin filler was the efficient offer (about ₹22–₹28). Botox was about ₹57 except inside the Advantage campaign (₹39). An EMI copy ad set cost about ₹73.

If this account is turned back on, the test is one campaign, not three copies of the same offers. Budgets of ₹100 a day cannot reach 50 conversations a week at a ₹30–₹40 cost. Fix the disapproved ad `Chin Cat` and the five ads marked with issues before they are used again. This is not a recommendation to resume spend.

## Breakdown Effect

Do not turn placements off because their average cost is higher.

On Dr kukku, last 14 days, Instagram Reels took the most delivery (about ₹11,647) at a blended average cost near ₹40. Facebook Feed, Facebook Reels, and Instagram Stories show lower average costs (about ₹32–₹35) on much less spend. WhatsApp Status is about ₹12 on only ₹281. The cheaper placements can be the ones that already ran out of low-cost impressions. Meta then spends where the **next** result is cheaper, which is why Reels holds the budget. Cutting Reels because the average looks worse would remove the placement that is still producing volume.

On Rimsha Paulose Dr.K, Instagram Reels spent about ₹2,884 at about ₹21 per result, and Instagram Stories spent about ₹923 at about ₹71. The system has already shifted budget toward Reels. Stories still produced results. Excluding Stories based on that average would be the Breakdown Effect mistake. Leave automatic placements on for both accounts.

## Pacing and overlap

Daily spend swinging around the daily budget is normal. Meta can spend more on one day and less on another. Microblading on Rimsha, and one IAA ad set on Dr kukku, use day parting, so zero-spend days there are the schedule, not a delivery failure.

The overlap problem is structural. Similar WhatsApp ad sets on the same Page compete for the same auction, and Meta only lets one of your ads win. The ad sets that lose those auctions also fail to collect 50 results. That is the situation on Dr kukku’s IAA ad sets and on the three paused SBA “winner” campaigns.

## Order of work

1. Dr kukku: stop duplicating Microshading, Lip, and GFC. Keep the ad set that already has results unless the new creative is the point of the test.
2. Dr kukku: new Botox creative, and a 9:16 Reels creative for Oxygeno. Do not raise those budgets this week.
3. Dr kukku: one IAA WhatsApp ad set, and Conversions API on the IAA lead campaign if leads stay.
4. Rimsha: leave Lip untouched. New Filler creative. New Microblading hook before any budget increase.
5. SBA: do not relaunch the three parallel winner campaigns. Clean disapproved and with-issues ads first.
