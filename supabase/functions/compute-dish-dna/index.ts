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

interface SaleRow {
  dish_name: string;
  dish_id: string | null;
  quantity_sold: number;
  selling_price: number;
  order_timestamp: string;
  order_type: string;
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  prep_time_minutes: number;
  station: string;
  complexity: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS_LABEL = (h: number) => `${h.toString().padStart(2, "0")}:00–${(h + 1).toString().padStart(2, "0")}:00`;

// Kitchen Stress Score per spec: 40% prep / 30% volatility / 30% order frequency
function computeStressScore(
  avgPrepMinutes: number,
  prepVarianceRatio: number, // 0..1+ (std-dev / mean)
  ordersPerHour: number,
  peakOrdersPerHour: number
): number {
  const prepComponent = 0.40 * Math.min(avgPrepMinutes / 60, 1);
  const volatilityComponent = 0.30 * Math.min(prepVarianceRatio, 1);
  const freqComponent = 0.30 * (peakOrdersPerHour > 0 ? Math.min(ordersPerHour / peakOrdersPerHour, 1) : 0);
  return Math.min(Math.round((prepComponent + volatilityComponent + freqComponent) * 100), 100);
}

function volatilityLabel(varianceRatio: number): "low" | "medium" | "high" {
  if (varianceRatio < 0.15) return "low";
  if (varianceRatio <= 0.30) return "medium";
  return "high";
}

// Demand pattern label per spec
function detectDemandPattern(byHour: Record<number, number>, byDay: Record<number, number>): string {
  const totalHour = Object.values(byHour).reduce((a, b) => a + b, 0);
  const totalDay = Object.values(byDay).reduce((a, b) => a + b, 0);
  if (totalHour === 0) return "Consistent";

  const lunchOrders = (byHour[12] || 0) + (byHour[13] || 0) + (byHour[14] || 0);
  const dinnerOrders = (byHour[19] || 0) + (byHour[20] || 0) + (byHour[21] || 0);
  const weekendOrders = (byDay[5] || 0) + (byDay[6] || 0) + (byDay[0] || 0); // Fri, Sat, Sun

  const lunchPct = lunchOrders / totalHour;
  const dinnerPct = dinnerOrders / totalHour;
  const weekendPct = totalDay > 0 ? weekendOrders / totalDay : 0;

  if (lunchPct > 0.5 && dinnerPct > 0.5) return "Lunch & Dinner Peak";
  if (lunchPct > 0.5 && dinnerPct > 0.3) return "Lunch & Dinner Peak";
  if (lunchPct > 0.5) return "Lunch Peak";
  if (dinnerPct > 0.5) return "Dinner Peak";
  if (weekendPct > 0.6) return "Weekend Heavy";
  return "Consistent";
}

// Cannibalization per spec: co-occurrence × category similarity × price similarity
function computeCannibalization(
  dishMeta: Map<string, { timestamps: Date[]; category: string; price: number; menuItemId: string }>,
  dishName: string,
  dishCategory: string,
  dishPrice: number
): { score: number; competing: { dishId: string; dishName: string; score: number }[] } {
  const me = dishMeta.get(dishName);
  if (!me || me.timestamps.length < 5) return { score: 0, competing: [] };

  const competing: { dishId: string; dishName: string; score: number }[] = [];

  for (const [otherName, other] of dishMeta.entries()) {
    if (otherName === dishName) continue;
    if (other.timestamps.length < 5) continue;

    // Co-occurrence rate: orders within 30min window / my total orders
    let overlaps = 0;
    for (const ts of me.timestamps) {
      for (const ots of other.timestamps) {
        if (Math.abs(ts.getTime() - ots.getTime()) < 30 * 60 * 1000) {
          overlaps++;
          break;
        }
      }
    }
    const coOccurrence = overlaps / me.timestamps.length; // 0..1
    const categorySimilarity = other.category === dishCategory ? 1 : 0.2;
    const maxPrice = Math.max(dishPrice, other.price, 1);
    const priceSimilarity = 1 - Math.abs(dishPrice - other.price) / maxPrice; // 0..1

    const score = coOccurrence * categorySimilarity * priceSimilarity; // 0..1
    if (score > 0.3) {
      competing.push({ dishId: other.menuItemId, dishName: otherName, score: Math.round(score * 100) / 100 });
    }
  }

  competing.sort((a, b) => b.score - a.score);
  const topScore = competing.length > 0 ? competing[0].score : 0;
  // Persist as 0..100 to keep parity with existing UI consumers
  return { score: Math.round(topScore * 100), competing: competing.slice(0, 3) };
}

function classify(
  margin: number,
  stressScore: number,
  weeklyOrders: number,
  avgMenuMargin: number,
  avgMenuOrders: number
): string {
  const highMargin = margin >= avgMenuMargin;
  const highVolume = weeklyOrders >= avgMenuOrders * 0.5;

  if (margin < 40) return "hidden-loss";
  if (stressScore >= 60) return "kitchen-disruptor";
  if (highMargin && highVolume) return "high-profit";
  return "low-impact-filler";
}

function computeRiskFlags(
  margin: number,
  stressScore: number,
  demandTrend: string,
  cannibalizationScore: number,
  avgMargin: number
): string[] {
  const flags: string[] = [];
  if (margin < avgMargin * 0.75) flags.push("profit_risk");
  if (stressScore >= 55) flags.push("stress_risk");
  if (demandTrend === "declining") flags.push("demand_risk");
  if (cannibalizationScore >= 40) flags.push("cannibalization_risk");
  return flags;
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

    // Fetch menu items
    const { data: menuItems, error: menuErr } = await supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true);

