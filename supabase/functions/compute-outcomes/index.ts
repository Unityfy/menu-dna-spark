// Measure actual vs. predicted outcomes for approved & implemented recommendations.
// Trigger window: implemented_at + 2 weeks elapsed.
// For each ready row, compares 2 weeks BEFORE implementation to 2 weeks AFTER, using
// sales_aggregates_weekly + the dish's current cost/stress profile, and writes:
//   actual_revenue_impact, actual_profit_impact, actual_stress_impact
//   prediction_accuracy_revenue, prediction_accuracy_profit, prediction_accuracy_stress
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

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

// Accuracy in [0..1]: 1 means actual matched the predicted sign and magnitude;
// 0 means the prediction was directionally wrong or off by 100%+.
function predictionAccuracy(predicted: number, actual: number): number {
  if (predicted === 0 && actual === 0) return 1;
  if (predicted === 0) return 0; // we predicted no change, but reality moved
  // Direction check
  const sameDirection = (predicted >= 0) === (actual >= 0);
  if (!sameDirection) return 0;
  // Magnitude closeness — bounded so a 2x miss still scores something
  const ratio = Math.abs(actual) / Math.abs(predicted);
  const magnitudeScore = ratio <= 1
    ? ratio                            // under-shot: linear up to 1
    : Math.max(0, 2 - ratio);          // over-shot: 1 at parity, 0 at 2x+
  return Math.round(magnitudeScore * 100) / 100;
}

