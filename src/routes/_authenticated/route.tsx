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
    // Gate: force onboarding for new users
    if (location.pathname !== "/onboarding") {
      const { data: ob } = await supabase
        .from("user_onboarding")
        .select("onboarding_completed")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!ob?.onboarding_completed) {
        throw redirect({ to: "/onboarding" });
      }
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