    if (menuErr) throw menuErr;
    if (!menuItems || menuItems.length === 0) {
      return new Response(JSON.stringify({ error: "No menu items found. Complete onboarding first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 4 weeks of sales
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const now = new Date();

    const { data: sales, error: salesErr } = await supabase
      .from("sales_transactions")
      .select("dish_name, dish_id, quantity_sold, selling_price, order_timestamp, order_type")
      .eq("restaurant_id", restaurantId)
      .gte("order_timestamp", fourWeeksAgo.toISOString())
      .lte("order_timestamp", now.toISOString());

    if (salesErr) throw salesErr;

    // Build per-dish sales aggregation
    const dishSalesMap = new Map<string, SaleRow[]>();
    const dishMeta = new Map<string, { timestamps: Date[]; category: string; price: number; menuItemId: string }>();

    for (const sale of (sales || [])) {
      const name = sale.dish_name;
      if (!dishSalesMap.has(name)) dishSalesMap.set(name, []);
      dishSalesMap.get(name)!.push(sale as SaleRow);
    }

    const totalMenuOrders = (sales || []).reduce((sum, s) => sum + (s.quantity_sold || 1), 0);
    const WEEKS = 4;

    const profiles: any[] = [];

    let marginSum = 0;
    let orderSum = 0;
    const menuItemMetrics: { item: MenuItem; margin: number; orders: number }[] = [];

    for (const item of menuItems as MenuItem[]) {
      const itemSales = dishSalesMap.get(item.name) || [];
      const totalQty = itemSales.reduce((s, r) => s + (r.quantity_sold || 1), 0);
      const margin = item.selling_price > 0 ? ((item.selling_price - item.food_cost) / item.selling_price) * 100 : 0;
      marginSum += margin;
      orderSum += totalQty / WEEKS;
      menuItemMetrics.push({ item, margin, orders: totalQty / WEEKS });

      dishMeta.set(item.name, {
        timestamps: itemSales.map((s) => new Date(s.order_timestamp)),
        category: item.category,
        price: item.selling_price,
        menuItemId: item.id,
      });
    }

    const avgMargin = menuItems.length > 0 ? marginSum / menuItems.length : 50;
    const avgOrders = menuItems.length > 0 ? orderSum / menuItems.length : 50;

    // Peak orders-per-hour across full menu (for stress normalization)
    const menuHourBuckets: Record<string, number> = {};
    for (const s of (sales || [])) {
      const dt = new Date(s.order_timestamp);
      const k = `${dt.toISOString().slice(0, 10)}|${dt.getHours()}`;
      menuHourBuckets[k] = (menuHourBuckets[k] || 0) + (s.quantity_sold || 1);
    }
    const peakOrdersPerHourMenu = Math.max(1, ...Object.values(menuHourBuckets));
    const observedHours = Math.max(WEEKS * 7 * 12, 1); // ~12 service hrs/day

    for (const { item } of menuItemMetrics) {
      const itemSales = dishSalesMap.get(item.name) || [];
      const totalQty = itemSales.reduce((s, r) => s + (r.quantity_sold || 1), 0);
      const weeklyOrders = Math.round(totalQty / WEEKS);

      // --- PROFIT DNA (per spec) ---
      const profitMargin = item.selling_price > 0
        ? ((item.selling_price - item.food_cost) / item.selling_price) * 100
        : 0;
      const weeklyProfit = Math.round((item.selling_price - item.food_cost) * weeklyOrders);
      const weeklyRevenue = Math.round(item.selling_price * weeklyOrders);
      const profitContribution = weeklyProfit;

      // --- PREP TIME VOLATILITY (std-dev / mean) ---
      const dailyOrders = new Map<string, number>();
      for (const s of itemSales) {
        const day = new Date(s.order_timestamp).toISOString().slice(0, 10);
        dailyOrders.set(day, (dailyOrders.get(day) || 0) + (s.quantity_sold || 1));
      }
      const dailyCounts = Array.from(dailyOrders.values());
      const avgDaily = dailyCounts.length > 0 ? dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length : 0;
      const variance = dailyCounts.length > 1
        ? dailyCounts.reduce((s, v) => s + Math.pow(v - avgDaily, 2), 0) / dailyCounts.length
        : 0;
      const varianceRatio = avgDaily > 0 ? Math.sqrt(variance) / avgDaily : 0;
      const volatility = Math.round(varianceRatio * 100);
      const volLabel = volatilityLabel(varianceRatio);

      // --- KITCHEN STRESS SCORE (40/30/30 per spec) ---
      const ordersPerHour = totalQty / observedHours;
      const stressScore = computeStressScore(
        item.prep_time_minutes,
        varianceRatio,
        ordersPerHour,
        peakOrdersPerHourMenu / observedHours
      );

      const spikeFreq = dailyCounts.filter((c) => c > avgDaily * 2).length;

      // Demand trend
      const midpoint = new Date(fourWeeksAgo.getTime() + 14 * 24 * 60 * 60 * 1000);
      const firstHalf = itemSales.filter((s) => new Date(s.order_timestamp) < midpoint)
        .reduce((sum, s) => sum + (s.quantity_sold || 1), 0);
      const secondHalf = itemSales.filter((s) => new Date(s.order_timestamp) >= midpoint)
        .reduce((sum, s) => sum + (s.quantity_sold || 1), 0);
      let demandTrend = "stable";
      if (secondHalf > firstHalf * 1.15) demandTrend = "rising";
      else if (secondHalf < firstHalf * 0.85) demandTrend = "declining";

      // Demand patterns
      const byOrderType: Record<string, number> = { "dine-in": 0, takeaway: 0, delivery: 0 };
      const byHour: Record<number, number> = {};
      const byDay: Record<number, number> = {};
      for (const s of itemSales) {
        const type = s.order_type || "dine-in";
        byOrderType[type] = (byOrderType[type] || 0) + (s.quantity_sold || 1);
        const dt = new Date(s.order_timestamp);
        byHour[dt.getHours()] = (byHour[dt.getHours()] || 0) + (s.quantity_sold || 1);
        byDay[dt.getDay()] = (byDay[dt.getDay()] || 0) + (s.quantity_sold || 1);
      }

      const sortedHours = Object.entries(byHour).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 2);
      const sortedDays = Object.entries(byDay).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 3);
      const peakHours = sortedHours.map(([h]) => HOURS_LABEL(Number(h)));
      const peakDays = sortedDays.map(([d]) => DAYS[Number(d)]);

      const peakOrders = (byHour[12] || 0) + (byHour[13] || 0) + (byHour[19] || 0) + (byHour[20] || 0) + (byHour[21] || 0);
      const peakConcentration = totalQty > 0 ? Math.round((peakOrders / totalQty) * 100) : 0;
      const volumePressure = totalMenuOrders > 0 ? Math.round((totalQty / totalMenuOrders) * 100) : 0;

      const patternLabel = detectDemandPattern(byHour, byDay);

      const totalByType = Object.values(byOrderType).reduce((a, b) => a + b, 0) || 1;
      const orderTypePercent = {
        "dine-in": Math.round((byOrderType["dine-in"] / totalByType) * 100),
        takeaway: Math.round((byOrderType["takeaway"] / totalByType) * 100),
        delivery: Math.round((byOrderType["delivery"] / totalByType) * 100),
      };

      const cannibal = computeCannibalization(dishMeta, item.name, item.category, item.selling_price);
      const cls = classify(profitMargin, stressScore, weeklyOrders, avgMargin, avgOrders);
      const riskFlags = computeRiskFlags(profitMargin, stressScore, demandTrend, cannibal.score, avgMargin);

      profiles.push({
        menu_item_id: item.id,
        restaurant_id: restaurantId,
        true_margin: Math.round(profitMargin * 100) / 100,
        profit_contribution: profitContribution,
        weekly_revenue: weeklyRevenue,
        weekly_profit: weeklyProfit,
        weekly_orders: weeklyOrders,
        stress_score: stressScore,
        peak_hour_concentration: peakConcentration,
        volume_pressure: volumePressure,
        prep_time_volatility: volatility,
        demand_spike_frequency: spikeFreq,
        demand_pattern: {
          label: patternLabel,
          volatility_label: volLabel,
          byOrderType: orderTypePercent,
          peakDays,
          peakHours,
          byHour,
          byDay,
        },
        demand_trend: demandTrend,
        cannibalization_score: cannibal.score,
        competing_dishes: cannibal.competing,
        classification: cls,
        risk_flags: riskFlags,
        analysis_period_start: fourWeeksAgo.toISOString(),
        analysis_period_end: now.toISOString(),
        computed_at: now.toISOString(),
        updated_at: now.toISOString(),
      });
    }

    // Upsert all profiles
    for (const profile of profiles) {
      const { data: existing } = await supabase
        .from("dish_profiles")
        .select("id")
        .eq("menu_item_id", profile.menu_item_id)
        .maybeSingle();

      if (existing) {
        await supabase.from("dish_profiles").update(profile).eq("id", existing.id);
      } else {
        await supabase.from("dish_profiles").insert(profile);
      }
    }

    return new Response(
      JSON.stringify({ success: true, profiles_computed: profiles.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("compute-dish-dna error:", err);
    return new Response(JSON.stringify({ error: "Failed to compute dish profiles" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
