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

interface RawSalesRecord {
  dish_name: string;
  dish_id?: string;
  quantity_sold?: number;
  selling_price: number;
  order_timestamp: string;
  order_type?: string;
}

const VALID_ORDER_TYPES = ["dine-in", "takeaway", "delivery"];

function normalizeOrderType(raw?: string): string {
  if (!raw) return "dine-in";
  const lower = raw.toLowerCase().trim();
  if (lower === "dinein" || lower === "dine_in" || lower === "dine-in" || lower === "dine in") return "dine-in";
  if (lower === "takeaway" || lower === "take_away" || lower === "take-away" || lower === "take away" || lower === "pickup" || lower === "pick_up") return "takeaway";
  if (lower === "delivery" || lower === "deliver") return "delivery";
  return "dine-in";
}

function sanitizeValue(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) {
    return val.replace(/^[=+\-@\t\r]+/, "");
  }
  return val;
}

function normalizeDishName(name: string): string {
  return sanitizeValue(name.trim().replace(/\s+/g, " "));
}

function validateRecord(record: RawSalesRecord, index: number): { valid: boolean; error?: string } {
  if (!record.dish_name || typeof record.dish_name !== "string" || record.dish_name.trim().length === 0) {
    return { valid: false, error: `Row ${index}: missing dish_name` };
  }
  if (record.selling_price == null || isNaN(Number(record.selling_price)) || Number(record.selling_price) < 0) {
    return { valid: false, error: `Row ${index}: invalid selling_price` };
  }
  if (!record.order_timestamp) {
    return { valid: false, error: `Row ${index}: missing order_timestamp` };
  }
  const ts = new Date(record.order_timestamp);
  if (isNaN(ts.getTime())) {
    return { valid: false, error: `Row ${index}: invalid order_timestamp` };
  }
  if (record.quantity_sold != null && (isNaN(Number(record.quantity_sold)) || Number(record.quantity_sold) < 1)) {
    return { valid: false, error: `Row ${index}: invalid quantity_sold` };
  }
  return { valid: true };
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's restaurant
    const { data: restaurantId } = await supabase.rpc("get_user_restaurant_id", { _user_id: user.id });
    if (!restaurantId) {
      return new Response(JSON.stringify({ error: "No restaurant found for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const source: string = body.source || "csv";
    const records: RawSalesRecord[] = body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ error: "No records provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create ingestion log
    const { data: log } = await supabase
      .from("ingestion_logs")
      .insert({ restaurant_id: restaurantId, source, records_total: records.length, status: "processing" })
      .select("id")
      .single();

    const imported: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const raw = records[i];
      const validation = validateRecord(raw, i + 1);
      if (!validation.valid) {
        errors.push(validation.error!);
        continue;
      }

      imported.push({
        restaurant_id: restaurantId,
        dish_name: normalizeDishName(raw.dish_name),
        dish_id: raw.dish_id || null,
        quantity_sold: Number(raw.quantity_sold) || 1,
        selling_price: Number(raw.selling_price),
        order_timestamp: new Date(raw.order_timestamp).toISOString(),
        order_type: normalizeOrderType(raw.order_type),
        source,
        raw_payload: raw,
      });
    }

    // Batch insert in chunks of 500
    const CHUNK = 500;
    for (let i = 0; i < imported.length; i += CHUNK) {
      const chunk = imported.slice(i, i + CHUNK);
      const { error: insertErr } = await supabase.from("sales_transactions").insert(chunk);
      if (insertErr) {
        console.error("Insert error:", insertErr);
        errors.push(`Batch insert error at offset ${i}: ${insertErr.message}`);
      }
    }

    // Update ingestion log
    await supabase
      .from("ingestion_logs")
      .update({
        status: errors.length > 0 && imported.length === 0 ? "failed" : "completed",
        records_imported: imported.length,
        records_skipped: records.length - imported.length,
        error_message: errors.length > 0 ? errors.slice(0, 10).join("; ") : null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", log!.id);

    return new Response(
      JSON.stringify({
        success: true,
        total: records.length,
        imported: imported.length,
        skipped: records.length - imported.length,
        errors: errors.slice(0, 10),
        ingestion_log_id: log!.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Ingestion error:", err);
    return new Response(JSON.stringify({ error: "Failed to process sales data" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
