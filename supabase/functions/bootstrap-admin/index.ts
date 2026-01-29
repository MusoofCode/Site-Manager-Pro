// Lovable Cloud Function: bootstrap-admin
// If no admin exists yet, grant the caller the admin role.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(url, serviceKey);
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr) throw userErr;
    const user = userData.user;
    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existing, error: existsErr } = await adminClient
      .from("user_roles")
      .select("id")
      .limit(1);
    if (existsErr) throw existsErr;
    if ((existing?.length ?? 0) > 0) {
      return Response.json(
        { error: "Admin already initialized" },
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (insertErr) throw insertErr;

    return Response.json(
      { ok: true },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("bootstrap-admin error", e);
    return Response.json(
      { error: "Failed to bootstrap admin" },
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
