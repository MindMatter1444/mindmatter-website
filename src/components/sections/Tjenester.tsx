import { FadeIn } from "../FadeIn";

const services = [
  { num: "01", tag: "Infrastruktur", title: "Bedriftshjerne", subtitle: "Kunnskapen din, samlet og søkbar", body: "All dokumentasjon, prosedyrer, kundehistorikk og erfaring — samlet ett sted og tilgjengelig for både mennesker og AI. Grunnmuren alt annet bygges på." },
  { num: "02", tag: "Produkt", title: "Skreddersydde assistenter", subtitle: "Bygget for din bransje, ditt språk", body: "Ikke en generisk chatbot. Assistenter som kjenner fagspråket ditt, rutinene dine og kundene dine — og som faktisk gjør jobben." },
  { num: "03", tag: "Arbeidsflyt", title: "Systemintegrasjon", subtitle: "Kobler sammen det du allerede bruker", body: "Cordel, Tripletex, Outlook, Teams — vi river ikke ned. Vi binder sammen det du har fra før til noe som faktisk flyter. Mindre dobbeltarbeid, mer tid til faget." },
  { num: "04", tag: "Hosting", title: "Egen drift", subtitle: "Løsningen bor hos oss i skyen — du bare bruker den", body: "Du skal ikke måtte lære deg servere, modeller eller vedlikehold. Vi setter opp og drifter alt på vår egen infrastruktur — i skyen, ikke hos Big Tech." },
];

export const Tjenester = () => (
  <section
    id="tjenester"
    className="w-full"
    style={{ paddingTop: "clamp(80px,10vw,140px)", paddingBottom: "clamp(80px,10vw,140px)" }}
  >
    <div className="max-w-[1400px] mx-auto px-6 md:px-12">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 mb-16">
        <FadeIn className="md:col-span-7">
          <div className="mb-8"><span className="section-label">Det vi leverer</span></div>
          <h2
            className="font-display font-normal"
            style={{
              fontSize: "clamp(32px,4.5vw,56px)",
              lineHeight: 1.05,
              color: "hsl(var(--text))",
              letterSpacing: "-0.015em",
            }}
          >
            <span className="italic-display">Fire</span> deler<br />Én plattform
          </h2>
        </FadeIn>
        <FadeIn delay={0.15} className="md:col-span-5 md:pt-20">
          <p style={{ color: "hsl(var(--text-faint))", fontSize: 16, lineHeight: 1.75, maxWidth: 420 }}>
            Du trenger sjelden alt på én gang. Vi starter der smerten er størst og bygger videre når du ser verdien.
          </p>
        </FadeIn>
      </div>

      <FadeIn delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: "hsl(var(--border))" }}>
          {services.map((s) => (
            <div
              key={s.num}
              className="group transition-colors duration-300"
              style={{ background: "hsl(var(--bg))", padding: "clamp(28px,4vw,48px)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "hsl(var(--bg-2))")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "hsl(var(--bg))")}
            >
              <div className="flex items-center justify-between mb-10">
                <span className="font-mono text-[13px]" style={{ color: "rgba(200,154,74,0.55)" }}>{s.num}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>{s.tag}</span>
              </div>
              <h3 className="font-display font-normal transition-colors duration-300 group-hover:text-[hsl(var(--gold))]" style={{ fontSize: "clamp(24px,2.4vw,32px)", color: "hsl(var(--text))", lineHeight: 1.15 }}>
                {s.title}
              </h3>
              <p className="font-display italic mt-3" style={{ fontSize: 18, color: "rgba(200,154,74,0.8)" }}>
                {s.subtitle}
              </p>
              <p className="mt-6" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.75 }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </FadeIn>
    </div>
  </section>
);
