import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Recommendation {
  id: string;
  restaurant_id: string;
  snapshot_id: string | null;
  menu_item_id: string;
  dish_name: string;
  type: string;
  title: string;
  reasoning: string;
  expected_revenue_impact: number;
  expected_profit_impact: number;
  expected_stress_impact: number;
  status: string;
  week_start: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

export function useRecommendations(weekStart?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recommendations", weekStart || "latest"],
    queryFn: async (): Promise<Recommendation[]> => {
      let query = supabase
        .from("recommendations")
        .select("*")
        .order("priority", { ascending: true });

      if (weekStart) {
        query = query.eq("week_start", weekStart);
      } else {
        // Get the latest week's recommendations
        const { data: latest } = await supabase
          .from("recommendations")
          .select("week_start")
          .order("week_start", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          query = query.eq("week_start", latest.week_start);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Recommendation[];
    },
    enabled: !!user,
  });
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "ignored" }) => {
      const { error } = await supabase
        .from("recommendations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

export function useComputeRecommendations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("compute-recommendations", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}
