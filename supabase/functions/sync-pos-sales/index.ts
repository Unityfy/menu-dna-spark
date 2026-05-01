// Read-only POS sales sync — fetches recent orders, dedupes via external_order_id, retries on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NormalizedOrder {
  external_order_id: string;
  dish_id?: string;
  dish_name: string;
  quantity_sold: number;
  selling_price: number;
  order_timestamp: string; // ISO 8601
  order_type: "dine_in" | "takeaway" | "delivery";
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 800;

async function fetchWithRetry(url: string, init: RequestInit, attempt = 1): Promise<Response> {
  try {
    const res = await fetch(url, init);
    if (!res.ok && res.status >= 500 && attempt < MAX_RETRIES) {
      throw new Error(`Upstream ${res.status}`);
    }
    return res;
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt - 1)));
    return fetchWithRetry(url, init, attempt + 1);
  }
}

// Stub: in production, branch by provider (petpooja/posist/toast/...) and call their REST APIs read-only.
// This returns an empty array when no provider is configured so the function remains safe in dev.
async function fetchOrdersFromPos(provider: string | null, since: Date): Promise<NormalizedOrder[]> {
  if (!provider) return [];
  // Provider-specific implementations would go here. They MUST be read-only.
  console.log(`[sync-pos-sales] No live adapter for provider="${provider}" since=${since.toISOString()}`);
  return [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // AuthN/AuthZ — accept either a valid user JWT (user-triggered "Sync Now")
    // or a CRON_SECRET header (scheduled job). Reject everything else.
    const authHeader = req.headers.get("Authorization");
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = !!cronSecret && cronSecretHeader === cronSecret;

    let userScopedRestaurantId: string | null = null;

    if (!isCron) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub as string;
      const { data: rid, error: ridError } = await supabase.rpc("get_user_restaurant_id", { _user_id: userId });
      if (ridError || !rid) {
        return new Response(JSON.stringify({ error: "No restaurant for user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userScopedRestaurantId = rid as string;
    }

    // Build target list. User-triggered = only their own restaurant.
    // Cron = all restaurants.
    const targets: { id: string; pos_provider: string | null; last_synced_at: string | null }[] = [];
    if (userScopedRestaurantId) {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, pos_provider, last_synced_at")
        .eq("id", userScopedRestaurantId)
        .maybeSingle();
      if (error) throw error;
      if (data) targets.push(data);
    } else {
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, pos_provider, last_synced_at");
      if (error) throw error;
      targets.push(...(data ?? []));
    }

    const results: Array<Record<string, unknown>> = [];

    for (const r of targets) {
      const since = r.last_synced_at ? new Date(r.last_synced_at) : new Date(Date.now() - 24 * 3600_000);
      try {
        const orders = await fetchOrdersFromPos(r.pos_provider, since);

        let inserted = 0;
        let skipped = 0;

        for (const o of orders) {
          const { error: insErr } = await supabase
            .from("sales_transactions")
            .upsert(
              {
                restaurant_id: r.id,
                dish_id: o.dish_id ?? null,
                dish_name: o.dish_name,
                quantity_sold: o.quantity_sold,
                selling_price: o.selling_price,
                order_timestamp: o.order_timestamp,
                order_type: o.order_type,
                external_order_id: o.external_order_id,
                source: r.pos_provider ?? "pos",
                synced_at: new Date().toISOString(),
              },
              { onConflict: "restaurant_id,external_order_id,dish_name", ignoreDuplicates: true },
            );
          if (insErr) {
            skipped += 1;
            console.error("[sync-pos-sales] insert error", insErr.message);
          } else {
            inserted += 1;
          }
        }

        await supabase
          .from("restaurants")
          .update({
            last_synced_at: new Date().toISOString(),
            last_sync_status: "success",
            last_sync_error: null,
          })
          .eq("id", r.id);

        results.push({ restaurant_id: r.id, inserted, skipped, fetched: orders.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await supabase
          .from("restaurants")
          .update({ last_sync_status: "error", last_sync_error: msg })
          .eq("id", r.id);
        results.push({ restaurant_id: r.id, error: msg });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[sync-pos-sales]", msg);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
