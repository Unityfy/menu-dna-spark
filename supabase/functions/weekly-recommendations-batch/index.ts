// Weekly batch: generates fresh recommendations for every restaurant.
// Designed to be called by pg_cron every Monday 04:00 (server time).
// Authenticates via a shared CRON_SECRET header — no user JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

interface DishProfile {
  id: string;
  menu_item_id: string;
  true_margin: number;
  weekly_revenue: number;
  weekly_profit: number;
  weekly_orders: number;
  stress_score: number;
  classification: string;
  demand_trend: string;
  demand_pattern: any;
  cannibalization_score: number;
  peak_hour_concentration: number;
  prep_time_volatility: number;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  prep_time_minutes: number;
  complexity: string;
  is_active: boolean;
  updated_at: string;
}

// Mirrors the rule-set in compute-recommendations/index.ts.
// Generates 3-8 recommendations per restaurant, prioritized by absolute expected profit impact.
function buildRecommendations(
  profiles: DishProfile[],
  menuMap: Map<string, MenuItem>,
  restaurantId: string,
  snapshotId: string | null,
  weekStart: string,
  ignoreCount: Map<string, number>,
): any[] {
  const recs: any[] = [];
  const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;
  const EIGHT_WEEKS_MS = 56 * 24 * 60 * 60 * 1000;

  for (const p of profiles) {
    const item = menuMap.get(p.menu_item_id);
    if (!item) continue;
    const name = item.name;
    const itemUpdatedAt = item.updated_at ? new Date(item.updated_at).getTime() : 0;
    const noRecentPriceChange = itemUpdatedAt > 0 && (Date.now() - itemUpdatedAt) > FOUR_WEEKS_MS;
    const pattern = p.demand_pattern || {};
    const byHour: Record<number, number> = pattern.byHour || {};
    const byOrderType = pattern.byOrderType || {};

    // 1. Price optimization
    if (p.true_margin > 55 && p.stress_score < 50 && p.weekly_orders > 100 && noRecentPriceChange) {
      const increase = Math.max(1, Math.round(item.selling_price * 0.10));
      const revGain = increase * p.weekly_orders;
      const profitGain = Math.round(revGain * 0.9);
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "price",
        title: `Increase price by ₹${increase}`,
        reasoning: `${name} runs at a ${p.true_margin.toFixed(0)}% margin with low kitchen stress (${p.stress_score.toFixed(0)}/100) and strong weekly demand (${p.weekly_orders} orders). Price has been stable for 4+ weeks — a ₹${increase} (10%) increase should add ~₹${profitGain.toLocaleString()}/week with minimal demand impact.`,
        expected_revenue_impact: revGain, expected_profit_impact: profitGain, expected_stress_impact: 0,
        status: "pending", week_start: weekStart,
      });
    }

    // 2. Portion adjustment
    if (p.true_margin < 20 && p.stress_score > 60) {
      const saving = Math.round(item.food_cost * 0.15);
      const profitGain = saving * p.weekly_orders;
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "portion",
        title: "Reduce portion by 15%",
        reasoning: `${name} is squeezed on both sides — margin is only ${p.true_margin.toFixed(0)}% and kitchen stress is ${p.stress_score.toFixed(0)}/100. Trimming portion by 15% saves ~₹${saving}/order (~₹${profitGain.toLocaleString()}/week) and lightens prep load.`,
        expected_revenue_impact: 0, expected_profit_impact: profitGain,
        expected_stress_impact: -Math.round(p.stress_score * 0.15),
        status: "pending", week_start: weekStart,
      });
    }

    // 3. Time-based availability
    const lunch = (byHour[12] || 0) + (byHour[13] || 0) + (byHour[14] || 0);
    const dinner = (byHour[19] || 0) + (byHour[20] || 0) + (byHour[21] || 0);
    const total = Object.values(byHour).reduce((a: number, b: number) => a + b, 0) || 1;
    let removeWindow: "lunch" | "dinner" | null = null;
    if (p.stress_score > 80 && lunch / total < 0.30 && lunch > 0) removeWindow = "lunch";
    else if (p.stress_score > 80 && dinner / total < 0.30 && dinner > 0) removeWindow = "dinner";
    if (removeWindow) {
      const lostOrders = removeWindow === "lunch" ? lunch : dinner;
      const lostRevenue = Math.round((lostOrders / total) * p.weekly_revenue);
      const lostProfit = Math.round((lostOrders / total) * p.weekly_profit);
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "availability",
        title: `Remove from ${removeWindow} menu`,
        reasoning: `${name} drives heavy kitchen stress (${p.stress_score.toFixed(0)}/100) but only ${Math.round((lostOrders / total) * 100)}% of its orders happen at ${removeWindow}. Removing it from the ${removeWindow} menu cuts pressure during a low-payoff window with only ~₹${lostRevenue.toLocaleString()} revenue at stake.`,
        expected_revenue_impact: -lostRevenue, expected_profit_impact: -lostProfit,
        expected_stress_impact: -Math.round(p.stress_score * 0.25),
        status: "pending", week_start: weekStart,
      });
    }

    // 4. Channel restriction
    const deliveryPct = byOrderType.delivery || 0;
    const isComplex = (item.complexity || "medium") === "high" || item.prep_time_minutes >= 20;
    if (isComplex && deliveryPct >= 25) {
      const lostRevenue = Math.round((deliveryPct / 100) * p.weekly_revenue);
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "channel",
        title: "Restrict to dine-in only",
        reasoning: `${name} is a high-complexity dish (prep ${item.prep_time_minutes} min) and ${deliveryPct}% of its orders go through delivery — where travel time degrades quality and drives complaints. Restricting to dine-in protects brand quality at the cost of ~₹${lostRevenue.toLocaleString()}/week in delivery revenue.`,
        expected_revenue_impact: -lostRevenue,
        expected_profit_impact: -Math.round((deliveryPct / 100) * p.weekly_profit),
        expected_stress_impact: -Math.round(p.stress_score * 0.20),
        status: "pending", week_start: weekStart,
      });
    }

    // 5. Gradual removal
    const ignoredAny =
      (ignoreCount.get(`${p.menu_item_id}:price`) || 0) +
      (ignoreCount.get(`${p.menu_item_id}:portion`) || 0) +
      (ignoreCount.get(`${p.menu_item_id}:reformulate`) || 0);
    if ((p.true_margin < 0 || p.classification === "hidden-loss") && ignoredAny >= 2 && p.weekly_orders < 30) {
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "remove",
        title: "Begin 4-week removal process",
        reasoning: `${name} has been losing money (${p.true_margin.toFixed(0)}% margin, ${p.weekly_orders} orders/wk) and prior optimization suggestions were ignored ${ignoredAny} times. Phase it out over 4 weeks: reduce visibility week 1–2, remove from menu week 3–4. Loss avoided: ~₹${Math.abs(p.weekly_profit).toLocaleString()}/week.`,
        expected_revenue_impact: -p.weekly_revenue, expected_profit_impact: -p.weekly_profit,
        expected_stress_impact: -Math.round(p.stress_score),
        status: "pending", week_start: weekStart,
      });
    }

    // 6. Seasonal revival
    const removedLongAgo = item.is_active === false && itemUpdatedAt > 0 && (Date.now() - itemUpdatedAt) > EIGHT_WEEKS_MS;
    if (removedLongAgo && p.true_margin > 50) {
      const expectedRev = Math.round(p.weekly_revenue * 0.7);
      const expectedProfit = Math.round(expectedRev * (p.true_margin / 100));
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "revive",
        title: "Consider seasonal re-introduction",
        reasoning: `${name} was a strong performer (${p.true_margin.toFixed(0)}% margin) before being removed. With 8+ weeks off the menu and seasonal demand patterns aligning, re-introducing it could recapture ~₹${expectedRev.toLocaleString()}/week in revenue.`,
        expected_revenue_impact: expectedRev, expected_profit_impact: expectedProfit,
        expected_stress_impact: Math.round(p.stress_score * 0.1),
        status: "pending", week_start: weekStart,
      });
    }

    // 7. Cannibalization resolution
    if (p.cannibalization_score > 40) {
      recs.push({
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "bundle",
        title: "Bundle or differentiate from competing dishes",
        reasoning: `${name} has a cannibalization score of ${p.cannibalization_score.toFixed(0)}%, meaning it competes with similar items on your menu. Consider bundling, repositioning, or removing the lower-performing variant.`,
        expected_revenue_impact: 0,
        expected_profit_impact: Math.round(p.weekly_profit * 0.1),
        expected_stress_impact: -Math.round(p.stress_score * 0.1),
        status: "pending", week_start: weekStart,
      });
    }
  }

  // Sort by absolute profit impact desc, cap to 8, ensure at least 3 if available
  recs.sort((a, b) => Math.abs(b.expected_profit_impact) - Math.abs(a.expected_profit_impact));
  const final = recs.slice(0, 8);
  final.forEach((r, i) => { r.priority = i; });
  return final;
}

