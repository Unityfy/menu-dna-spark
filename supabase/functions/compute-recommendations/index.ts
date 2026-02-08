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
  is_active: boolean;
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

    // 1. Price optimization: low margin, decent demand
    if (p.true_margin < avgMargin * 0.75 && p.weekly_orders > 15) {
      const suggestedIncrease = Math.round(item.selling_price * 0.08);
      const expectedProfitGain = Math.round(suggestedIncrease * p.weekly_orders * 0.7);
      candidates.push({ type: "price", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "price",
        title: `Increase price by ₹${suggestedIncrease}`,
        reasoning: `${name} has a ${p.true_margin.toFixed(0)}% margin — below the menu average of ${avgMargin.toFixed(0)}%. With ${p.weekly_orders} weekly orders, a ₹${suggestedIncrease} increase is unlikely to reduce demand significantly, adding ~₹${expectedProfitGain.toLocaleString()}/week profit.`,
        expected_revenue_impact: Math.round(suggestedIncrease * p.weekly_orders),
        expected_profit_impact: expectedProfitGain,
        expected_stress_impact: 0,
        status: "pending", week_start: weekStart,
      }});
    }

    // 2. Portion size / reformulation
    if (p.true_margin < avgMargin && p.demand_trend === "declining" && item.food_cost > item.selling_price * 0.4) {
      const costSaving = Math.round(item.food_cost * 0.15);
      candidates.push({ type: "reformulate", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "reformulate",
        title: "Reduce portion size or substitute ingredients",
        reasoning: `${name} has declining demand with a ${p.true_margin.toFixed(0)}% margin. Food cost is ${((item.food_cost / item.selling_price) * 100).toFixed(0)}% of selling price. Reformulating could save ~₹${costSaving} per order and improve margin.`,
        expected_revenue_impact: 0,
        expected_profit_impact: Math.round(costSaving * p.weekly_orders),
        expected_stress_impact: Math.round(-p.prep_time_volatility * 0.3),
        status: "pending", week_start: weekStart,
      }});
    }

    // 3. Time-based availability
    if (p.peak_hour_concentration > 55 && p.stress_score > avgStress) {
      candidates.push({ type: "availability", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "availability",
        title: "Restrict to peak hours only",
        reasoning: `${name} has ${p.peak_hour_concentration}% of orders concentrated in peak hours with stress score ${p.stress_score.toFixed(0)}%. Making it available only during peak times reduces kitchen load during off-peak while maintaining revenue.`,
        expected_revenue_impact: Math.round(-p.weekly_revenue * 0.05),
        expected_profit_impact: Math.round(-p.weekly_profit * 0.03),
        expected_stress_impact: Math.round(-p.stress_score * 0.2),
        status: "pending", week_start: weekStart,
      }});
    }

    // 4. Dine-in vs delivery restriction
    if (p.stress_score > 60 && p.prep_time_volatility > 20) {
      candidates.push({ type: "channel", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "channel",
        title: "Restrict to dine-in only",
        reasoning: `${name} has stress score ${p.stress_score.toFixed(0)}% and high prep-time volatility (${p.prep_time_volatility.toFixed(0)}%). Delivery orders create unpredictable timing pressure. Restricting to dine-in reduces kitchen stress.`,
        expected_revenue_impact: Math.round(-p.weekly_revenue * 0.15),
        expected_profit_impact: Math.round(-p.weekly_profit * 0.1),
        expected_stress_impact: Math.round(-p.stress_score * 0.25),
        status: "pending", week_start: weekStart,
      }});
    }

    // 5. Gradual dish removal
    if ((p.classification === "hidden-loss" || p.classification === "low-impact-filler") && p.demand_trend === "declining" && p.weekly_orders < 40) {
      candidates.push({ type: "remove", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "remove",
        title: "Consider removing from menu",
        reasoning: `${name} is classified as ${p.classification} with declining demand (${p.weekly_orders} orders/wk). It contributes only ₹${p.weekly_profit.toLocaleString()} profit. Removing simplifies operations without meaningful revenue loss.`,
        expected_revenue_impact: Math.round(-p.weekly_revenue),
        expected_profit_impact: Math.round(-p.weekly_profit),
        expected_stress_impact: Math.round(-p.stress_score),
        status: "pending", week_start: weekStart,
      }});
    }

    // 6. Seasonal revival / promotion
    if (p.demand_trend === "rising" && p.classification === "high-profit") {
      const potentialGain = Math.round(p.weekly_revenue * 0.15);
      candidates.push({ type: "promote", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "promote",
        title: "Feature as weekly special",
        reasoning: `${name} shows rising demand with strong ${p.true_margin.toFixed(0)}% margins. Featuring it prominently could increase orders by 15–20%, adding ~₹${potentialGain.toLocaleString()} in weekly revenue with minimal stress increase.`,
        expected_revenue_impact: potentialGain,
        expected_profit_impact: Math.round(potentialGain * (p.true_margin / 100)),
        expected_stress_impact: Math.round(p.stress_score * 0.1),
        status: "pending", week_start: weekStart,
      }});
    }

    // 7. Cannibalization resolution
    if (p.cannibalization_score > 40) {
      candidates.push({ type: "bundle", rec: {
        restaurant_id: restaurantId, snapshot_id: snapshotId, menu_item_id: p.menu_item_id,
        dish_name: name, type: "bundle",
        title: "Bundle or differentiate from competing dishes",
        reasoning: `${name} has a cannibalization score of ${p.cannibalization_score.toFixed(0)}%, meaning it competes with similar items on your menu. Consider bundling, repositioning, or removing the lower-performing variant.`,
        expected_revenue_impact: 0,
        expected_profit_impact: Math.round(p.weekly_profit * 0.1),
        expected_stress_impact: Math.round(-p.stress_score * 0.1),
        status: "pending", week_start: weekStart,
      }});
    }

    // --- LEARNING FILTER ---
    // Skip recommendations that the user has ignored 3+ times for this dish+type
    // Suppress recommendation types that have been consistently ineffective (avg score < 0.3 with 3+ data points)
    for (const candidate of candidates) {
      const dishTypeKey = `${p.menu_item_id}:${candidate.type}`;

      // Skip if ignored too many times for this specific dish
      const ignores = learning.ignoreCount.get(dishTypeKey) || 0;
      if (ignores >= 3) continue;

      // Suppress types that are proven ineffective for this restaurant
      const typeStats = learning.typeEffectiveness.get(candidate.type);
      if (typeStats && typeStats.count >= 3 && typeStats.avg < 0.3) continue;

      // Demote (but don't skip) types with poor track record — lower expected impact by 30%
      const ineffective = learning.ineffectiveCount.get(dishTypeKey) || 0;
      if (ineffective >= 2) {
        candidate.rec.expected_profit_impact = Math.round(candidate.rec.expected_profit_impact * 0.7);
        candidate.rec.expected_revenue_impact = Math.round(candidate.rec.expected_revenue_impact * 0.7);
      }

      // Boost types with strong track record (avg effectiveness > 1.0 with 3+ samples)
      if (typeStats && typeStats.count >= 3 && typeStats.avg > 1.0) {
        candidate.rec.expected_profit_impact = Math.round(candidate.rec.expected_profit_impact * 1.2);
        candidate.rec.expected_revenue_impact = Math.round(candidate.rec.expected_revenue_impact * 1.2);
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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
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
      .select("id, name, category, selling_price, food_cost, prep_time_minutes, is_active")
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
