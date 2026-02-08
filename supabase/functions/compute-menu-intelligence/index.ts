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
}

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

function computeHealthScore(profiles: DishProfile[]): number {
  if (profiles.length === 0) return 0;

  const avgMargin = profiles.reduce((s, p) => s + (p.true_margin || 0), 0) / profiles.length;
  const avgStress = profiles.reduce((s, p) => s + (p.stress_score || 0), 0) / profiles.length;
  const highProfitRatio = profiles.filter((p) => p.classification === "high-profit").length / profiles.length;
  const hiddenLossRatio = profiles.filter((p) => p.classification === "hidden-loss").length / profiles.length;
  const disruptorRatio = profiles.filter((p) => p.classification === "kitchen-disruptor").length / profiles.length;

  // Health = weighted blend: margin health + low stress + good classification mix
  const marginScore = Math.min(avgMargin / 80, 1) * 35; // 0-35
  const stressScore = Math.max(1 - avgStress / 100, 0) * 25; // 0-25
  const classScore = highProfitRatio * 25; // 0-25
  const penaltyScore = (hiddenLossRatio + disruptorRatio) * 15; // 0-15 penalty

  return Math.round(Math.min(Math.max(marginScore + stressScore + classScore - penaltyScore, 0), 100));
}

function buildDishSummary(profile: DishProfile, menuMap: Map<string, MenuItem>) {
  const item = menuMap.get(profile.menu_item_id);
  return {
    menu_item_id: profile.menu_item_id,
    name: item?.name || "Unknown",
    category: item?.category || "Uncategorized",
    weekly_profit: profile.weekly_profit || 0,
    weekly_revenue: profile.weekly_revenue || 0,
    true_margin: profile.true_margin || 0,
    stress_score: profile.stress_score || 0,
    classification: profile.classification,
    weekly_orders: profile.weekly_orders || 0,
  };
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

    // Fetch dish profiles
    const { data: profiles, error: profErr } = await supabase
      .from("dish_profiles")
      .select("*")
      .eq("restaurant_id", restaurantId);

    if (profErr) throw profErr;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ error: "No dish profiles found. Run Dish DNA computation first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch menu items for names
    const menuItemIds = profiles.map((p) => p.menu_item_id);
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, category")
      .in("id", menuItemIds);

    const menuMap = new Map<string, MenuItem>();
    for (const item of (menuItems || [])) {
      menuMap.set(item.id, item as MenuItem);
    }

    const typedProfiles = profiles as DishProfile[];

    // Compute aggregates
    const healthScore = computeHealthScore(typedProfiles);
    const totalRevenue = typedProfiles.reduce((s, p) => s + (p.weekly_revenue || 0), 0);
    const totalProfit = typedProfiles.reduce((s, p) => s + (p.weekly_profit || 0), 0);
    const avgMargin = typedProfiles.length > 0
      ? typedProfiles.reduce((s, p) => s + (p.true_margin || 0), 0) / typedProfiles.length : 0;
    const avgStress = typedProfiles.length > 0
      ? typedProfiles.reduce((s, p) => s + (p.stress_score || 0), 0) / typedProfiles.length : 0;

    // Classify lists
    const topProfit = [...typedProfiles].sort((a, b) => (b.weekly_profit || 0) - (a.weekly_profit || 0))
      .slice(0, 5).map((p) => buildDishSummary(p, menuMap));

    const hiddenLoss = typedProfiles.filter((p) => p.classification === "hidden-loss")
      .map((p) => buildDishSummary(p, menuMap));

    const highestStress = [...typedProfiles].sort((a, b) => (b.stress_score || 0) - (a.stress_score || 0))
      .slice(0, 5).map((p) => buildDishSummary(p, menuMap));

    const lowImpact = typedProfiles.filter((p) => p.classification === "low-impact-filler")
      .map((p) => buildDishSummary(p, menuMap));

    // Classification breakdown
    const classBreakdown: Record<string, number> = {};
    for (const p of typedProfiles) {
      classBreakdown[p.classification] = (classBreakdown[p.classification] || 0) + 1;
    }

    // Risk summary
    const riskSummary: Record<string, number> = { profit_risk: 0, stress_risk: 0, demand_risk: 0, cannibalization_risk: 0 };
    for (const p of typedProfiles) {
      const flags = (p.risk_flags || []) as string[];
      for (const f of flags) {
        riskSummary[f] = (riskSummary[f] || 0) + 1;
      }
    }

    // Week boundaries (current week Mon-Sun)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const weekEndStr = weekEnd.toISOString().slice(0, 10);

    // Get previous snapshot for delta
    const { data: prevSnapshot } = await supabase
      .from("menu_intelligence_snapshots")
      .select("health_score")
      .eq("restaurant_id", restaurantId)
      .lt("week_start", weekStartStr)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    const healthDelta = prevSnapshot ? Math.round(healthScore - (prevSnapshot.health_score || 0)) : 0;

    const snapshot = {
      restaurant_id: restaurantId,
      week_start: weekStartStr,
      week_end: weekEndStr,
      health_score: healthScore,
      health_delta: healthDelta,
      total_revenue: Math.round(totalRevenue),
      total_profit: Math.round(totalProfit),
      avg_margin: Math.round(avgMargin * 100) / 100,
      avg_stress: Math.round(avgStress * 100) / 100,
      total_dishes: typedProfiles.length,
      top_profit_contributors: topProfit,
      hidden_loss_makers: hiddenLoss,
      highest_stress_contributors: highestStress,
      low_impact_items: lowImpact,
      classification_breakdown: classBreakdown,
      risk_summary: riskSummary,
      computed_at: now.toISOString(),
    };

    // Upsert snapshot (unique on restaurant_id + week_start)
    const { data: existing } = await supabase
      .from("menu_intelligence_snapshots")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("week_start", weekStartStr)
      .maybeSingle();

    if (existing) {
      await supabase.from("menu_intelligence_snapshots").update(snapshot).eq("id", existing.id);
    } else {
      await supabase.from("menu_intelligence_snapshots").insert(snapshot);
    }

    return new Response(JSON.stringify({ success: true, snapshot }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compute-menu-intelligence error:", err);
    return new Response(JSON.stringify({ error: "Failed to compute menu intelligence" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
