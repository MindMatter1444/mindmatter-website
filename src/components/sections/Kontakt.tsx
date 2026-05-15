import { useState, useRef, useEffect, FormEvent } from "react";
import { FadeIn } from "../FadeIn";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { toast } from "sonner";

const HCAPTCHA_SITE_KEY = "f0ca9902-f65c-4d40-a03a-b9d6d3103ac0";

// Dev bypass — aktiveres ved å legge til ?devBypass=1 i URL-en. Klienten
// sender da et fast token "DEV_BYPASS" og hopper over hCaptcha-kravet.
// Edge-funksjonen godtar dette tokenet KUN når secreten CONTACT_DEV_BYPASS=true
// er satt, så bypassen er trygg uten serversiden.
const DEV_BYPASS_TOKEN = "DEV_BYPASS";
const isDevBypass = () => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("devBypass") === "1";
};

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Skriv inn navnet ditt")
    .min(2, "Navnet må være minst 2 tegn")
    .max(120, "Navnet kan ha maks 120 tegn"),
  company: z
    .string()
    .trim()
    .max(160, "Bedriftsnavnet kan ha maks 160 tegn")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .min(1, "Skriv inn e-postadressen din")
    .email("Sjekk at e-postadressen er riktig (f.eks. navn@bedrift.no)")
    .max(200, "E-postadressen kan ha maks 200 tegn"),
  phone: z
    .string()
    .trim()
    .max(40, "Telefonnummeret kan ha maks 40 tegn")
    .regex(/^[+\d\s().-]*$/, "Telefonnummeret kan bare inneholde tall, mellomrom og tegnene + ( ) -")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(1, "Skriv en kort beskjed om hva du trenger hjelp til")
    .min(10, "Skriv litt mer slik at vi kan forberede oss (minst 10 tegn)")
    .max(2000, "Beskjeden kan ha maks 2000 tegn"),
});

type FieldErrors = Partial<Record<"name" | "company" | "email" | "phone" | "message", string>>;

