import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    // Gate: force onboarding, then assessment, for new users
    if (location.pathname !== "/onboarding" && location.pathname !== "/assessment") {
      const [{ data: ob }, { data: as }] = await Promise.all([
        supabase
          .from("user_onboarding")
          .select("onboarding_completed")
          .eq("user_id", data.user.id)
          .maybeSingle(),
        supabase
          .from("fitness_assessment")
          .select("completed")
          .eq("user_id", data.user.id)
          .maybeSingle(),
      ]);
      if (!ob?.onboarding_completed) {
        throw redirect({ to: "/onboarding" });
      }
      if (!as?.completed) {
        throw redirect({ to: "/assessment" });
      }
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
