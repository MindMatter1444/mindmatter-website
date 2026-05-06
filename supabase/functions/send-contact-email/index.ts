const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactPayload {
  name: string;
  company?: string | null;
  email: string;
  message: string;
  captchaToken?: string;
}

const RECIPIENT = "post@mindmatter.no";
const FROM = "Mindmatter <kontakt@mindmatter.no>";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Dev/staging bypass — when CONTACT_DEV_BYPASS=true is set as a secret,
// the function accepts the literal token "DEV_BYPASS" without contacting
// hCaptcha and skips IP rate limiting. This lets you do full end-to-end
// tests of the email pipeline without solving a CAPTCHA. To disable,
// remove or set CONTACT_DEV_BYPASS to anything other than "true".
const DEV_BYPASS_TOKEN = "DEV_BYPASS";
function isDevBypassEnabled(): boolean {
  return (Deno.env.get("CONTACT_DEV_BYPASS") ?? "").toLowerCase() === "true";
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

async function hashIp(ip: string): Promise<string> {
  const salt = Deno.env.get("RATE_LIMIT_SALT") ?? "";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkAndRecordRateLimit(ipHash: string): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase env vars missing for rate limit check");
    return { allowed: true }; // Fail-open to avoid blocking legitimate users on misconfig.
  }
  const sinceIso = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Count recent submissions for this IP hash.
  const countUrl = `${supabaseUrl}/rest/v1/contact_email_rate_limit?select=created_at&ip_hash=eq.${encodeURIComponent(ipHash)}&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.asc`;
  const countRes = await fetch(countUrl, { headers: { ...headers, Prefer: "count=exact" } });
  if (!countRes.ok) {
    console.error("Rate limit count query failed", countRes.status, await countRes.text());
    return { allowed: true };
  }
  const rows = (await countRes.json()) as Array<{ created_at: string }>;
  if (rows.length >= RATE_LIMIT_MAX) {
    const oldest = new Date(rows[0].created_at).getTime();
    const resetAt = oldest + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  // Record this attempt.
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/contact_email_rate_limit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ip_hash: ipHash }),
  });
  if (!insertRes.ok) {
    console.error("Rate limit insert failed", insertRes.status, await insertRes.text());
  } else {
    await insertRes.text();
  }
  return { allowed: true };
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const secret = Deno.env.get("HCAPTCHA_SECRET_KEY");
  if (!secret) {
    console.error("HCAPTCHA_SECRET_KEY missing");
    return false;
  }
  const params = new URLSearchParams();
  params.append("secret", secret);
  params.append("response", token);
  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.error("hCaptcha verify error", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by hashed client IP — max RATE_LIMIT_MAX requests per window.
    const devBypass = isDevBypassEnabled();
    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const rl = devBypass ? { allowed: true } : await checkAndRecordRateLimit(ipHash);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rl.retryAfterSeconds ?? 60),
          },
        },
      );
    }

    const body = (await req.json()) as ContactPayload;
    const { name, company, email, message, captchaToken } = body ?? {};

    // Require CAPTCHA token — prevents direct invocation/abuse of this endpoint.
    if (!captchaToken || typeof captchaToken !== "string") {
      return new Response(JSON.stringify({ error: "Missing captcha token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const captchaOk = devBypass && captchaToken === DEV_BYPASS_TOKEN
      ? true
      : await verifyCaptcha(captchaToken);
    if (!captchaOk) {
      return new Response(JSON.stringify({ error: "Captcha verification failed" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side validation (length + format limits).
    if (
      typeof name !== "string" || typeof email !== "string" || typeof message !== "string" ||
      (company != null && typeof company !== "string")
    ) {
      return new Response(JSON.stringify({ error: "Invalid field types" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const nameT = name.trim();
    const emailT = email.trim();
    const messageT = message.trim();
    const companyT = company ? company.trim() : "";
    if (
      nameT.length === 0 || nameT.length > 120 ||
      emailT.length === 0 || emailT.length > 200 || !EMAIL_RE.test(emailT) ||
      messageT.length === 0 || messageT.length > 2000 ||
      companyT.length > 160
    ) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeName = escapeHtml(nameT);
    const safeCompany = companyT ? escapeHtml(companyT) : "";
    const safeEmail = escapeHtml(emailT);
    const safeMessage = escapeHtml(messageT).replace(/\n/g, "<br/>");

    const html = `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; color:#111; line-height:1.6;">
        <h2 style="margin:0 0 16px;">Ny henvendelse fra mindmatter.no</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Navn</td><td><strong>${safeName}</strong></td></tr>
          ${safeCompany ? `<tr><td style="padding:4px 12px 4px 0;color:#666;">Bedrift</td><td>${safeCompany}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0;color:#666;">E-post</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee;"/>
        <div style="white-space:pre-wrap;">${safeMessage}</div>
      </div>
    `;

    const text = `Ny henvendelse fra mindmatter.no

Navn: ${nameT}
${companyT ? `Bedrift: ${companyT}\n` : ""}E-post: ${emailT}

${messageT}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [RECIPIENT],
        reply_to: emailT,
        subject: `Ny henvendelse fra ${nameT}${companyT ? ` (${companyT})` : ""}`,
        html,
        text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error", res.status, data);
      // Map known Resend errors to clear, actionable messages so it's
      // obvious what's wrong (especially in dev/staging).
      const resendName = (data?.name ?? "").toString();
      const resendMsg = (data?.message ?? "").toString();
      const apiKeyHint = `${apiKey.slice(0, 4)}…${apiKey.slice(-4)} (length ${apiKey.length})`;

      let code = "resend_error";
      let hint = "Se 'details' for full feilmelding fra Resend.";
      let status = 502;

      if (res.status === 401 || /api key/i.test(resendMsg)) {
        code = "resend_invalid_api_key";
        hint =
          `RESEND_API_KEY er ugyldig, utløpt eller mangler tilgang. ` +
          `Logg inn på resend.com/api-keys, opprett en ny nøkkel med "Sending access" ` +
          `for domenet '${FROM.split("@")[1]?.replace(">", "")}', og oppdater secreten 'RESEND_API_KEY' i Lovable Cloud. ` +
          `Nåværende nøkkel: ${apiKeyHint}.`;
        status = 500;
      } else if (res.status === 403 || /domain.*not.*verified|not verified|unverified/i.test(resendMsg)) {
        code = "resend_domain_not_verified";
        hint =
          `Avsenderdomenet '${FROM}' er ikke verifisert i Resend. ` +
          `Verifiser domenet på resend.com/domains, eller bytt midlertidig ` +
          `'from' til 'onboarding@resend.dev' for testing.`;
        status = 500;
      } else if (res.status === 422 || resendName === "validation_error") {
        code = "resend_validation_error";
        hint = `Resend avviste forespørselen som ugyldig: ${resendMsg}`;
        status = 400;
      } else if (res.status === 429) {
        code = "resend_rate_limited";
        hint = "Resend rate-limit nådd — vent litt og prøv igjen.";
        status = 429;
      }

      return new Response(
        JSON.stringify({ error: hint, code, resendStatus: res.status, details: data }),
        {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-contact-email error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});