export const Kontakt = () => {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [retryRemaining, setRetryRemaining] = useState<number>(0);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const mountedAtRef = useRef<number>(Date.now());
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha | null>(null);
  const devBypass = isDevBypass();

  // I dev-bypass-modus setter vi token automatisk så Send-knappen blir aktiv
  // og vi hopper over hCaptcha-renderet.
  useEffect(() => {
    if (devBypass && !captchaToken) setCaptchaToken(DEV_BYPASS_TOKEN);
  }, [devBypass, captchaToken]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (fieldErrors[key]) setFieldErrors((fe) => ({ ...fe, [key]: undefined }));
    if (formError) setFormError(null);
  };

  // Real-time countdown when rate-limited (429). Updates every second
  // and clears once the wait time elapses.
  useEffect(() => {
    if (retryAt === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
      setRetryRemaining(remaining);
      if (remaining <= 0) {
        setRetryAt(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [retryAt]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setRetryAt(null);

    // Spam guards: honeypot field + minimum interaction time (>2s).
    // Real users won't fill the hidden field; bots typically fill all inputs.
    const timeOnForm = Date.now() - mountedAtRef.current;
    const honeypotValue = honeypotRef.current?.value ?? "";

    const logSpam = (reason: "honeypot" | "timing") => {
      // Fire-and-forget; never block UX or surface errors.
      void supabase
        .from("spam_log")
        .insert({
          reason,
          time_on_form_ms: timeOnForm,
          honeypot_value: honeypotValue || null,
          payload: {
            name: form.name,
            company: form.company,
            email: form.email,
            message: form.message?.slice(0, 500),
          },
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        })
        .then(() => {});
    };

    if (honeypotValue) {
      logSpam("honeypot");
      setStatus("done"); // Silently accept to avoid signaling rejection.
      return;
    }
    if (timeOnForm < 2000) {
      logSpam("timing");
      setFormError("Vent et lite øyeblikk før du sender skjemaet — vi vil bare sikre at du ikke er en bot.");
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setFormError("Sjekk feltene som er markert under og prøv igjen.");
      return;
    }
    setFieldErrors({});

    if (!captchaToken) {
      setFormError("Bekreft at du ikke er en robot ved å fullføre sikkerhetssjekken under.");
      return;
    }

    setStatus("submitting");

    const tokenForEmail = captchaToken;

    let emailRes: Response;
    try {
      emailRes = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.data.name,
          company: parsed.data.company || null,
          email: parsed.data.email,
          message: parsed.data.message,
          captchaToken: tokenForEmail,
        }),
      });
    } catch (e) {
      console.error("send-contact-email network error", e);
      setStatus("error");
      setFormError("Vi fikk ikke kontakt med serveren. Sjekk internettforbindelsen og prøv igjen, eller send oss en e-post direkte på adrian@mindmatter.no.");
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      return;
    }

    if (emailRes.status === 429) {
      const retryAfterRaw = emailRes.headers.get("Retry-After");
      const retrySeconds = retryAfterRaw ? Math.max(1, parseInt(retryAfterRaw, 10) || 60) : 60;
      const wait = formatWait(retrySeconds);
      setStatus("error");
      setFormError(`Vi har mottatt flere forespørsler fra deg nylig. Vent ${wait} før du sender en ny — eller send oss en e-post direkte på adrian@mindmatter.no.`);
      setRetryAt(Date.now() + retrySeconds * 1000);
      setRetryRemaining(retrySeconds);
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      void emailRes.text().catch(() => {});
      return;
    }

    if (!emailRes.ok) {
      const raw = await emailRes.text().catch(() => "");
      let parsedErr: { error?: string; code?: string; resendStatus?: number } | null = null;
      try { parsedErr = raw ? JSON.parse(raw) : null; } catch { /* ignore */ }
      console.error("send-contact-email failed", emailRes.status, parsedErr ?? raw);
      setStatus("error");
      // I dev-bypass viser vi den eksakte serverfeilen så det er enkelt å feilsøke.
      // I produksjon viser vi en vennlig generisk melding.
      if (devBypass && parsedErr?.error) {
        setFormError(
          `[DEV ${parsedErr.code ?? emailRes.status}] ${parsedErr.error}`,
        );
      } else {
        setFormError("Noe gikk galt på vår side, og meldingen ble ikke sendt. Prøv igjen om et øyeblikk, eller send oss en e-post direkte på adrian@mindmatter.no.");
      }
      setCaptchaToken(null);
      captchaRef.current?.resetCaptcha();
      return;
    }
    void emailRes.text().catch(() => {});

    // Lagre innsendingen i databasen etter at e-post er sendt.
    const submissionId = crypto.randomUUID();
    const { error: dbErr } = await supabase.from("contact_requests").insert({
      id: submissionId,
      name: parsed.data.name,
      company: parsed.data.company || null,
      email: parsed.data.email,
      message: parsed.data.message,
    });
    if (dbErr) {
      // E-posten gikk gjennom – ikke vis feilmelding til bruker.
      console.error("contact_requests insert failed", dbErr);
    }

    // Send branded bekreftelse til avsender (fire-and-forget).
    void supabase.functions
      .invoke("send-transactional-email", {
        body: {
          templateName: "contact-confirmation",
          recipientEmail: parsed.data.email,
          idempotencyKey: `contact-confirm-${submissionId}`,
          templateData: {
            name: parsed.data.name,
            message: parsed.data.message,
          },
        },
      })
      .then(({ error }) => {
        if (error) console.error("send-transactional-email failed", error);
      });

    toast.success("Melding sendt", {
      description: "Vi har mottatt forespørselen din og tar kontakt innen én arbeidsdag.",
    });

    setStatus("done");
  };

  // Format ventetid på norsk, f.eks. "2 minutter", "45 sekunder", "1 time og 5 minutter".
  function formatWait(totalSeconds: number): string {
    if (totalSeconds < 60) return `${totalSeconds} sekund${totalSeconds === 1 ? "" : "er"}`;
    const minutes = Math.ceil(totalSeconds / 60);
    if (minutes < 60) return `${minutes} minutt${minutes === 1 ? "" : "er"}`;
    const hours = Math.floor(minutes / 60);
    const restMin = minutes % 60;
    const hPart = `${hours} time${hours === 1 ? "" : "r"}`;
    if (restMin === 0) return hPart;
    return `${hPart} og ${restMin} minutt${restMin === 1 ? "" : "er"}`;
  }

  // Format en kort nedtelling, f.eks. "9:58" eller "0:45".
  function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  const errorBorder = "rgba(224,124,124,0.7)";
  const fieldStyle = (key: keyof FieldErrors): React.CSSProperties =>
    fieldErrors[key] ? { borderColor: errorBorder } : {};

  const ErrorText = ({ msg }: { msg?: string }) =>
    msg ? (
      <p className="font-mono text-[11px] mt-2" style={{ color: "#e07c7c", letterSpacing: "0.04em" }}>
        {msg}
      </p>
    ) : null;

  return (
    <section
      id="kontakt"
      className="relative w-full"
      style={{ paddingTop: "clamp(80px,10vw,140px)", paddingBottom: "clamp(80px,10vw,140px)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 60% at 70% 40%, rgba(200,154,74,0.06), transparent 70%)" }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <FadeIn className="md:col-span-5">
            <div className="mb-8"><span className="section-label">Første steg</span></div>
            <h2
              className="font-display font-normal"
              style={{
                fontSize: "clamp(32px,4.5vw,56px)",
                lineHeight: 1.05,
                color: "hsl(var(--text))",
                letterSpacing: "-0.015em",
              }}
            >
              Avtal <span className="italic-display">en uforpliktende prat</span>
            </h2>
            <p className="mt-8" style={{ color: "hsl(var(--text-dim))", fontSize: 16, lineHeight: 1.75 }}>
              30 minutter. Ingen forberedelser. Vi lytter, du forteller. Hvis det er en match, foreslår vi et neste steg. Hvis ikke, skilles vi som venner.
            </p>
          </FadeIn>

          <FadeIn delay={0.15} className="md:col-span-7">
            {status === "done" ? (
              <div
                role="status"
                aria-live="polite"
                className="p-10 md:p-12"
                style={{
                  border: "1px solid hsl(var(--gold))",
                  borderRadius: 4,
                  background: "rgba(200,154,74,0.04)",
                  animation: "heroFade 0.6s ease",
                }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--gold))" }}>
                  Forespørsel mottatt
                </div>
                <h3 className="font-display italic" style={{ fontSize: "clamp(32px,4vw,44px)", color: "hsl(var(--gold))", lineHeight: 1 }}>
                  Takk, {form.name.split(" ")[0] || "du"}.
                </h3>
                <p className="font-display mt-5" style={{ fontSize: "clamp(18px,1.6vw,22px)", color: "hsl(var(--text))", lineHeight: 1.4 }}>
                  Vi tar kontakt innen én arbeidsdag.
                </p>
                <p className="mt-4" style={{ color: "hsl(var(--text-faint))", fontSize: 14, lineHeight: 1.7 }}>
                  Bekreftelse er sendt internt. Trenger du noe akutt, send en e-post til{" "}
                  <a href="mailto:adrian@mindmatter.no" className="underline" style={{ color: "hsl(var(--gold))" }}>
                    adrian@mindmatter.no
                  </a>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ name: "", company: "", email: "", phone: "", message: "" });
                    setFieldErrors({});
                    setFormError(null);
                    setStatus("idle");
                    setCaptchaToken(null);
                    captchaRef.current?.resetCaptcha();
                    mountedAtRef.current = Date.now();
                  }}
                  className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors"
                  style={{ color: "hsl(var(--text-dim))" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--gold))")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--text-dim))")}
                >
                  ← Send en ny forespørsel
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6" noValidate>
                <fieldset disabled={status === "submitting"} className="space-y-6 border-0 p-0 m-0 disabled:opacity-70 transition-opacity">
                {/* Honeypot — hidden from users, often filled by bots */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-10000px",
                    width: 1,
                    height: 1,
                    overflow: "hidden",
                  }}
                >
                  <label htmlFor="website_url">Nettsted (la stå tom)</label>
                  <input
                    id="website_url"
                    name="website_url"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    ref={honeypotRef}
                    defaultValue=""
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="field-label" htmlFor="name">Navn</label>
                    <input
                      id="name"
                      className="input-field"
                      style={fieldStyle("name")}
                      placeholder="Ditt navn"
                      value={form.name}
                      onChange={update("name")}
                      aria-invalid={!!fieldErrors.name}
                      aria-describedby={fieldErrors.name ? "name-err" : undefined}
                    />
                    <span id="name-err"><ErrorText msg={fieldErrors.name} /></span>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="company">Bedrift</label>
                    <input
                      id="company"
                      className="input-field"
                      style={fieldStyle("company")}
                      placeholder="Bedriftsnavn"
                      value={form.company}
                      onChange={update("company")}
                      aria-invalid={!!fieldErrors.company}
                      aria-describedby={fieldErrors.company ? "company-err" : undefined}
                    />
                    <span id="company-err"><ErrorText msg={fieldErrors.company} /></span>
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="email">E-post</label>
                  <input
                    id="email"
                    type="email"
                    className="input-field"
                    style={fieldStyle("email")}
                    placeholder="navn@bedrift.no"
                    value={form.email}
                    onChange={update("email")}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-err" : undefined}
                  />
                  <span id="email-err"><ErrorText msg={fieldErrors.email} /></span>
                </div>
                <div>
                  <label className="field-label" htmlFor="phone">Telefon <span style={{ color: "hsl(var(--text-faint))", fontWeight: 400 }}>(valgfritt)</span></label>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    className="input-field"
                    style={fieldStyle("phone")}
                    placeholder="+47 000 00 000"
                    value={form.phone}
                    onChange={update("phone")}
                    aria-invalid={!!fieldErrors.phone}
                    aria-describedby={fieldErrors.phone ? "phone-err" : undefined}
                  />
                  <span id="phone-err"><ErrorText msg={fieldErrors.phone} /></span>
                </div>
                <div>
                  <label className="field-label" htmlFor="message">Fortell kort hva du sliter med</label>
                  <textarea
                    id="message"
                    rows={5}
                    className="input-field resize-none"
                    style={fieldStyle("message")}
                    placeholder="Hva skulle du ønske bare fungerte?"
                    value={form.message}
                    onChange={update("message")}
                    aria-invalid={!!fieldErrors.message}
                    aria-describedby={fieldErrors.message ? "message-err" : undefined}
                  />
                  <span id="message-err"><ErrorText msg={fieldErrors.message} /></span>
                </div>
                <div>
                  {devBypass ? (
                    <div
                      role="status"
                      className="font-mono text-[11px] uppercase tracking-[0.2em] p-3"
                      style={{
                        border: "1px dashed hsl(var(--gold))",
                        color: "hsl(var(--gold))",
                        background: "rgba(200,154,74,0.06)",
                      }}
                    >
                      Dev-bypass aktiv — hCaptcha er deaktivert
                    </div>
                  ) : (
                    <HCaptcha
                      ref={captchaRef}
                      sitekey={HCAPTCHA_SITE_KEY}
                      theme="dark"
                      onVerify={(token) => {
                        setCaptchaToken(token);
                        if (formError) setFormError(null);
                      }}
                      onExpire={() => setCaptchaToken(null)}
                      onError={() => setCaptchaToken(null)}
                    />
                  )}
                </div>
                {formError && (
                  <div role="alert" aria-live="polite">
                    <p className="font-mono text-[12px]" style={{ color: "#e07c7c" }}>{formError}</p>
                    {retryAt !== null && retryRemaining > 0 && (
                      <p
                        className="font-mono text-[11px] mt-2"
                        style={{ color: "hsl(var(--text-dim))", letterSpacing: "0.04em" }}
                        aria-live="polite"
                      >
                        Kan sende igjen om{" "}
                        <span style={{ color: "hsl(var(--gold))" }}>
                          {formatCountdown(retryRemaining)}
                        </span>
                      </p>
                    )}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={status === "submitting" || !captchaToken}
                  className="btn-primary disabled:cursor-not-allowed"
                  style={{ fontSize: 17, opacity: status === "submitting" || !captchaToken ? 0.85 : 1 }}
                  aria-busy={status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <span
                        aria-hidden
                        className="inline-block rounded-full"
                        style={{
                          width: 14,
                          height: 14,
                          border: "2px solid hsl(var(--bg))",
                          borderTopColor: "transparent",
                          animation: "spin 0.7s linear infinite",
                        }}
                      />
                      Sender…
                    </>
                  ) : (
                    <>Send forespørsel →</>
                  )}
                </button>
                </fieldset>
              </form>
            )}
          </FadeIn>
        </div>
      </div>
    </section>
  );
};
