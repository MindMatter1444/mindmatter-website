import { FadeIn } from "../FadeIn";

export const OmOss = () => (
  <section
    id="oss"
    className="w-full"
    style={{
      background: "hsl(var(--bg-2))",
      borderTop: "1px solid hsl(var(--border))",
      borderBottom: "1px solid hsl(var(--border))",
      paddingTop: "clamp(80px,10vw,140px)",
      paddingBottom: "clamp(80px,10vw,140px)",
    }}
  >
    <div className="max-w-[1400px] mx-auto px-6 md:px-12">
      <FadeIn className="mb-16">
        <div className="mb-8"><span className="section-label">Hvem vi er</span></div>
        <h2
          className="font-display font-normal max-w-[16ch]"
          style={{
            fontSize: "clamp(32px,4.5vw,56px)",
            lineHeight: 1.05,
            color: "hsl(var(--text))",
            letterSpacing: "-0.015em",
            whiteSpace: "pre-line",
          }}
        >
          To <span className="italic-display">mennesker</span> —{"\n"}Én overbevisning
        </h2>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
        <FadeIn delay={0.1}>
          <div className="pl-6 md:pl-8" style={{ borderLeft: "2px solid rgba(200,154,74,0.4)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--gold))" }}>
              Adrian Helge Olsen — Medgrunnlegger
            </div>
            <h3 className="font-display" style={{ fontSize: "clamp(22px,2.2vw,28px)", color: "hsl(var(--text))", lineHeight: 1.2 }}>
              Rørlegger som bygger verktøyene han skulle ønske fantes.
            </h3>
            <p className="mt-6" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.75 }}>
              Adrian jobber fortsatt som rørlegger. Det er derfor VVS-AI ble bygget slik det ble — fordi han vet hvordan det er å stå i en kjeller sent på dagen og trenger svar nå. Den samme tilnærmingen tar de med til alle kunder: løsningen skal fungere i virkeligheten, ikke bare på demo.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="pl-6 md:pl-8" style={{ borderLeft: "2px solid rgba(200,154,74,0.4)" }}>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--gold))" }}>
              Jan Helge Olsen — Medgrunnlegger & Systemarkitekt
            </div>
            <h3 className="font-display" style={{ fontSize: "clamp(22px,2.2vw,28px)", color: "hsl(var(--text))", lineHeight: 1.2 }}>
              Erfaren konsulent og løsningsarkitekt
            </h3>
            <p className="mt-6" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.75 }}>
              Jan har lang erfaring som løsningsarkitekt og strategisk rådgiver i skjæringspunktet mellom komplekse forretningsbehov og teknisk utførelse — for offentlig forvaltning, samferdsel, forsvar og store norske virksomheter. Det er den samme standarden han tar med inn i Mind & Matter.
            </p>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={0.25} className="mt-20">
        <div
          className="p-8 md:p-12"
          style={{
            border: "1px solid rgba(200,154,74,0.18)",
            background: "rgba(200,154,74,0.04)",
            borderRadius: 4,
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-6" style={{ color: "hsl(var(--gold))" }}>
            Hvem vi bygger for
          </div>
          <p
            className="font-display"
            style={{
              fontSize: "clamp(18px,2.2vw,26px)",
              lineHeight: 1.4,
              color: "hsl(var(--text))",
              maxWidth: "60ch",
            }}
          >
            «Vi bygger gjerne for bedrifter som vil etterlate noe bedre enn de fant det — enten det er bransjen, lokalsamfunnet eller kundene sine. <span className="italic-display">Den nye verden bygges av dem som tar ansvar for den.</span>»
          </p>
        </div>
      </FadeIn>
    </div>
  </section>
);
