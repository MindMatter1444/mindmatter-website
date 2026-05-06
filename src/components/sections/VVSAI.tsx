import { FadeIn } from "../FadeIn";

const steps = [
  { label: "Der vi startet", active: false, title: "Custom GPT + Actions", body: "Konseptet ble bevist: en assistent som vet hvilke jobber som er aktive, kan svare på spørsmål og lage dokumentasjon. Fungerte i felt fra dag én." },
  { label: "Der vi er nå", active: true, title: "Egen sky-infrastruktur", body: "Migrerer til vår egen server — i skyen, ikke hos OpenAI eller Microsoft. Full kontroll over data, modell og drift. GDPR på norske premisser." },
  { label: "Der vi tar deg", active: false, title: "Samme arkitektur, din bransje", body: "Infrastrukturen vi bygger for oss selv er den samme vi tilbyr kunder. Du får ikke en prototype — du får systemet vi stoler på selv." },
];

export const VVSAI = () => (
  <section
    id="vvsai"
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <FadeIn className="md:col-span-5">
          <div className="mb-8"><span className="section-label">Bevis, ikke pitch</span></div>
          <h2
            className="font-display font-normal"
            style={{
              fontSize: "clamp(32px,4.5vw,52px)",
              lineHeight: 1.05,
              color: "hsl(var(--text))",
              letterSpacing: "-0.015em",
            }}
          >
            Vi bruker det vi bygger — <span className="italic-display">daglig</span>
          </h2>
          <p className="mt-8" style={{ color: "hsl(var(--text-dim))", fontSize: 16, lineHeight: 1.75 }}>
            VVS-AI ble til fordi Adrian trengte det selv. En feltassistent som kjenner jobblisten, lager rapporter på sekunder og håndterer oppfølging — fra mobilen, i felt.
          </p>
          <p className="mt-6" style={{ color: "hsl(var(--text-faint))", fontSize: 15, lineHeight: 1.75 }}>
            Det er ikke et skoleeksempel. Det er en løsning som har vært i drift, feilet, blitt forbedret og som fortsetter å vokse. Samme tilnærming tar vi med til deg.
          </p>
        </FadeIn>

        <div className="md:col-span-7 space-y-10">
          {steps.map((s, i) => (
            <FadeIn key={i} delay={0.15 + i * 0.1}>
              <div
                className="pl-6 md:pl-8"
                style={{
                  borderLeft: s.active ? "2px solid hsl(var(--gold))" : "2px solid rgba(200,154,74,0.25)",
                }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: s.active ? "hsl(var(--gold))" : "hsl(var(--text-faint))" }}>
                  {s.label}
                </div>
                <h3 className="font-display" style={{ fontSize: 22, color: s.active ? "hsl(var(--text))" : "hsl(var(--text-dim))", lineHeight: 1.2 }}>
                  {s.title}
                </h3>
                <p className="mt-3" style={{ color: s.active ? "hsl(var(--text-dim))" : "hsl(var(--text-faint))", fontSize: 15, lineHeight: 1.75 }}>
                  {s.body}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  </section>
);
