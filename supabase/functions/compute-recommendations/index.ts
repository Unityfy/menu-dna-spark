import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
  risk_flags: string[];
  demand_trend: string;
  demand_pattern: any;
  cannibalization_score: number;
  peak_hour_concentration: number;
  prep_time_volatility: number;
  demand_spike_frequency: number;
  volume_pressure: number;
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

interface Recommendation {
  restaurant_id: string;
  snapshot_id: string | null;
  menu_item_id: string;
  dish_name: string;
  type: string;
  title: string;
  reasoning: string;
  expected_revenue_impact: number;
  expected_profit_impact: number;
  expected_stress_impact: number;
  status: string;
  week_start: string;
  priority: number;
}

// Learning data: aggregated outcome scores per recommendation type and per dish
interface LearningContext {
  // Average effectiveness per recommendation type for this restaurant
  typeEffectiveness: Map<string, { avg: number; count: number }>;
  // Number of times a dish+type combo was ignored
  ignoreCount: Map<string, number>;
  // Number of times a dish+type combo was approved but ineffective (score < 0.3)
  ineffectiveCount: Map<string, number>;
  // Per-type learning parameters from the weekly learning job
  params: Map<string, {
    suppressed: boolean;
    threshold_multiplier: number;
    impact_revenue: number;
    impact_profit: number;
  }>;
}

