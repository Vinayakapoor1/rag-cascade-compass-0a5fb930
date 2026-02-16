import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// TOTP verification using HMAC-SHA1
async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  const timeStep = 30;
  const now = Math.floor(Date.now() / 1000);

  // Check current time step and ±1 window for clock drift
  for (const offset of [-1, 0, 1]) {
    const counter = Math.floor((now / timeStep) + offset);
    const generated = await generateTOTP(secret, counter);
    if (generated === code) return true;
  }
  return false;
}

async function generateTOTP(secret: string, counter: number): Promise<string> {
  // Decode base32 secret
  const keyBytes = base32Decode(secret);

  // Convert counter to 8-byte big-endian buffer
  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  view.setUint32(4, counter, false);

  // HMAC-SHA1
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const hmacResult = await crypto.subtle.sign("HMAC", key, counterBuf);
  const hmac = new Uint8Array(hmacResult);

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

function base32Decode(input: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanInput = input.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const c of cleanInput) {
    const val = chars.indexOf(c);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, code, action } = await req.json();

    if (!user_id || !code) {
      return new Response(
        JSON.stringify({ error: "user_id and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the user's 2FA secret
    const { data: twoFa, error: fetchError } = await supabaseAdmin
      .from("user_2fa")
      .select("totp_secret, is_enabled")
      .eq("user_id", user_id)
      .maybeSingle();

    if (fetchError || !twoFa) {
      return new Response(
        JSON.stringify({ error: "2FA not configured for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = await verifyTOTP(twoFa.totp_secret, code);

    if (!isValid) {
      return new Response(
        JSON.stringify({ verified: false, error: "Invalid verification code" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is the initial setup (action === 'activate'), enable 2FA
    if (action === "activate" && !twoFa.is_enabled) {
      await supabaseAdmin
        .from("user_2fa")
        .update({ is_enabled: true })
        .eq("user_id", user_id);
    }

    return new Response(
      JSON.stringify({ verified: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
