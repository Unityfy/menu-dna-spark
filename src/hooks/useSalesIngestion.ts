import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SalesRecord {
  dish_name: string;
  dish_id?: string;
  quantity_sold?: number;
  selling_price: number;
  order_timestamp: string;
  order_type?: string;
}

interface IngestionResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  ingestion_log_id: string;
}

export type PipelineStep = "idle" | "uploading" | "computing-dna" | "computing-intelligence" | "computing-recommendations" | "done" | "error";

export const useSalesIngestion = () => {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sanitizeCSVValue = (value: string): string => {
    if (/^[=+\-@\t\r]/.test(value)) {
      return value.replace(/^[=+\-@\t\r]+/, "");
    }
    return value;
  };

  const parseCSV = (text: string): SalesRecord[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const records: SalesRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => sanitizeCSVValue(v.trim()));
      if (values.length < headers.length) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx];
      });

      records.push({
        dish_name: row.dish_name || row.name || row.item_name || row.item || "",
        dish_id: row.dish_id || row.item_id || undefined,
        quantity_sold: Number(row.quantity_sold || row.quantity || row.qty) || 1,
        selling_price: Number(row.selling_price || row.price || row.amount) || 0,
        order_timestamp: row.order_timestamp || row.timestamp || row.date || row.order_date || "",
        order_type: row.order_type || row.type || undefined,
      });
    }

    return records;
  };

  const runFullPipeline = async () => {
    try {
      // Step 2: Compute Dish DNA
      setPipelineStep("computing-dna");
      const dnaRes = await supabase.functions.invoke("compute-dish-dna");
      if (dnaRes.error) {
        console.error("Dish DNA error:", dnaRes.error);
        throw new Error("Failed to compute Dish DNA");
      }

      // Step 3: Compute Menu Intelligence
      setPipelineStep("computing-intelligence");
      const intRes = await supabase.functions.invoke("compute-menu-intelligence");
      if (intRes.error) {
        console.error("Menu Intelligence error:", intRes.error);
        throw new Error("Failed to compute Menu Intelligence");
      }

      // Step 4: Compute Recommendations
      setPipelineStep("computing-recommendations");
      const recRes = await supabase.functions.invoke("compute-recommendations");
      if (recRes.error) {
        console.error("Recommendations error:", recRes.error);
        throw new Error("Failed to compute Recommendations");
      }

      // Invalidate all queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["menu-intelligence"] });
      queryClient.invalidateQueries({ queryKey: ["menu-list"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["dish-profile"] });

      setPipelineStep("done");
      toast.success("Analysis complete! Dashboard updated with your data.");
    } catch (err: any) {
      console.error("Pipeline error:", err);
      setPipelineError(err.message || "Pipeline failed");
      setPipelineStep("error");
      toast.error(err.message || "Analysis pipeline failed");
    }
  };

  const uploadCSV = async (file: File) => {
    setUploading(true);
    setResult(null);
    setPipelineStep("uploading");
    setPipelineError(null);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        toast.error("No valid records found in CSV");
        setUploading(false);
        setPipelineStep("idle");
        return;
      }

      const { data, error } = await supabase.functions.invoke("ingest-sales", {
        body: { source: "csv", records },
      });

      if (error) throw error;

      setResult(data as IngestionResult);

      if (data.imported > 0) {
        toast.success(`Imported ${data.imported} of ${data.total} records`);
      }
      if (data.skipped > 0) {
        toast.warning(`${data.skipped} records skipped due to validation errors`);
      }

      setUploading(false);

      // Automatically run the full analysis pipeline
      if (data.imported > 0) {
        await runFullPipeline();
      } else {
        setPipelineStep("idle");
      }
    } catch (err) {
      console.error("CSV upload error:", err);
      toast.error("Failed to upload CSV data");
      setPipelineStep("error");
      setPipelineError("Upload failed");
      setUploading(false);
    }
  };

  const ingestFromPOS = async (records: SalesRecord[]) => {
    setUploading(true);
    setResult(null);
    setPipelineStep("uploading");
    setPipelineError(null);

    try {
      const { data, error } = await supabase.functions.invoke("ingest-sales", {
        body: { source: "pos", records },
      });

      if (error) throw error;
      setResult(data as IngestionResult);

      if (data.imported > 0) {
        toast.success(`Synced ${data.imported} records from POS`);
      }

      setUploading(false);

      if (data.imported > 0) {
        await runFullPipeline();
      } else {
        setPipelineStep("idle");
      }
    } catch (err) {
      console.error("POS ingestion error:", err);
      toast.error("Failed to sync POS data");
      setPipelineStep("error");
      setPipelineError("Sync failed");
      setUploading(false);
    }
  };

  const resetPipeline = () => {
    setPipelineStep("idle");
    setPipelineError(null);
  };

  return { uploadCSV, ingestFromPOS, uploading, result, parseCSV, pipelineStep, pipelineError, resetPipeline };
};
