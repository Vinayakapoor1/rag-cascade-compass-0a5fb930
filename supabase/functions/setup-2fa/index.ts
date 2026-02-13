import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Base32 encoding for TOTP secrets
function generateSecret(length = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % 32]).join("");
}

function buildOtpAuthUrl(secret: string, email: string): string {
  const issuer = encodeURIComponent("KlaRity");
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email || "user";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if 2FA already exists
    const { data: existing } = await supabaseAdmin
      .from("user_2fa")
      .select("id, is_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.is_enabled) {
      return new Response(
        JSON.stringify({ error: "2FA is already enabled", already_enabled: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const secret = generateSecret();
    const otpauthUrl = buildOtpAuthUrl(secret, userEmail);

    // Upsert the 2FA record
    if (existing) {
      await supabaseAdmin
        .from("user_2fa")
        .update({ totp_secret: secret, is_enabled: false })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin
        .from("user_2fa")
        .insert({ user_id: userId, totp_secret: secret, is_enabled: false });
    }

    // Generate QR code using a public API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

    return new Response(
      JSON.stringify({ secret, otpauth_url: otpauthUrl, qr_url: qrUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
