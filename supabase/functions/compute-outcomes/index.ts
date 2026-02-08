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

    // Find outcomes that are past their observation window and haven't been measured yet
    const { data: pendingOutcomes, error: fetchErr } = await supabase
      .from("recommendation_outcomes")
      .select("*, recommendations(expected_revenue_impact, expected_profit_impact, expected_stress_impact)")
      .eq("restaurant_id", restaurantId)
      .is("measured_at", null);

    if (fetchErr) throw fetchErr;
    if (!pendingOutcomes || pendingOutcomes.length === 0) {
      return new Response(JSON.stringify({ success: true, measured: 0, message: "No pending outcomes to measure" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let measured = 0;

    for (const outcome of pendingOutcomes) {
      // Check if observation window has elapsed
      const actionDate = new Date(outcome.action_at);
      const windowEnd = new Date(actionDate);
      windowEnd.setDate(windowEnd.getDate() + (outcome.observation_weeks * 7));

      if (now < windowEnd) continue; // Not yet time to measure

      // Fetch current dish profile metrics
      const { data: currentProfile } = await supabase
        .from("dish_profiles")
        .select("weekly_revenue, weekly_profit, stress_score")
        .eq("menu_item_id", outcome.menu_item_id)
        .maybeSingle();

      if (!currentProfile) continue;

      const measuredRevenue = currentProfile.weekly_revenue || 0;
      const measuredProfit = currentProfile.weekly_profit || 0;
      const measuredStress = currentProfile.stress_score || 0;

      const revenueDelta = measuredRevenue - outcome.baseline_revenue;
      const profitDelta = measuredProfit - outcome.baseline_profit;
      const stressDelta = measuredStress - outcome.baseline_stress;

      // Calculate effectiveness: ratio of actual profit impact vs expected
      const rec = outcome.recommendations as any;
      const expectedProfit = rec?.expected_profit_impact || 1;
      const effectiveness = expectedProfit !== 0
        ? Math.round((profitDelta / Math.abs(expectedProfit)) * 100) / 100
        : 0;

      const { error: updateErr } = await supabase
        .from("recommendation_outcomes")
        .update({
          measured_revenue: measuredRevenue,
          measured_profit: measuredProfit,
          measured_stress: measuredStress,
          revenue_delta: revenueDelta,
          profit_delta: profitDelta,
          stress_delta: stressDelta,
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

    return new Response(JSON.stringify({ success: true, measured }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compute-outcomes error:", err);
    return new Response(JSON.stringify({ error: "Failed to compute outcomes" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