// Sum revenue/quantity for a dish across weekly aggregates whose week_start falls
// within [from, to). Returns avg weekly revenue.
async function avgWeeklyRevenue(
  supabase: any, restaurantId: string, dishName: string, from: Date, to: Date
): Promise<{ avgRevenue: number; avgQuantity: number; weeks: number }> {
  const { data } = await supabase
    .from("sales_aggregates_weekly")
    .select("total_revenue, total_quantity, week_start")
    .eq("restaurant_id", restaurantId)
    .eq("dish_name_normalized", dishName.trim().toLowerCase())
    .gte("week_start", from.toISOString().slice(0, 10))
    .lt("week_start", to.toISOString().slice(0, 10));

  const rows = data || [];
  if (rows.length === 0) return { avgRevenue: 0, avgQuantity: 0, weeks: 0 };
  const totalRev = rows.reduce((s: number, r: any) => s + Number(r.total_revenue || 0), 0);
  const totalQty = rows.reduce((s: number, r: any) => s + Number(r.total_quantity || 0), 0);
  return { avgRevenue: totalRev / rows.length, avgQuantity: totalQty / rows.length, weeks: rows.length };
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const anonClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
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

    // Find outcomes that haven't been measured yet (the action_at row from approval).
    // We then look up the implemented_at timestamp via recommendation_feedback to drive the 2-week window.
    const { data: pendingOutcomes, error: fetchErr } = await supabase
      .from("recommendation_outcomes")
      .select("*, recommendations(expected_revenue_impact, expected_profit_impact, expected_stress_impact, dish_name)")
      .eq("restaurant_id", restaurantId)
      .eq("action_taken", "approved")
      .is("measured_at", null);

    if (fetchErr) throw fetchErr;
    if (!pendingOutcomes || pendingOutcomes.length === 0) {
      return new Response(JSON.stringify({ success: true, measured: 0, message: "No pending outcomes to measure" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let measured = 0;
    const skipped: any[] = [];

    for (const outcome of pendingOutcomes) {
      // Find the implementation timestamp from feedback (latest "approved" row for this rec)
      const { data: feedback } = await supabase
        .from("recommendation_feedback")
        .select("implemented_at")
        .eq("recommendation_id", outcome.recommendation_id)
        .eq("decision", "approved")
        .not("implemented_at", "is", null)
        .order("implemented_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!feedback?.implemented_at) {
        skipped.push({ id: outcome.id, reason: "not_implemented" });
        continue;
      }

      const implementedAt = new Date(feedback.implemented_at);
      const measureAt = new Date(implementedAt.getTime() + TWO_WEEKS_MS);
      if (now < measureAt) {
        skipped.push({ id: outcome.id, reason: "window_not_elapsed" });
        continue;
      }

      // Windows
      const beforeStart = new Date(implementedAt.getTime() - TWO_WEEKS_MS);
      const beforeEnd = implementedAt;
      const afterStart = implementedAt;
      const afterEnd = measureAt;

      const rec = outcome.recommendations as any;
      const dishName = rec?.dish_name;
      if (!dishName) {
        skipped.push({ id: outcome.id, reason: "missing_dish_name" });
        continue;
      }

      // 2-week BEFORE and AFTER avg weekly revenue/quantity from sales aggregates
      const [before, after] = await Promise.all([
        avgWeeklyRevenue(supabase, restaurantId, dishName, beforeStart, beforeEnd),
        avgWeeklyRevenue(supabase, restaurantId, dishName, afterStart, afterEnd),
      ]);

      // Pull current menu item to compute profit (selling_price - food_cost) * quantity
      const { data: menuItem } = await supabase
        .from("menu_items")
        .select("selling_price, food_cost")
        .eq("id", outcome.menu_item_id)
        .maybeSingle();

      const unitProfit = menuItem
        ? Number(menuItem.selling_price || 0) - Number(menuItem.food_cost || 0)
        : 0;
      const beforeProfit = before.avgQuantity * unitProfit;
      const afterProfit = after.avgQuantity * unitProfit;

      // Stress: use baseline (captured at approval) vs current dish profile
      const { data: currentProfile } = await supabase
        .from("dish_profiles")
        .select("stress_score, weekly_revenue, weekly_profit")
        .eq("menu_item_id", outcome.menu_item_id)
        .maybeSingle();

      const currentStress = Number(currentProfile?.stress_score || 0);
      const baselineStress = Number(outcome.baseline_stress || 0);

      const actualRevenueImpact = Math.round(after.avgRevenue - before.avgRevenue);
      const actualProfitImpact = Math.round(afterProfit - beforeProfit);
      const actualStressImpact = Math.round(currentStress - baselineStress);

      // Predicted vs actual accuracy
      const predictedRevenue = Number(rec?.expected_revenue_impact || 0);
      const predictedProfit = Number(rec?.expected_profit_impact || 0);
      const predictedStress = Number(rec?.expected_stress_impact || 0);

      const accRevenue = predictionAccuracy(predictedRevenue, actualRevenueImpact);
      const accProfit = predictionAccuracy(predictedProfit, actualProfitImpact);
      const accStress = predictionAccuracy(predictedStress, actualStressImpact);

      // Effectiveness score (kept for the learning system) = accuracy on profit
      const effectiveness = accProfit;

      const { error: updateErr } = await supabase
        .from("recommendation_outcomes")
        .update({
          // Spec fields
          actual_revenue_impact: actualRevenueImpact,
          actual_profit_impact: actualProfitImpact,
          actual_stress_impact: actualStressImpact,
          prediction_accuracy_revenue: accRevenue,
          prediction_accuracy_profit: accProfit,
          prediction_accuracy_stress: accStress,
          // Legacy/learning fields kept in sync
          measured_revenue: Math.round(after.avgRevenue),
          measured_profit: Math.round(afterProfit),
          measured_stress: currentStress,
          revenue_delta: actualRevenueImpact,
          profit_delta: actualProfitImpact,
          stress_delta: actualStressImpact,
          effectiveness_score: effectiveness,
          measured_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", outcome.id);

      if (updateErr) {
        console.error("Failed to update outcome:", outcome.id, updateErr);
        continue;
      }
      measured++;
    }

    return new Response(JSON.stringify({ success: true, measured, skipped: skipped.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compute-outcomes error:", err);
    return new Response(JSON.stringify({ error: "Failed to compute outcomes" }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
