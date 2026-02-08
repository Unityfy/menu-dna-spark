import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DishSummary {
  menu_item_id: string;
  name: string;
  category: string;
  weekly_profit: number;
  weekly_revenue: number;
  true_margin: number;
  stress_score: number;
  classification: string;
  weekly_orders: number;
}

export interface MenuSnapshot {
  id: string;
  week_start: string;
  week_end: string;
  health_score: number;
  health_delta: number;
  total_revenue: number;
  total_profit: number;
  avg_margin: number;
  avg_stress: number;
  total_dishes: number;
  top_profit_contributors: DishSummary[];
  hidden_loss_makers: DishSummary[];
  highest_stress_contributors: DishSummary[];
  low_impact_items: DishSummary[];
  classification_breakdown: Record<string, number>;
  risk_summary: Record<string, number>;
  computed_at: string;
}

function formatWeekLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function useLatestSnapshot() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["menu-intelligence", "latest"],
    queryFn: async (): Promise<MenuSnapshot | null> => {
      const { data, error } = await supabase
        .from("menu_intelligence_snapshots")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        top_profit_contributors: (data.top_profit_contributors || []) as unknown as DishSummary[],
        hidden_loss_makers: (data.hidden_loss_makers || []) as unknown as DishSummary[],
        highest_stress_contributors: (data.highest_stress_contributors || []) as unknown as DishSummary[],
        low_impact_items: (data.low_impact_items || []) as unknown as DishSummary[],
        classification_breakdown: (data.classification_breakdown || {}) as Record<string, number>,
        risk_summary: (data.risk_summary || {}) as Record<string, number>,
      } as MenuSnapshot;
    },
    enabled: !!user,
  });
}

export function useSnapshotHistory(limit = 12) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["menu-intelligence", "history", limit],
    queryFn: async (): Promise<(MenuSnapshot & { week_label: string })[]> => {
      const { data, error } = await supabase
        .from("menu_intelligence_snapshots")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []).map((d) => ({
        ...d,
        week_label: formatWeekLabel(d.week_start, d.week_end),
        top_profit_contributors: (d.top_profit_contributors || []) as unknown as DishSummary[],
        hidden_loss_makers: (d.hidden_loss_makers || []) as unknown as DishSummary[],
        highest_stress_contributors: (d.highest_stress_contributors || []) as unknown as DishSummary[],
        low_impact_items: (d.low_impact_items || []) as unknown as DishSummary[],
        classification_breakdown: (d.classification_breakdown || {}) as Record<string, number>,
        risk_summary: (d.risk_summary || {}) as Record<string, number>,
      })) as (MenuSnapshot & { week_label: string })[];
    },
    enabled: !!user,
  });
}

export function useComputeIntelligence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("compute-menu-intelligence", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-intelligence"] });
    },
  });
}
