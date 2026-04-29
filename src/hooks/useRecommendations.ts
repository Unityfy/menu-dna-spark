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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "ignored" }) => {
      const decidedAt = new Date().toISOString();

      // 1. Update the recommendation status
      const { error } = await supabase
        .from("recommendations")
        .update({ status, updated_at: decidedAt })
        .eq("id", id);
      if (error) throw error;

      // 2. Fetch the recommendation to capture baseline metrics
      const { data: rec } = await supabase
        .from("recommendations")
        .select("id, restaurant_id, menu_item_id, type")
        .eq("id", id)
        .maybeSingle();

      if (!rec) return;

      // 3. Fetch current dish profile for baseline snapshot
      const { data: profile } = await supabase
        .from("dish_profiles")
        .select("weekly_revenue, weekly_profit, stress_score")
        .eq("menu_item_id", rec.menu_item_id)
        .maybeSingle();

      // 4. Record the outcome with baseline metrics (for learning system)
      await supabase.from("recommendation_outcomes").insert({
        recommendation_id: id,
        restaurant_id: rec.restaurant_id,
        menu_item_id: rec.menu_item_id,
        action_taken: status,
        recommendation_type: rec.type,
        baseline_revenue: profile?.weekly_revenue || 0,
        baseline_profit: profile?.weekly_profit || 0,
        baseline_stress: profile?.stress_score || 0,
      });

      // 5. Record per-user feedback (audit trail)
      if (user?.id) {
        await supabase.from("recommendation_feedback").insert({
          recommendation_id: id,
          restaurant_id: rec.restaurant_id,
          user_id: user.id,
          decision: status,
          decided_at: decidedAt,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-feedback"] });
    },
  });
}

// Mark an approved recommendation as implemented (sets implemented_at on the latest feedback row).
export function useMarkRecommendationImplemented() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ recommendationId }: { recommendationId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data: feedback } = await supabase
        .from("recommendation_feedback")
        .select("id")
        .eq("recommendation_id", recommendationId)
        .eq("user_id", user.id)
        .eq("decision", "approved")
        .order("decided_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!feedback) throw new Error("No approval found for this recommendation");

      const { error } = await supabase
        .from("recommendation_feedback")
        .update({ implemented_at: new Date().toISOString() })
        .eq("id", feedback.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendation-feedback"] });
    },
  });
}

// Fetch feedback rows for the current restaurant (used to show decided/implemented state in the UI).
export function useRecommendationFeedback() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["recommendation-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendation_feedback")
        .select("id, recommendation_id, user_id, decision, decided_at, implemented_at")
        .order("decided_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
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

export function useComputeOutcomes() {
  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await supabase.functions.invoke("compute-outcomes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      return res.data;
    },
  });
}
