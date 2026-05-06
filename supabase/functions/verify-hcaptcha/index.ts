const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { token } = await req.json().catch(() => ({ token: null }));

    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Manglende CAPTCHA-token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const secret = Deno.env.get("HCAPTCHA_SECRET_KEY");
    if (!secret) {
      console.error("HCAPTCHA_SECRET_KEY mangler");
      return new Response(
        JSON.stringify({ success: false, error: "Serverkonfigurasjon mangler" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const params = new URLSearchParams();
    params.append("secret", secret);
    params.append("response", token);

    const verifyRes = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await verifyRes.json();
    console.log("hCaptcha siteverify:", data);

    if (!data.success) {
      return new Response(
        JSON.stringify({ success: false, error: "CAPTCHA-verifisering feilet", codes: data["error-codes"] ?? [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("verify-hcaptcha error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Uventet feil" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});