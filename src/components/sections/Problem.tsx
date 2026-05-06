import { FadeIn } from "../FadeIn";

export const Problem = () => (
  <section
    id="problem"
    className="w-full"
    style={{
      background: "hsl(var(--bg-2))",
      borderTop: "1px solid hsl(var(--border))",
      borderBottom: "1px solid hsl(var(--border))",
      paddingTop: "clamp(80px, 10vw, 140px)",
      paddingBottom: "clamp(80px, 10vw, 140px)",
    }}
  >
    <div className="max-w-[1400px] mx-auto px-6 md:px-12">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <FadeIn className="md:col-span-5">
          <div className="mb-8"><span className="section-label">Problemet</span></div>
          <h2
            className="font-display font-normal"
            style={{
              fontSize: "clamp(32px, 4.5vw, 56px)",
              lineHeight: 1.05,
              color: "hsl(var(--text))",
              letterSpacing: "-0.015em",
            }}
          >
            Kunnskapen er <span className="italic-display">spredt</span><br />
            Tiden er <span className="italic-display">knapp</span>
          </h2>
        </FadeIn>
        <FadeIn delay={0.15} className="md:col-span-7">
          <p style={{ color: "hsl(var(--text-dim))", fontSize: "clamp(15px,1.15vw,17px)", lineHeight: 1.75 }}>
            Du har dokumenter i Dropbox. Kundehistorikk i Cordel. E-poster i Outlook. Prosedyrer i en perm på kontoret. Fagfolk som vet ting ingen andre vet.
          </p>
          <p className="mt-6" style={{ color: "hsl(var(--text-faint))", fontSize: "clamp(15px,1.15vw,17px)", lineHeight: 1.75 }}>
            Når noe skal finnes — eller en ny ansatt skal læres opp — koster det tid, energi og feil. Generisk AI hjelper ikke: den vet ingenting om din bedrift.
          </p>
          <p className="mt-10 font-display" style={{ fontSize: 22, color: "hsl(var(--gold))" }}>
            → Løsningen er en bedriftshjerne.
          </p>
        </FadeIn>
      </div>

      <FadeIn delay={0.2} className="mt-20">
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ border: "1px solid rgba(200,154,74,0.22)", borderRadius: 4 }}
        >
          <div className="p-8 md:p-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--gold))] mb-6">INN</div>
            <h3 className="font-display italic mb-6" style={{ fontSize: 24, color: "hsl(var(--text))" }}>
              Informasjon fra
            </h3>
            <ul className="space-y-3" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.6 }}>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Dokumenter & prosedyrer</span></li>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Kundedata & historikk</span></li>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>E-post & korrespondanse</span></li>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Fagkunnskap fra folka</span></li>
            </ul>
          </div>
          <div
            className="p-8 md:p-10"
            style={{
              borderLeft: "1px solid rgba(200,154,74,0.6)",
              borderRight: "1px solid rgba(200,154,74,0.6)",
              background: "rgba(200,154,74,0.03)",
            }}
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--gold))] mb-6">BEDRIFTSHJERNEN</div>
            <h3 className="font-display italic" style={{ fontSize: 24, color: "hsl(var(--text))" }}>
              Samler — Forstår — Husker
            </h3>
            <p className="mt-4" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.7 }}>
              En strukturert kunnskapsbase som både mennesker og AI bruker. Du eier alt — lagret sikkert, tilgjengelig når du trenger det.
            </p>
          </div>
          <div className="p-8 md:p-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--gold))] mb-6">→ UT</div>
            <h3 className="font-display italic mb-6" style={{ fontSize: 24, color: "hsl(var(--text))" }}>
              Understøtter og beriker
            </h3>
            <ul className="space-y-3" style={{ color: "hsl(var(--text-dim))", fontSize: 15, lineHeight: 1.6 }}>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Kundeservice 24/7</span></li>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Feltassistent på mobil</span></li>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Onboarding av nye medarbeidere</span></li>
              <li className="flex gap-3"><span className="text-[hsl(var(--gold))]">→</span><span>Raskere tilbud & rapporter</span></li>
            </ul>
          </div>
        </div>
      </FadeIn>
    </div>
  </section>
);
