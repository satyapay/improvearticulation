import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DrillHost from "@/components/DrillHost";

export default async function DrillsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <DrillHost userId={user.id} />;
}
