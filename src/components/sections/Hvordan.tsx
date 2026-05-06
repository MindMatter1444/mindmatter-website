import { FadeIn } from "../FadeIn";

const rows = [
  { num: "01", title: "En uforpliktende prat", time: "30 min", body: "Vi snakker om hvor skoen trykker. Ingen salgspitch — vi vil forstå arbeidshverdagen din først." },
  { num: "02", title: "Kartlegging", time: "1–2 uker", body: "Vi ser på verktøyene, rutinene og flaskehalsene. Lager et konkret forslag til hva som gir mest igjen per krone." },
  { num: "03", title: "Pilot", time: "2–6 uker", body: "Vi starter forsiktig hos deg, med noe konkret som virker. Så forbedrer vi i små steg – i ditt tempo." },
  { num: "04", title: "Drift & utvidelse", time: "Løpende", body: "Vi sørger for at løsningen din fungerer – og blir bedre over tid. Du får én partner — ikke en portefølje av leverandører." },
];

export const Hvordan = () => (
  <section
    id="hvordan"
    className="w-full"
    style={{ paddingTop: "clamp(80px,10vw,140px)", paddingBottom: "clamp(80px,10vw,140px)" }}
  >
    <div className="max-w-[1400px] mx-auto px-6 md:px-12">
      <FadeIn className="mb-16">
        <div className="mb-8"><span className="section-label">Slik jobber vi</span></div>
        <h2
          className="font-display font-normal max-w-[18ch]"
          style={{
            fontSize: "clamp(32px,4.5vw,56px)",
            lineHeight: 1.05,
            color: "hsl(var(--text))",
            letterSpacing: "-0.015em",
            whiteSpace: "pre-line",
          }}
        >
          Ingen store prosjekter{"\n"}<span className="italic-display">Små steg</span> — Ekte verdi
        </h2>
      </FadeIn>

      <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
        {rows.map((r, i) => (
          <FadeIn key={r.num} delay={i * 0.08}>
            <div
              className="grid grid-cols-12 gap-4 md:gap-8 py-8 md:py-10 transition-colors duration-300"
              style={{ borderBottom: "1px solid hsl(var(--border))" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,154,74,0.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div className="col-span-2 md:col-span-1 font-mono text-[13px]" style={{ color: "rgba(200,154,74,0.55)" }}>{r.num}</div>
              <div className="col-span-10 md:col-span-3 font-display" style={{ fontSize: "clamp(20px,2vw,26px)", color: "hsl(var(--text))", lineHeight: 1.15 }}>{r.title}</div>
              <div className="col-span-2 md:col-span-2 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--gold))" }}>{r.time}</div>
              <div className="col-span-10 md:col-span-6" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.75 }}>{r.body}</div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  </section>
);