function generateRecommendations(
  profiles: DishProfile[],
  menuMap: Map<string, MenuItem>,
  restaurantId: string,
  snapshotId: string | null,
  weekStart: string,
  learning: LearningContext
): Recommendation[] {
  const recs: Recommendation[] = [];
  const avgMargin = profiles.reduce((s, p) => s + (p.true_margin || 0), 0) / profiles.length;
  const avgStress = profiles.reduce((s, p) => s + (p.stress_score || 0), 0) / profiles.length;
  let priority = 0;

  for (const p of profiles) {
    const item = menuMap.get(p.menu_item_id);
    if (!item) continue;
    const name = item.name;

    const candidates: { type: string; rec: Omit<Recommendation, "priority"> }[] = [];

    const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;
    const itemUpdatedAt = item.updated_at ? new Date(item.updated_at).getTime() : 0;
    const noRecentPriceChange = itemUpdatedAt > 0 && (Date.now() - itemUpdatedAt) > FOUR_WEEKS_MS;

    // 1. PRICE OPTIMIZATION
    //    margin > 55% AND stress < 50 AND weekly_orders > 100 AND no price change in last 4 weeks
    if (
      p.true_margin > 55 &&
      p.stress_score < 50 &&
      p.weekly_orders > 100 &&
      noRecentPriceChange
    ) {
      const increase = Math.max(1, Math.round(item.selling_price * 0.10));
      const expectedRevenueGain = increase * p.weekly_orders;
      // Assume ~10% price elasticity drag, keep ~90% of incremental revenue as profit
      const expectedProfitGain = Math.round(expectedRevenueGain * 0.9);
      candidates.push({ type: "price", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "price",
        title: `Increase price by ₹${increase}`,
        reasoning: `${name} runs at a ${p.true_margin.toFixed(0)}% margin with low kitchen stress (${p.stress_score.toFixed(0)}/100) and strong weekly demand (${p.weekly_orders} orders). Price has been stable for 4+ weeks — a ₹${increase} (10%) increase should add ~₹${expectedProfitGain.toLocaleString()}/week with minimal demand impact.`,
        expected_revenue_impact: expectedRevenueGain,
        expected_profit_impact: expectedProfitGain,
        expected_stress_impact: 0,
        status: "pending", week_start: weekStart,
      }});
    }

    // 2. PORTION SIZE ADJUSTMENT
    //    margin < 20% AND stress > 60
    if (p.true_margin < 20 && p.stress_score > 60) {
      const reductionPct = 15;
      const costSavingPerOrder = Math.round(item.food_cost * (reductionPct / 100));
      const expectedProfitGain = costSavingPerOrder * p.weekly_orders;
      candidates.push({ type: "portion", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "portion",
        title: `Reduce portion by ${reductionPct}%`,
        reasoning: `${name} is squeezed on both sides — margin is only ${p.true_margin.toFixed(0)}% and kitchen stress is ${p.stress_score.toFixed(0)}/100. Trimming portion by ${reductionPct}% saves ~₹${costSavingPerOrder}/order (~₹${expectedProfitGain.toLocaleString()}/week) and lightens prep load.`,
        expected_revenue_impact: 0,
        expected_profit_impact: expectedProfitGain,
        expected_stress_impact: -Math.round(p.stress_score * 0.15),
        status: "pending", week_start: weekStart,
      }});
    }

    // 3. TIME-BASED AVAILABILITY
    //    Stress during specific period > 80 AND <30% of orders occur in that period
    {
      const pattern: any = (p as any).demand_pattern || {};
      const byHour: Record<number, number> = pattern.byHour || {};
      const lunch = (byHour[12] || 0) + (byHour[13] || 0) + (byHour[14] || 0);
      const dinner = (byHour[19] || 0) + (byHour[20] || 0) + (byHour[21] || 0);
      const total = Object.values(byHour).reduce((a: number, b: number) => a + b, 0) || 1;
      // Use overall stress as proxy for per-window stress when specific window dominates kitchen load
      const windowStress = p.stress_score;

      let removeWindow: "lunch" | "dinner" | null = null;
      if (windowStress > 80 && lunch / total < 0.30 && lunch > 0) removeWindow = "lunch";
      else if (windowStress > 80 && dinner / total < 0.30 && dinner > 0) removeWindow = "dinner";

      if (removeWindow) {
        const lostOrders = removeWindow === "lunch" ? lunch : dinner;
        const lostRevenue = Math.round((lostOrders / total) * p.weekly_revenue);
        const lostProfit = Math.round((lostOrders / total) * p.weekly_profit);
        candidates.push({ type: "availability", rec: {
          restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
          dish_name: name, type: "availability",
          title: `Remove from ${removeWindow} menu`,
          reasoning: `${name} drives heavy kitchen stress (${windowStress.toFixed(0)}/100) but only ${Math.round((lostOrders / total) * 100)}% of its orders happen at ${removeWindow}. Removing it from the ${removeWindow} menu cuts pressure during a low-payoff window with only ~₹${lostRevenue.toLocaleString()} revenue at stake.`,
          expected_revenue_impact: -lostRevenue,
          expected_profit_impact: -lostProfit,
          expected_stress_impact: -Math.round(p.stress_score * 0.25),
          status: "pending", week_start: weekStart,
        }});
      }
    }

    // 4. CHANNEL RESTRICTION (dine-in only)
    //    High prep complexity AND delivery share is large enough to risk quality complaints
    //    Proxy: complexity = "high" AND delivery share > 25% (we don't have ratings yet)
    {
      const pattern: any = (p as any).demand_pattern || {};
      const byOrderType = pattern.byOrderType || {};
      const deliveryPct = byOrderType.delivery || 0;
      const isComplex = (item.complexity || "medium") === "high" || item.prep_time_minutes >= 20;

      if (isComplex && deliveryPct >= 25) {
        const lostRevenue = Math.round((deliveryPct / 100) * p.weekly_revenue);
        candidates.push({ type: "channel", rec: {
          restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
          dish_name: name, type: "channel",
          title: "Restrict to dine-in only",
          reasoning: `${name} is a high-complexity dish (prep ${item.prep_time_minutes} min) and ${deliveryPct}% of its orders go through delivery — where travel time degrades quality and drives complaints. Restricting to dine-in protects brand quality at the cost of ~₹${lostRevenue.toLocaleString()}/week in delivery revenue.`,
          expected_revenue_impact: -lostRevenue,
          expected_profit_impact: -Math.round((deliveryPct / 100) * p.weekly_profit),
          expected_stress_impact: -Math.round(p.stress_score * 0.20),
          status: "pending", week_start: weekStart,
        }});
      }
    }

    // 5. GRADUAL REMOVAL
    //    Persistent negative margin (proxy: classification = hidden-loss for this period)
    //    AND multiple ignored optimization recs AND weekly orders < 30
    {
      const ignoredAny =
        (learning.ignoreCount.get(`${p.menu_item_id}:price`) || 0) +
        (learning.ignoreCount.get(`${p.menu_item_id}:portion`) || 0) +
        (learning.ignoreCount.get(`${p.menu_item_id}:reformulate`) || 0);

      if (
        (p.true_margin < 0 || p.classification === "hidden-loss") &&
        ignoredAny >= 2 &&
        p.weekly_orders < 30
      ) {
        candidates.push({ type: "remove", rec: {
          restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
          dish_name: name, type: "remove",
          title: "Begin 4-week removal process",
          reasoning: `${name} has been losing money (${p.true_margin.toFixed(0)}% margin, ${p.weekly_orders} orders/wk) and prior optimization suggestions were ignored ${ignoredAny} times. Phase it out over 4 weeks: reduce visibility week 1–2, remove from menu week 3–4. Loss avoided: ~₹${Math.abs(p.weekly_profit).toLocaleString()}/week.`,
          expected_revenue_impact: -p.weekly_revenue,
          expected_profit_impact: -p.weekly_profit, // removing a loss = positive on bottom line if profit was negative
          expected_stress_impact: -Math.round(p.stress_score),
          status: "pending", week_start: weekStart,
        }});
      }
    }

    // 6. SEASONAL REVIVAL
    //    Previously high-performing (margin > 50) AND removed > 8 weeks ago
    //    Proxy: is_active = false AND updated_at > 8 weeks ago AND historical margin > 50
    {
      const EIGHT_WEEKS_MS = 56 * 24 * 60 * 60 * 1000;
      const removedLongAgo =
        item.is_active === false &&
        itemUpdatedAt > 0 &&
        (Date.now() - itemUpdatedAt) > EIGHT_WEEKS_MS;
      const wasHighPerformer = p.true_margin > 50;

      if (removedLongAgo && wasHighPerformer) {
        const expectedRevenue = Math.round(p.weekly_revenue * 0.7);
        const expectedProfit = Math.round(expectedRevenue * (p.true_margin / 100));
        candidates.push({ type: "revive", rec: {
          restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
          dish_name: name, type: "revive",
          title: "Consider seasonal re-introduction",
          reasoning: `${name} was a strong performer (${p.true_margin.toFixed(0)}% margin) before being removed. With 8+ weeks off the menu and seasonal demand patterns aligning, re-introducing it could recapture ~₹${expectedRevenue.toLocaleString()}/week in revenue.`,
          expected_revenue_impact: expectedRevenue,
          expected_profit_impact: expectedProfit,
          expected_stress_impact: Math.round(p.stress_score * 0.1),
          status: "pending", week_start: weekStart,
        }});
      }
    }

    // 7. CANNIBALIZATION RESOLUTION (kept from prior logic)
    if (p.cannibalization_score > 40) {
      candidates.push({ type: "bundle", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "bundle",
        title: "Bundle or differentiate from competing dishes",
        reasoning: `${name} has a cannibalization score of ${p.cannibalization_score.toFixed(0)}%, meaning it competes with similar items on your menu. Consider bundling, repositioning, or removing the lower-performing variant.`,
        expected_revenue_impact: 0,
        expected_profit_impact: Math.round(p.weekly_profit * 0.1),
        expected_stress_impact: -Math.round(p.stress_score * 0.1),
        status: "pending", week_start: weekStart,
      }});
    }

    // --- LEARNING FILTER ---
    // Apply both outcome-based learning AND weekly learning_parameters refinements.
    for (const candidate of candidates) {
      const dishTypeKey = `${p.menu_item_id}:${candidate.type}`;
      const lp = learning.params.get(candidate.type);

      // 1. Hard suppress if weekly learning job marked this type suppressed (<30% approval over 8+ weeks)
      if (lp?.suppressed) continue;

      // 2. Skip if ignored too many times for this specific dish
      const ignores = learning.ignoreCount.get(dishTypeKey) || 0;
      if (ignores >= 3) continue;

      // 3. Suppress types that are proven ineffective for this restaurant
      const typeStats = learning.typeEffectiveness.get(candidate.type);
      if (typeStats && typeStats.count >= 3 && typeStats.avg < 0.3) continue;

      // 4. Threshold gating: types with low approval need stronger signals to fire.
      //    We approximate this by gating on the magnitude of the candidate's expected profit impact
      //    relative to the dish's weekly profit, scaled by the type's threshold multiplier.
      const thresholdMult = lp?.threshold_multiplier ?? 1.0;
      if (thresholdMult > 1.0) {
        const baseline = Math.max(1, Math.abs(p.weekly_profit) * 0.05); // 5% of weekly profit
        const required = baseline * thresholdMult;
        if (Math.abs(candidate.rec.expected_profit_impact) < required) continue;
      }

      // 5. Demote (but don't skip) dish+types with poor track record — lower expected impact by 30%
      const ineffective = learning.ineffectiveCount.get(dishTypeKey) || 0;
      if (ineffective >= 2) {
        candidate.rec.expected_profit_impact = Math.round(candidate.rec.expected_profit_impact * 0.7);
        candidate.rec.expected_revenue_impact = Math.round(candidate.rec.expected_revenue_impact * 0.7);
      }

      // 6. Boost types with strong track record (avg effectiveness > 1.0 with 3+ samples)
      if (typeStats && typeStats.count >= 3 && typeStats.avg > 1.0) {
        candidate.rec.expected_profit_impact = Math.round(candidate.rec.expected_profit_impact * 1.2);
        candidate.rec.expected_revenue_impact = Math.round(candidate.rec.expected_revenue_impact * 1.2);
      }

      // 7. Apply learned impact adjustments (predictions calibrated against actuals)
      if (lp) {
        candidate.rec.expected_revenue_impact = Math.round(candidate.rec.expected_revenue_impact * lp.impact_revenue);
        candidate.rec.expected_profit_impact = Math.round(candidate.rec.expected_profit_impact * lp.impact_profit);
      }

      recs.push({ ...candidate.rec, priority: priority++ });
    }
  }

  // Sort by expected profit impact descending
  recs.sort((a, b) => Math.abs(b.expected_profit_impact) - Math.abs(a.expected_profit_impact));
  recs.forEach((r, i) => { r.priority = i; });

  return recs;
}

