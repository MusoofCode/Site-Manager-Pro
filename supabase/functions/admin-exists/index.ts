// Lovable Cloud Function: admin-exists
// Returns whether at least one admin role exists.

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

    const supabase = createClient(url, serviceKey);

    const { data, error } = await supabase
      .from("user_roles")
      .select("id")
      .limit(1);

    if (error) throw error;

    return Response.json(
      { adminExists: (data?.length ?? 0) > 0 },
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("admin-exists error", e);
    return Response.json(
      { adminExists: true },
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
