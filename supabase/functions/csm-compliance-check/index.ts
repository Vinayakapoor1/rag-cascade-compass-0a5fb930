import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Convert a UTC date to a given IANA timezone and return hour/day
function getLocalTime(utcDate: Date, timezone: string): { hour: number; minute: number; dayOfWeek: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, minute, dayOfWeek: dayMap[weekday] ?? -1 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check if this is a manual trigger (force=true) or cron
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body from cron */ }
    const isManual = body?.force === true;

    // Get admin profiles with timezone
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminUserIds = (adminRoles || []).map((r: any) => r.user_id);

    if (adminUserIds.length === 0) {
      return new Response(JSON.stringify({ message: "No admins found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get admin timezone from first admin's profile
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("timezone")
      .in("user_id", adminUserIds)
      .not("timezone", "is", null)
      .limit(1)
      .single();

    const adminTimezone = adminProfile?.timezone || "UTC";

    // Check if it's Friday 23:xx in the admin's timezone (unless manual)
    if (!isManual) {
      const now = new Date();
      const local = getLocalTime(now, adminTimezone);
      
      // Only proceed if it's Friday (5) and hour is 23
      if (local.dayOfWeek !== 5 || local.hour !== 23) {
        return new Response(
          JSON.stringify({ 
            skipped: true, 
            reason: `Not Friday 11 PM in ${adminTimezone}. Current: day=${local.dayOfWeek} hour=${local.hour}:${local.minute}` 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get current period (YYYY-MM)
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

    // Check compliance per CSM
    const nonCompliant: typeof csms = [];
    const compliant: typeof csms = [];

    for (const csm of csms) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("csm_id", csm.id);

      if (!customers || customers.length === 0) continue;

      const { count } = await supabase
        .from("csm_customer_feature_scores")
        .select("id", { count: "exact", head: true })
        .in("customer_id", customers.map((c: any) => c.id))
        .eq("period", currentPeriod);

      if (!count || count === 0) {
        nonCompliant.push(csm);
      } else {
        compliant.push(csm);
      }
    }

    const totalWithCustomers = compliant.length + nonCompliant.length;

    // Create a single notification for each admin: "1 compliance report available"
    if (adminUserIds.length > 0) {
      const notifications = adminUserIds.map((userId: string) => ({
        user_id: userId,
        title: "📋 1 Compliance Report Available",
        message: `Weekly CSM check-in report for ${currentPeriod}: ${compliant.length}/${totalWithCustomers} CSMs have submitted. ${nonCompliant.length > 0 ? `Pending: ${nonCompliant.map(c => c.name).join(", ")}` : "All CSMs are up to date!"}`,
        link: "/compliance-report",
      }));
      await supabase.from("notifications").insert(notifications);
    }

    // Notify non-compliant CSMs
    const csmNotifications = nonCompliant
      .filter((c) => c.user_id)
      .map((csm) => ({
        user_id: csm.user_id!,
        title: "🔔 Weekly Data Entry Reminder",
        message: `You have not yet submitted customer feature scores for ${currentPeriod}. Please complete your check-in.`,
        link: "/csm/data-entry",
      }));
    if (csmNotifications.length > 0) {
      await supabase.from("notifications").insert(csmNotifications);
    }

    // Activity log
    await supabase.from("activity_logs").insert({
      action: "compliance_check",
      entity_type: "system",
      entity_name: "CSM Weekly Compliance",
      new_value: {
        period: currentPeriod,
        timezone: adminTimezone,
        total_csms: totalWithCustomers,
        compliant: compliant.length,
        non_compliant: nonCompliant.length,
        non_compliant_names: nonCompliant.map((c) => c.name),
      },
    });

    return new Response(
      JSON.stringify({
        period: currentPeriod,
        timezone: adminTimezone,
        total: totalWithCustomers,
        compliant: compliant.map((c) => c.name),
        nonCompliant: nonCompliant.map((c) => c.name),
        notificationsSent: adminUserIds.length + csmNotifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Compliance check error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
