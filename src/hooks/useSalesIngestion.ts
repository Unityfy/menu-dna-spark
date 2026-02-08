import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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

export const useSalesIngestion = () => {
  const { session } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<IngestionResult | null>(null);

  const sanitizeCSVValue = (value: string): string => {
    // Prevent CSV injection by stripping leading formula characters
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

  const uploadCSV = async (file: File) => {
    if (!session?.access_token) {
      toast.error("Please log in to upload data");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        toast.error("No valid records found in CSV");
        setUploading(false);
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
    } catch (err) {
      console.error("CSV upload error:", err);
      toast.error("Failed to upload CSV data");
    } finally {
      setUploading(false);
    }
  };

  const ingestFromPOS = async (records: SalesRecord[]) => {
    if (!session?.access_token) {
      toast.error("Please log in first");
      return;
    }

    setUploading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("ingest-sales", {
        body: { source: "pos", records },
      });

      if (error) throw error;
      setResult(data as IngestionResult);

      if (data.imported > 0) {
        toast.success(`Synced ${data.imported} records from POS`);
      }
    } catch (err) {
      console.error("POS ingestion error:", err);
      toast.error("Failed to sync POS data");
    } finally {
      setUploading(false);
    }
  };

  return { uploadCSV, ingestFromPOS, uploading, result, parseCSV };
};
