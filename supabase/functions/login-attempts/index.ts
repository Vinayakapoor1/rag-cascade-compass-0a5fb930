import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, email, success, ip_fingerprint } = await req.json();

    if (action === "check") {
      // Count failed attempts in the last LOCKOUT_MINUTES minutes
      const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();

      const { data: attempts, error } = await supabaseAdmin
        .from("login_attempts")
        .select("id, attempted_at")
        .eq("email", email.toLowerCase())
        .eq("success", false)
        .gte("attempted_at", cutoff)
        .order("attempted_at", { ascending: false });

      if (error) throw error;

      const failedCount = attempts?.length || 0;
      const isBlocked = failedCount >= MAX_ATTEMPTS;

      let remainingMinutes = 0;
      if (isBlocked && attempts && attempts.length > 0) {
        const oldestAttempt = new Date(attempts[attempts.length - 1].attempted_at);
        const unblockTime = new Date(oldestAttempt.getTime() + LOCKOUT_MINUTES * 60 * 1000);
        remainingMinutes = Math.ceil((unblockTime.getTime() - Date.now()) / 60000);
        if (remainingMinutes < 0) remainingMinutes = 0;
      }

      return new Response(
        JSON.stringify({ blocked: isBlocked, failedCount, remainingMinutes }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "log") {
      // Log the attempt
      const { error } = await supabaseAdmin.from("login_attempts").insert({
        email: email.toLowerCase(),
        success: success || false,
        ip_fingerprint: ip_fingerprint || null,
      });

      if (error) throw error;

      // If successful login, optionally clean up old failed attempts for this email
      if (success) {
        await supabaseAdmin
          .from("login_attempts")
          .delete()
          .eq("email", email.toLowerCase())
          .eq("success", false);
      }

      return new Response(
        JSON.stringify({ logged: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
