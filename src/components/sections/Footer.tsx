import { LogoMark } from "../LogoMark";

export const Footer = () => (
  <footer style={{ borderTop: "1px solid hsl(var(--border))", padding: "clamp(28px,4vw,44px)" }}>
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="flex items-center gap-3">
        <LogoMark size={28} />
        <span className="font-display text-[16px] font-medium" style={{ color: "hsl(var(--text))" }}>Mind & Matter</span>
      </div>
      <div className="font-mono text-[12px] text-right md:text-right" style={{ color: "hsl(var(--text-faint))" }}>
        <div>Organisasjonsnummer: 936717691</div>
        <div>© 2026 Mind & Matter</div>
      </div>
    </div>
  </footer>
);
