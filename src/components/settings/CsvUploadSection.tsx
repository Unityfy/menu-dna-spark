import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";

type UploadType = "sales" | "ingredients" | "menu";

interface Schema {
  required: string[];
  optional: string[];
  template: string;
  description: string;
  validate: (row: Record<string, string>) => string | null;
  parse: (row: Record<string, string>) => Record<string, unknown>;
}

const sanitize = (v: string) =>
  /^[=+\-@\t\r]/.test(v) ? v.replace(/^[=+\-@\t\r]+/, "") : v;

const parseDate = (s: string): string | null => {
  if (!s) return null;
  const t = Date.parse(s);
  if (!isNaN(t)) return new Date(t).toISOString();
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    const iso = `${yy}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T00:00:00Z`;
    const t2 = Date.parse(iso);
    if (!isNaN(t2)) return new Date(t2).toISOString();
  }
  return null;
};

const SCHEMAS: Record<UploadType, Schema> = {
  sales: {
    required: ["dish_name", "selling_price", "order_timestamp"],
    optional: ["dish_id", "quantity_sold", "order_type", "external_order_id"],
    description: "Daily transactions from your POS",
    template:
      "dish_name,dish_id,quantity_sold,selling_price,order_timestamp,order_type,external_order_id\nButter Chicken,BC001,2,320,2026-04-25T13:30:00Z,dine_in,ORD-1001\nPaneer Tikka,PT002,1,280,2026-04-25T19:15:00Z,delivery,ORD-1002\n",
    validate: (row) => {
      if (!row.dish_name) return "missing dish_name";
      if (!row.selling_price || isNaN(Number(row.selling_price))) return "invalid selling_price";
      if (!parseDate(row.order_timestamp)) return "invalid order_timestamp";
      const ot = (row.order_type || "dine_in").toLowerCase().replace(/[-\s]/g, "_");
      if (!["dine_in", "takeaway", "delivery"].includes(ot)) return "invalid order_type";
      return null;
    },
    parse: (row) => ({
      dish_name: row.dish_name,
      dish_id: row.dish_id || undefined,
      quantity_sold: Number(row.quantity_sold) || 1,
      selling_price: Number(row.selling_price),
      order_timestamp: parseDate(row.order_timestamp),
      order_type: (row.order_type || "dine_in").toLowerCase().replace(/[-\s]/g, "_"),
      external_order_id: row.external_order_id || undefined,
    }),
  },
  ingredients: {
    required: ["dish_name", "ingredient", "quantity", "unit", "unit_cost"],
    optional: [],
    description: "Per-dish ingredient costs (one row per ingredient)",
    template:
      "dish_name,ingredient,quantity,unit,unit_cost\nButter Chicken,Chicken,200,g,0.45\nButter Chicken,Butter,30,g,0.6\nPaneer Tikka,Paneer,150,g,0.5\n",
    validate: (row) => {
      if (!row.dish_name) return "missing dish_name";
      if (!row.ingredient) return "missing ingredient";
      if (!row.quantity || isNaN(Number(row.quantity))) return "invalid quantity";
      if (!row.unit) return "missing unit";
      if (!row.unit_cost || isNaN(Number(row.unit_cost))) return "invalid unit_cost";
      return null;
    },
    parse: (row) => ({
      dish_name: row.dish_name,
      ingredient: row.ingredient,
      quantity: Number(row.quantity),
      unit: row.unit,
      unit_cost: Number(row.unit_cost),
    }),
  },
  menu: {
    required: ["name", "category", "selling_price"],
    optional: ["food_cost", "prep_time_minutes", "station", "complexity", "is_combo"],
    description: "Your menu structure (categories, prices, prep details)",
    template:
      "name,category,selling_price,food_cost,prep_time_minutes,station,complexity,is_combo\nButter Chicken,Mains,320,120,15,Stovetop,medium,false\nPaneer Tikka,Starters,280,90,12,Tandoor,low,false\n",
    validate: (row) => {
      if (!row.name) return "missing name";
      if (!row.category) return "missing category";
      if (!row.selling_price || isNaN(Number(row.selling_price))) return "invalid selling_price";
      const c = (row.complexity || "medium").toLowerCase();
      if (!["low", "medium", "high"].includes(c)) return "invalid complexity";
      return null;
    },
    parse: (row) => ({
      name: row.name,
      category: row.category,
      selling_price: Number(row.selling_price),
      food_cost: Number(row.food_cost) || 0,
      prep_time_minutes: Number(row.prep_time_minutes) || 10,
      station: row.station || "Stovetop",
      complexity: (row.complexity || "medium").toLowerCase(),
      is_combo: String(row.is_combo).toLowerCase() === "true",
    }),
  },
};

