export const Hero = () => {
  return (
    <section
      id="top"
      className="relative w-full"
      style={{ paddingTop: "clamp(140px, 18vw, 180px)", paddingBottom: "clamp(80px, 10vw, 120px)" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(200,154,74,0.07), transparent 70%)",
        }}
      />
      <div className="relative max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="hero-fade delay-1 mb-10">
          <span className="section-label">Norsk AI-infrastruktur for små og mellomstore bedrifter</span>
        </div>
        <h1
          className="hero-fade delay-2 font-display font-normal max-w-[14ch]"
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            lineHeight: 0.94,
            letterSpacing: "-0.02em",
            color: "hsl(var(--text))",
          }}
        >
          Vi bygger <span className="italic-display">bedriftshjerner</span> som faktisk jobber for deg
        </h1>
        <p
          className="hero-fade delay-3 mt-10 max-w-[580px]"
          style={{
            fontSize: "clamp(16px, 1.4vw, 20px)",
            lineHeight: 1.6,
            fontWeight: 300,
            color: "hsl(var(--text-dim))",
          }}
        >
          Samler kunnskapen din. Kobler sammen verktøyene du allerede bruker. Leverer AI-assistenter
          som forstår bransjen din — som bor i vår egen infrastruktur i skyen.
        </p>
        <div className="hero-fade delay-4 mt-12 flex flex-wrap gap-4">
          <a href="#kontakt" className="btn-primary">Avtal en uforpliktende prat →</a>
          <a href="#tjenester" className="btn-secondary">Se hva vi leverer</a>
        </div>

        <div
          className="hero-fade delay-5 mt-20 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 pt-10"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          {[
            { label: "Hosting", big: "Vår sky", sub: "Ikke hos Big Tech" },
            { label: "Integrasjon", big: "Eksisterende verktøy", sub: "Ingen riving" },
            { label: "Tilnærming", big: "Skreddersøm", sub: "Ingen maler" },
            { label: "Drift", big: "Vi tar det", sub: "Du slipper" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold))] mb-3">
                {s.label}
              </div>
              <div className="font-display font-normal text-[clamp(20px,2vw,26px)] leading-tight" style={{ color: "hsl(var(--text))" }}>
                {s.big}
              </div>
              <div className="text-[13px] mt-2" style={{ color: "hsl(var(--text-faint))" }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