async function buildLearningContext(
  supabase: any,
  restaurantId: string
): Promise<LearningContext> {
  const typeEffectiveness = new Map<string, { avg: number; count: number }>();
  const ignoreCount = new Map<string, number>();
  const ineffectiveCount = new Map<string, number>();

  // Fetch all measured outcomes for this restaurant
  const { data: outcomes } = await supabase
    .from("recommendation_outcomes")
    .select("menu_item_id, recommendation_type, action_taken, effectiveness_score")
    .eq("restaurant_id", restaurantId);

  if (!outcomes) return { typeEffectiveness, ignoreCount, ineffectiveCount };

  // Aggregate type-level effectiveness (only from measured outcomes)
  const typeAgg = new Map<string, number[]>();

  for (const o of outcomes) {
    const dishTypeKey = `${o.menu_item_id}:${o.recommendation_type}`;

    if (o.action_taken === "ignored") {
      ignoreCount.set(dishTypeKey, (ignoreCount.get(dishTypeKey) || 0) + 1);
    }

    if (o.effectiveness_score !== null) {
      if (!typeAgg.has(o.recommendation_type)) typeAgg.set(o.recommendation_type, []);
      typeAgg.get(o.recommendation_type)!.push(o.effectiveness_score);

      if (o.effectiveness_score < 0.3 && o.action_taken === "approved") {
        ineffectiveCount.set(dishTypeKey, (ineffectiveCount.get(dishTypeKey) || 0) + 1);
      }
    }
  }

  for (const [type, scores] of typeAgg) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    typeEffectiveness.set(type, { avg, count: scores.length });
  }

  return { typeEffectiveness, ignoreCount, ineffectiveCount };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: restaurantId } = await supabase.rpc("get_user_restaurant_id", { _user_id: user.id });
    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "No restaurant found" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch dish profiles and menu items in parallel
    const [profilesRes, learningCtx] = await Promise.all([
      supabase.from("dish_profiles").select("*").eq("restaurant_id", restaurantId),
      buildLearningContext(supabase, restaurantId),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    const profiles = profilesRes.data;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "No dish profiles found. Run Dish DNA computation first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const menuItemIds = profiles.map((p: any) => p.menu_item_id);
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, category, selling_price, food_cost, prep_time_minutes, complexity, is_active, updated_at")
      .in("id", menuItemIds);

    const menuMap = new Map<string, MenuItem>();
    for (const item of (menuItems || [])) {
      menuMap.set(item.id, item as MenuItem);
    }

    // Week boundaries
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const { data: latestSnapshot } = await supabase
      .from("menu_intelligence_snapshots")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const snapshotId = latestSnapshot?.id || null;

    const recs = generateRecommendations(
      profiles as DishProfile[],
      menuMap,
      restaurantId,
      snapshotId,
      weekStartStr,
      learningCtx
    );

    // Delete existing pending recommendations for this week (regenerate)
    await supabase
      .from("recommendations")
      .delete()
      .eq("restaurant_id", restaurantId)
      .eq("week_start", weekStartStr)
      .eq("status", "pending");

    if (recs.length > 0) {
      const { error: insertErr } = await supabase
        .from("recommendations")
        .insert(recs);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, count: recs.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compute-recommendations error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate recommendations" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
