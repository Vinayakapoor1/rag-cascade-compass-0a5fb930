import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get current period (YYYY-MM for monthly)
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get all CSMs
    const { data: csms, error: csmError } = await supabase
      .from("csms")
      .select("id, name, email, user_id");
    if (csmError) throw csmError;

    if (!csms || csms.length === 0) {
      return new Response(JSON.stringify({ message: "No CSMs found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each CSM, check if they have any scores for the current period
    const nonCompliant: { id: string; name: string; email: string | null; user_id: string | null }[] = [];
    const compliant: { id: string; name: string }[] = [];

    for (const csm of csms) {
      // Get customers assigned to this CSM
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("csm_id", csm.id);

      if (!customers || customers.length === 0) continue;

      const customerIds = customers.map((c: any) => c.id);

      // Check if there are any scores for these customers in the current period
      const { count } = await supabase
        .from("csm_customer_feature_scores")
        .select("id", { count: "exact", head: true })
        .in("customer_id", customerIds)
        .eq("period", currentPeriod);

      if (!count || count === 0) {
        nonCompliant.push(csm);
      } else {
        compliant.push(csm);
      }
    }

    // Get admin user IDs to send notifications
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = (adminRoles || []).map((r: any) => r.user_id);

    // Create notifications for admins about non-compliant CSMs
    if (nonCompliant.length > 0 && adminUserIds.length > 0) {
      const nonCompliantNames = nonCompliant.map((c) => c.name).join(", ");
      const notifications = adminUserIds.map((userId: string) => ({
        user_id: userId,
        title: "⚠️ CSM Weekly Check-in Missing",
        message: `The following CSMs have not submitted data for ${currentPeriod}: ${nonCompliantNames}. (${nonCompliant.length} of ${csms.length} CSMs pending)`,
        link: "/data",
      }));

      await supabase.from("notifications").insert(notifications);
    }

    // Also notify the non-compliant CSMs themselves (if they have user_ids)
    const csmNotifications = nonCompliant
      .filter((c) => c.user_id)
      .map((csm) => ({
        user_id: csm.user_id!,
        title: "🔔 Weekly Data Entry Reminder",
        message: `You have not yet submitted customer feature scores for ${currentPeriod}. Please complete your check-in before the Friday deadline.`,
        link: "/csm/data-entry",
      }));

    if (csmNotifications.length > 0) {
      await supabase.from("notifications").insert(csmNotifications);
    }

    // Log to activity_logs
    await supabase.from("activity_logs").insert({
      action: "compliance_check",
      entity_type: "system",
      entity_name: "CSM Weekly Compliance",
      new_value: {
        period: currentPeriod,
        total_csms: csms.length,
        compliant: compliant.length,
        non_compliant: nonCompliant.length,
        non_compliant_names: nonCompliant.map((c) => c.name),
      },
    });

    return new Response(
      JSON.stringify({
        period: currentPeriod,
        total: csms.length,
        compliant: compliant.map((c) => c.name),
        nonCompliant: nonCompliant.map((c) => c.name),
        notificationsSent: adminUserIds.length + csmNotifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Compliance check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