const TYPE_LABELS: Record<UploadType, string> = {
  sales: "Sales Data",
  ingredients: "Ingredient Costs",
  menu: "Menu Structure",
};

interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, string>; // schemaField -> csvHeader
}

const CsvUploadSection = () => {
  const [type, setType] = useState<UploadType>("sales");
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const schema = SCHEMAS[type];

  const downloadTemplate = () => {
    const blob = new Blob([schema.template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const autoMap = (headers: string[]): Record<string, string> => {
    const norm = (s: string) => s.toLowerCase().trim().replace(/[\s-]+/g, "_");
    const all = [...schema.required, ...schema.optional];
    const map: Record<string, string> = {};
    const aliases: Record<string, string[]> = {
      dish_name: ["name", "item", "item_name", "product"],
      quantity_sold: ["qty", "quantity", "count"],
      selling_price: ["price", "amount", "rate"],
      order_timestamp: ["timestamp", "date", "order_date", "datetime"],
      order_type: ["type", "channel"],
      external_order_id: ["order_id", "invoice_id", "bill_no"],
    };
    for (const field of all) {
      const candidates = [field, ...(aliases[field] ?? [])];
      const hit = headers.find((h) => candidates.includes(norm(h)));
      if (hit) map[field] = hit;
    }
    return map;
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds 5MB limit");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Only .csv files supported");
      return;
    }

    const text = await file.text();
    const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
    if (lines.length < 2) {
      toast.error("CSV must contain a header and at least one row");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((ln) => {
      const vals = ln.split(",").map((v) => sanitize(v.trim()));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = vals[i] ?? ""));
      return obj;
    });

    setParsed({ headers, rows, mapping: autoMap(headers) });
    toast.success(`Parsed ${rows.length} rows`);
  };

  const updateMapping = (field: string, header: string) => {
    if (!parsed) return;
    setParsed({ ...parsed, mapping: { ...parsed.mapping, [field]: header } });
  };

  const remappedRows = parsed
    ? parsed.rows.map((r) => {
        const out: Record<string, string> = {};
        for (const [field, header] of Object.entries(parsed.mapping)) {
          out[field] = r[header] ?? "";
        }
        return out;
      })
    : [];

  const validation = (() => {
    if (!parsed) return { ok: 0, bad: 0, missing: [] as string[], errors: [] as string[] };
    const missing = schema.required.filter((f) => !parsed.mapping[f]);
    if (missing.length) return { ok: 0, bad: parsed.rows.length, missing, errors: [] };

    const errors: string[] = [];
    let ok = 0;
    let bad = 0;
    const seen = new Set<string>();
    let dupes = 0;

    for (let i = 0; i < remappedRows.length; i++) {
      const err = schema.validate(remappedRows[i]);
      if (err) {
        if (errors.length < 5) errors.push(`Row ${i + 2}: ${err}`);
        bad++;
        continue;
      }
      const key = type === "sales"
        ? `${remappedRows[i].external_order_id}|${remappedRows[i].dish_name}`
        : type === "ingredients"
          ? `${remappedRows[i].dish_name}|${remappedRows[i].ingredient}`
          : `${remappedRows[i].name}`;
      if (key && key !== "|" && seen.has(key)) {
        dupes++;
      } else {
        seen.add(key);
      }
      ok++;
    }
    if (dupes) errors.push(`${dupes} duplicate row(s) detected`);
    return { ok, bad, missing, errors };
  })();

  const handleImport = async () => {
    if (!parsed || validation.missing.length || validation.ok === 0) return;
    setImporting(true);
    try {
      const records = remappedRows
        .filter((r) => !schema.validate(r))
        .map((r) => schema.parse(r));

      if (type === "sales") {
        const res = await supabase.functions.invoke("ingest-sales", {
          body: { source: "csv", records },
        });
        if (res.error) throw res.error;
        toast.success(`Imported ${(res.data as { imported?: number })?.imported ?? 0} sales records`);
        queryClient.invalidateQueries({ queryKey: ["menu-intelligence"] });
        queryClient.invalidateQueries({ queryKey: ["menu-list"] });
      } else if (type === "menu") {
        const { data: rest } = await supabase
          .from("restaurants").select("id").limit(1).maybeSingle();
        if (!rest) throw new Error("No restaurant found — complete onboarding first");
        const payload = records.map((r) => ({ ...r, restaurant_id: rest.id }));
        const { error } = await supabase.from("menu_items").upsert(payload, {
          onConflict: "restaurant_id,name",
          ignoreDuplicates: false,
        } as never);
        if (error) throw error;
        toast.success(`Imported ${payload.length} menu items`);
        queryClient.invalidateQueries({ queryKey: ["menu-list"] });
      } else {
        // ingredients: update menu_items.food_cost by aggregating per dish
        const byDish = new Map<string, number>();
        for (const r of records as Array<{ dish_name: string; quantity: number; unit_cost: number }>) {
          byDish.set(r.dish_name, (byDish.get(r.dish_name) ?? 0) + r.quantity * r.unit_cost);
        }
        const { data: rest } = await supabase
          .from("restaurants").select("id").limit(1).maybeSingle();
        if (!rest) throw new Error("No restaurant found");
        let updated = 0;
        for (const [dish, cost] of byDish) {
          const { error, count } = await supabase
            .from("menu_items")
            .update({ food_cost: cost })
            .eq("restaurant_id", rest.id)
            .eq("name", dish)
            .select("*", { count: "exact", head: true });
          if (!error) updated += count ?? 0;
        }
        toast.success(`Updated food cost for ${updated} dish(es)`);
        queryClient.invalidateQueries({ queryKey: ["menu-list"] });
      }
      setParsed(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(SCHEMAS) as UploadType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setType(t);
              setParsed(null);
            }}
            className={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
              type === t
                ? "border-foreground/40 bg-foreground/10 text-foreground"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{schema.description}</p>

      {/* Template + drop zone */}
      {!parsed && (
        <>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download {TYPE_LABELS[type]} Template
          </button>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => fileRef.current?.click()}
            className={`rounded-md border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-foreground/40 bg-foreground/5"
                : "border-border bg-secondary/30 hover:border-muted-foreground/40"
            }`}
          >
            <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-foreground">
              Drop CSV here or <span className="underline">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">CSV only — Max 5MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </div>
        </>
      )}

      {/* Mapping + Preview */}
      {parsed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {parsed.rows.length} rows · {parsed.headers.length} columns
            </p>
            <button
              onClick={() => setParsed(null)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>

          {/* Column mapping */}
          <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Column Mapping
            </p>
            {[...schema.required, ...schema.optional].map((field) => {
              const isReq = schema.required.includes(field);
              const current = parsed.mapping[field] ?? "";
              return (
                <div key={field} className="flex items-center gap-2 text-xs">
                  <span className={`w-40 shrink-0 ${isReq ? "text-foreground" : "text-muted-foreground"}`}>
                    {field}
                    {isReq && <span className="text-warning ml-1">*</span>}
                  </span>
                  <select
                    value={current}
                    onChange={(e) => updateMapping(field, e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">— not mapped —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Validation summary */}
          <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {validation.missing.length === 0 && validation.ok > 0 ? (
                <CheckCircle className="h-3.5 w-3.5 text-opportunity" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-warning" />
              )}
              <span className="text-foreground">
                {validation.ok} valid · {validation.bad} invalid
              </span>
            </div>
            {validation.missing.length > 0 && (
              <p className="text-warning">
                Missing required mapping: {validation.missing.join(", ")}
              </p>
            )}
            {validation.errors.map((e, i) => (
              <p key={i} className="text-muted-foreground">{e}</p>
            ))}
          </div>

          {/* Preview table */}
          <div className="rounded-md border border-border overflow-hidden">
            <p className="px-3 py-2 text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-b border-border bg-secondary/30">
              Preview · first 10 rows
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/30">
                  <tr>
                    {parsed.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="border-t border-border/50">
                      {parsed.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-foreground whitespace-nowrap">
                          {r[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={importing || validation.missing.length > 0 || validation.ok === 0}
            className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            <FileText className="h-3.5 w-3.5" />
            {importing ? "Importing…" : `Confirm & Import ${validation.ok} row(s)`}
          </button>
        </div>
      )}
    </div>
  );
};

export default CsvUploadSection;