async function processRestaurant(supabase: any, restaurantId: string, weekStart: string) {
  // Load profiles + menu items + ignore counts in parallel
  const [profilesRes, outcomesRes, snapshotRes] = await Promise.all([
    supabase.from("dish_profiles").select("*").eq("restaurant_id", restaurantId),
    supabase.from("recommendation_outcomes").select("menu_item_id, recommendation_type, action_taken").eq("restaurant_id", restaurantId).eq("action_taken", "ignored"),
    supabase.from("menu_intelligence_snapshots").select("id").eq("restaurant_id", restaurantId).order("week_start", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const profiles = profilesRes.data || [];
  if (profiles.length === 0) return { restaurant_id: restaurantId, count: 0, skipped: "no-profiles" };

  const ignoreCount = new Map<string, number>();
  for (const o of (outcomesRes.data || [])) {
    const k = `${o.menu_item_id}:${o.recommendation_type}`;
    ignoreCount.set(k, (ignoreCount.get(k) || 0) + 1);
  }

  const menuItemIds = profiles.map((p: any) => p.menu_item_id);
  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("id, name, category, selling_price, food_cost, prep_time_minutes, complexity, is_active, updated_at")
    .in("id", menuItemIds);

  const menuMap = new Map<string, MenuItem>();
  for (const item of (menuItems || [])) menuMap.set(item.id, item as MenuItem);

  const recs = buildRecommendations(
    profiles as DishProfile[], menuMap, restaurantId,
    snapshotRes.data?.id || null, weekStart, ignoreCount,
  );

  // Replace pending recs for this week
  await supabase.from("recommendations").delete()
    .eq("restaurant_id", restaurantId).eq("week_start", weekStart).eq("status", "pending");

  if (recs.length > 0) {
    await supabase.from("recommendations").insert(recs);
  }

  return { restaurant_id: restaurantId, count: recs.length };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth: shared cron secret
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Compute this week's Monday
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    // Fetch all restaurants
    const { data: restaurants, error: rErr } = await supabase.from("restaurants").select("id");
    if (rErr) throw rErr;

    const results: any[] = [];
    for (const r of (restaurants || [])) {
      try {
        results.push(await processRestaurant(supabase, r.id, weekStartStr));
      } catch (err) {
        console.error(`weekly batch failed for ${r.id}:`, err);
        results.push({ restaurant_id: r.id, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ success: true, week_start: weekStartStr, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weekly-recommendations-batch error:", err);
    return new Response(JSON.stringify({ error: "Batch failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
