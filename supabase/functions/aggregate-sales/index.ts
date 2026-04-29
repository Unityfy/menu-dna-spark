import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Granularity = "daily" | "weekly" | "monthly" | "all";

function normalizeName(n: string): string {
  return (n || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function startOfWeekUTC(d: Date): Date {
  const day = startOfDayUTC(d);
  const dow = day.getUTCDay(); // 0=Sun
  const diff = (dow + 6) % 7; // Monday as start
  day.setUTCDate(day.getUTCDate() - diff);
  return day;
}
function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function normalizeChannel(t: string): "dine_in" | "takeaway" | "delivery" {
  const s = (t || "").toLowerCase().replace(/[-\s]/g, "_");
  if (s.includes("take")) return "takeaway";
  if (s.includes("deliv")) return "delivery";
  return "dine_in";
}

interface Bucket {
  restaurant_id: string;
  dish_name_normalized: string;
  dish_name: string;
  bucket_key: string;
  qty: number;
  revenue: number;
  orders: number;
  dine_in: number;
  takeaway: number;
  delivery: number;
}

function aggregate(rows: any[], bucketFn: (d: Date) => Date): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    const ts = new Date(r.order_timestamp); // already UTC in DB
    const bucket = isoDate(bucketFn(ts));
    const norm = normalizeName(r.dish_name);
    const key = `${r.restaurant_id}|${norm}|${bucket}`;
    const channel = normalizeChannel(r.order_type);
    const qty = Number(r.quantity_sold) || 1;
    const rev = (Number(r.selling_price) || 0) * qty;
    let b = map.get(key);
    if (!b) {
      b = {
        restaurant_id: r.restaurant_id,
        dish_name_normalized: norm,
        dish_name: r.dish_name,
        bucket_key: bucket,
        qty: 0,
        revenue: 0,
        orders: 0,
        dine_in: 0,
        takeaway: 0,
        delivery: 0,
      };
      map.set(key, b);
    }
    b.qty += qty;
    b.revenue += rev;
    b.orders += 1;
    if (channel === "dine_in") b.dine_in += qty;
    else if (channel === "takeaway") b.takeaway += qty;
    else b.delivery += qty;
  }
  return map;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const granularity: Granularity = body.granularity || "all";
    const restaurantId: string | undefined = body.restaurant_id;
    // Lookback window — last 90 days by default (covers daily/weekly/monthly recompute)
    const lookbackDays = Number(body.lookback_days) || 90;

    const since = new Date();
    since.setUTCDate(since.getUTCDate() - lookbackDays);

    let q = supabase
      .from("sales_transactions")
      .select("restaurant_id,dish_name,order_timestamp,order_type,quantity_sold,selling_price")
      .gte("order_timestamp", since.toISOString());
    if (restaurantId) q = q.eq("restaurant_id", restaurantId);

    const { data: rows, error } = await q.limit(50000);
    if (error) throw error;

    const result: Record<string, number> = {};

    const upsertDaily = async () => {
      const m = aggregate(rows || [], startOfDayUTC);
      const recs = Array.from(m.values()).map((b) => ({
        restaurant_id: b.restaurant_id,
        dish_name_normalized: b.dish_name_normalized,
        dish_name: b.dish_name,
        bucket_date: b.bucket_key,
        total_quantity: b.qty,
        total_revenue: b.revenue,
        avg_price: b.qty > 0 ? b.revenue / b.qty : 0,
        order_count: b.orders,
        dine_in_qty: b.dine_in,
        takeaway_qty: b.takeaway,
        delivery_qty: b.delivery,
        computed_at: new Date().toISOString(),
      }));
      // Compute running totals per (restaurant, dish) ordered by bucket_date
      const byDish = new Map<string, typeof recs>();
      for (const r of recs) {
        const k = `${r.restaurant_id}|${r.dish_name_normalized}`;
        if (!byDish.has(k)) byDish.set(k, []);
        byDish.get(k)!.push(r);
      }
      const finalRecs: any[] = [];
      for (const list of byDish.values()) {
        list.sort((a, b) => a.bucket_date.localeCompare(b.bucket_date));
        let rq = 0, rr = 0;
        for (const r of list) {
          rq += r.total_quantity;
          rr += r.total_revenue;
          finalRecs.push({ ...r, running_total_quantity: rq, running_total_revenue: rr });
        }
      }
      if (finalRecs.length) {
        const { error: e } = await supabase
          .from("sales_aggregates_daily")
          .upsert(finalRecs, { onConflict: "restaurant_id,dish_name_normalized,bucket_date" });
        if (e) throw e;
      }
      result.daily = finalRecs.length;
    };

    const upsertWeekly = async () => {
      const m = aggregate(rows || [], startOfWeekUTC);
      const recs = Array.from(m.values()).map((b) => {
        const start = new Date(b.bucket_key + "T00:00:00Z");
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 6);
        return {
          restaurant_id: b.restaurant_id,
          dish_name_normalized: b.dish_name_normalized,
          dish_name: b.dish_name,
          week_start: b.bucket_key,
          week_end: isoDate(end),
          total_quantity: b.qty,
          total_revenue: b.revenue,
          avg_price: b.qty > 0 ? b.revenue / b.qty : 0,
          order_count: b.orders,
          dine_in_qty: b.dine_in,
          takeaway_qty: b.takeaway,
          delivery_qty: b.delivery,
          computed_at: new Date().toISOString(),
        };
      });
      if (recs.length) {
        const { error: e } = await supabase
          .from("sales_aggregates_weekly")
          .upsert(recs, { onConflict: "restaurant_id,dish_name_normalized,week_start" });
        if (e) throw e;
      }
      result.weekly = recs.length;
    };

    const upsertMonthly = async () => {
      const m = aggregate(rows || [], startOfMonthUTC);
      const recs = Array.from(m.values()).map((b) => ({
        restaurant_id: b.restaurant_id,
        dish_name_normalized: b.dish_name_normalized,
        dish_name: b.dish_name,
        month_start: b.bucket_key,
        total_quantity: b.qty,
        total_revenue: b.revenue,
        avg_price: b.qty > 0 ? b.revenue / b.qty : 0,
        order_count: b.orders,
        dine_in_qty: b.dine_in,
        takeaway_qty: b.takeaway,
        delivery_qty: b.delivery,
        computed_at: new Date().toISOString(),
      }));
      if (recs.length) {
        const { error: e } = await supabase
          .from("sales_aggregates_monthly")
          .upsert(recs, { onConflict: "restaurant_id,dish_name_normalized,month_start" });
        if (e) throw e;
      }
      result.monthly = recs.length;
    };

    if (granularity === "daily" || granularity === "all") await upsertDaily();
    if (granularity === "weekly" || granularity === "all") await upsertWeekly();
    if (granularity === "monthly" || granularity === "all") await upsertMonthly();

    return new Response(
      JSON.stringify({ success: true, source_rows: rows?.length || 0, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("aggregate-sales error:", err);
    return new Response(JSON.stringify({ error: "Aggregation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
