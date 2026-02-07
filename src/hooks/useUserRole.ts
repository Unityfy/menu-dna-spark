import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "owner" | "manager";

interface UserRoleData {
  role: AppRole | null;
  restaurantId: string | null;
  isOwner: boolean;
  isManager: boolean;
  loading: boolean;
}

export const useUserRole = (): UserRoleData => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, restaurant_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    role: (data?.role as AppRole) ?? null,
    restaurantId: data?.restaurant_id ?? null,
    isOwner: data?.role === "owner",
    isManager: data?.role === "manager",
    loading: isLoading,
  };
};
