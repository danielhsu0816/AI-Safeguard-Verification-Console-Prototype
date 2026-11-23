import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const identity = useQuery({ queryKey: ["identity"], queryFn: async () => { const { data } = await supabase.auth.getUser(); return data.user; }, staleTime: 60000 });
  const user = identity.data ?? null;
  const roles = useQuery({
    queryKey: ["my_roles", user?.id], enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role);
    },
  });
  const r = roles.data ?? [];
  return { user, roles: r, isAdmin: r.includes("admin"), isReviewer: r.includes("reviewer") || r.includes("admin") };
}
