import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GrainOverlay } from "@/components/GrainOverlay";
import { LogoMark } from "@/components/LogoMark";

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) navigate("/admin", { replace: true });
  }, [loading, session, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        setInfo("Sjekk e-posten din for å bekrefte kontoen.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err?.message ?? "Noe gikk galt.");
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    if (error) setError("Google-pålogging feilet. Prøv igjen.");
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-6">
      <GrainOverlay />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(200,154,74,0.08), transparent 70%)" }}
      />
      <div className="relative w-full max-w-[440px]">
        <a href="/" className="flex items-center gap-3 mb-10 justify-center">
          <LogoMark size={32} />
          <span className="font-display text-[18px] font-medium" style={{ color: "hsl(var(--text))" }}>
            Mind & Matter
          </span>
        </a>

        <div
          className="p-8 md:p-10"
          style={{ border: "1px solid hsl(var(--border))", borderRadius: 4, background: "hsl(var(--bg-2))" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--gold))" }}>
            Adminpanel
          </div>
          <h1 className="font-display font-normal mb-8" style={{ fontSize: 32, color: "hsl(var(--text))", lineHeight: 1.1 }}>
            {mode === "signin" ? "Logg inn" : "Opprett konto"}
          </h1>

          <button onClick={onGoogle} type="button" className="btn-secondary w-full justify-center mb-6">
            Fortsett med Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>eller</span>
            <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="field-label" htmlFor="email">E-post</label>
              <input id="email" type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Passord</label>
              <input id="password" type="password" required minLength={6} className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="font-mono text-[12px]" style={{ color: "#e07c7c" }}>{error}</p>}
            {info && <p className="font-mono text-[12px]" style={{ color: "hsl(var(--gold))" }}>{info}</p>}
            <button type="submit" disabled={busy} className="btn-primary w-full justify-center" style={{ fontSize: 16 }}>
              {busy ? "Vent…" : mode === "signin" ? "Logg inn" : "Opprett konto"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setInfo(null); }}
            className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] block w-full text-center transition-colors"
            style={{ color: "hsl(var(--text-faint))" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--gold))")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(var(--text-faint))")}
          >
            {mode === "signin" ? "Trenger konto? Opprett en →" : "Har konto? Logg inn →"}
          </button>
        </div>

        <p className="mt-6 text-center font-mono text-[11px]" style={{ color: "hsl(var(--text-faint))" }}>
          Tilgang gis kun til administratorer.
        </p>
      </div>
    </main>
  );
}
