// Weekly learning job: analyzes past 12 weeks of recommendation feedback + outcomes
// and updates per-restaurant, per-type learning_parameters that refine future suggestions.
//
// Scheduled: Sundays 23:00 (configure via pg_cron — see project docs).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin =
    ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : (ALLOWED_ORIGINS[0] || "*");
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-cron-secret",
  };
}

const TWELVE_WEEKS_MS = 12 * 7 * 24 * 60 * 60 * 1000;
const EIGHT_WEEKS_MS = 8 * 7 * 24 * 60 * 60 * 1000;

interface RecRow {
  id: string;
  restaurant_id: string;
  type: string;
  expected_revenue_impact: number;
  expected_profit_impact: number;
  expected_stress_impact: number;
  status: string;
  created_at: string;
}

interface FeedbackRow {
  recommendation_id: string;
  restaurant_id: string;
  decision: string;
  decided_at: string;
}

interface OutcomeRow {
  recommendation_id: string;
  restaurant_id: string;
  recommendation_type: string;
  actual_revenue_impact: number | null;
  actual_profit_impact: number | null;
  actual_stress_impact: number | null;
}

function safeAvg(nums: number[]): number | null {
  const filtered = nums.filter((n) => Number.isFinite(n));
  if (filtered.length === 0) return null;
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

async function processRestaurant(supabase: any, restaurantId: string) {
  const since = new Date(Date.now() - TWELVE_WEEKS_MS).toISOString();
  const eightWeeksAgo = new Date(Date.now() - EIGHT_WEEKS_MS).toISOString();

  // Fetch the past 12 weeks of recommendations, feedback, outcomes for this restaurant
  const [recsRes, feedbackRes, outcomesRes] = await Promise.all([
    supabase
      .from("recommendations")
      .select("id, restaurant_id, type, expected_revenue_impact, expected_profit_impact, expected_stress_impact, status, created_at")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since),
    supabase
      .from("recommendation_feedback")
      .select("recommendation_id, restaurant_id, decision, decided_at")
      .eq("restaurant_id", restaurantId)
      .gte("decided_at", since),
    supabase
      .from("recommendation_outcomes")
      .select("recommendation_id, restaurant_id, recommendation_type, actual_revenue_impact, actual_profit_impact, actual_stress_impact")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since),
  ]);

  const recs: RecRow[] = recsRes.data || [];
  const feedback: FeedbackRow[] = feedbackRes.data || [];
  const outcomes: OutcomeRow[] = outcomesRes.data || [];

  if (recs.length === 0) return { restaurantId, updated: 0 };

  // Index recs by id for join
  const recById = new Map<string, RecRow>();
  for (const r of recs) recById.set(r.id, r);

  // Group feedback by type (via rec lookup)
  const byType = new Map<string, {
    total: number;
    approved: number;
    revenueErrors: number[];
    profitErrors: number[];
    stressErrors: number[];
    earliestDecision: number;
  }>();

  for (const f of feedback) {
    const r = recById.get(f.recommendation_id);
    if (!r) continue;
    const bucket = byType.get(r.type) || {
      total: 0, approved: 0,
      revenueErrors: [], profitErrors: [], stressErrors: [],
      earliestDecision: Date.now(),
    };
    bucket.total += 1;
    if (f.decision === "approved") bucket.approved += 1;
    const ts = new Date(f.decided_at).getTime();
    if (ts < bucket.earliestDecision) bucket.earliestDecision = ts;
    byType.set(r.type, bucket);
  }

  // Compute prediction errors from outcomes (predicted vs actual)
  for (const o of outcomes) {
    const r = recById.get(o.recommendation_id);
    if (!r) continue;
    const bucket = byType.get(o.recommendation_type) || byType.get(r.type);
    if (!bucket) continue;
    if (o.actual_revenue_impact !== null) {
      bucket.revenueErrors.push(Number(o.actual_revenue_impact) - Number(r.expected_revenue_impact));
    }
    if (o.actual_profit_impact !== null) {
      bucket.profitErrors.push(Number(o.actual_profit_impact) - Number(r.expected_profit_impact));
    }
    if (o.actual_stress_impact !== null) {
      bucket.stressErrors.push(Number(o.actual_stress_impact) - Number(r.expected_stress_impact));
    }
  }

  // --- Restaurant-level preference signals (across all types) ---
  let priceApproved = 0, priceTotal = 0;
  let portionApproved = 0, portionTotal = 0;
  let removeApproved = 0, removeTotal = 0;
  for (const [type, b] of byType) {
    if (type === "price") { priceApproved += b.approved; priceTotal += b.total; }
    if (type === "portion" || type === "availability") { portionApproved += b.approved; portionTotal += b.total; }
    if (type === "remove") { removeApproved += b.approved; removeTotal += b.total; }
  }
  const restaurantPreferences = {
    price_sensitivity: priceTotal >= 3
      ? (priceApproved / priceTotal < 0.4 ? "low" : priceApproved / priceTotal > 0.7 ? "high" : "medium")
      : "unknown",
    operational_preference: portionTotal >= 3
      ? (portionApproved / portionTotal > 0.5 ? "willing_to_adjust" : "resistant")
      : "unknown",
    menu_philosophy: removeTotal >= 2
      ? (removeApproved / removeTotal > 0.5 ? "lean" : "preserve_breadth")
      : "unknown",
  };

  // Build upserts
  const upserts = [];
  for (const [type, b] of byType) {
    const approvalRate = b.total > 0 ? b.approved / b.total : 0;
    const weeksSinceFirstDecision = Math.max(
      1,
      Math.round((Date.now() - b.earliestDecision) / (7 * 24 * 60 * 60 * 1000))
    );

    // Suppress / raise threshold: <30% approval over 8+ weeks
    const suppressed = approvalRate < 0.3 && b.earliestDecision <= Date.parse(eightWeeksAgo) && b.total >= 3;
    const generation_threshold_multiplier = suppressed
      ? 1.5
      : approvalRate < 0.3
      ? 1.2
      : approvalRate > 0.7
      ? 0.85
      : 1.0;

    const avgRevErr = safeAvg(b.revenueErrors);
    const avgProfitErr = safeAvg(b.profitErrors);
    const avgStressErr = safeAvg(b.stressErrors);

    // Impact adjustment: if predictions consistently overshoot, dampen them
    // adjustment = avg(actual / predicted) clamped to [0.3, 1.7]
    const ratio = (errors: number[], predictedField: "expected_revenue_impact" | "expected_profit_impact"): number => {
      const ratios: number[] = [];
      for (const o of outcomes) {
        const r = recById.get(o.recommendation_id);
        if (!r || r.type !== type) continue;
        const predicted = Number(r[predictedField]);
        const actualField = predictedField === "expected_revenue_impact" ? "actual_revenue_impact" : "actual_profit_impact";
        const actual = (o as any)[actualField];
        if (predicted === 0 || actual === null || actual === undefined) continue;
        ratios.push(Math.abs(Number(actual)) / Math.abs(predicted));
      }
      const avg = safeAvg(ratios);
      if (avg === null) return 1.0;
      return Math.min(1.7, Math.max(0.3, avg));
    };

    const impact_adjustment_revenue = ratio(b.revenueErrors, "expected_revenue_impact");
    const impact_adjustment_profit = ratio(b.profitErrors, "expected_profit_impact");

    upserts.push({
      restaurant_id: restaurantId,
      recommendation_type: type,
      approval_rate: Math.round(approvalRate * 1000) / 1000,
      avg_prediction_error_revenue: avgRevErr !== null ? Math.round(avgRevErr * 100) / 100 : null,
      avg_prediction_error_profit: avgProfitErr !== null ? Math.round(avgProfitErr * 100) / 100 : null,
      avg_prediction_error_stress: avgStressErr !== null ? Math.round(avgStressErr * 100) / 100 : null,
      generation_threshold_multiplier: Math.round(generation_threshold_multiplier * 100) / 100,
      impact_adjustment_revenue: Math.round(impact_adjustment_revenue * 100) / 100,
      impact_adjustment_profit: Math.round(impact_adjustment_profit * 100) / 100,
      sample_size: b.total,
      weeks_analyzed: Math.min(12, weeksSinceFirstDecision),
      suppressed,
      restaurant_preferences: restaurantPreferences,
      last_updated: new Date().toISOString(),
    });
  }

  if (upserts.length === 0) return { restaurantId, updated: 0 };

  const { error } = await supabase
    .from("learning_parameters")
    .upsert(upserts, { onConflict: "restaurant_id,recommendation_type" });

  if (error) throw error;

  return { restaurantId, updated: upserts.length };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Cron auth: require shared secret header
    const cronSecret = Deno.env.get("CRON_SECRET");
    const provided = req.headers.get("x-cron-secret");
    if (cronSecret && provided !== cronSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get every restaurant that has any feedback in the last 12 weeks
    const since = new Date(Date.now() - TWELVE_WEEKS_MS).toISOString();
    const { data: activeRestaurants, error: arErr } = await supabase
      .from("recommendation_feedback")
      .select("restaurant_id")
      .gte("decided_at", since);
    if (arErr) throw arErr;

    const ids = Array.from(new Set((activeRestaurants || []).map((r: any) => r.restaurant_id)));
    const results = [];
    for (const id of ids) {
      try {
        results.push(await processRestaurant(supabase, id));
      } catch (e) {
        console.error(`learning job failed for restaurant ${id}:`, e);
        results.push({ restaurantId: id, error: true });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weekly-learning-job error:", err);
    return new Response(JSON.stringify({ error: "Failed to run learning job" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
