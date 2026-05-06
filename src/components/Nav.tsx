import { useEffect, useState } from "react";
import { LogoMark } from "./LogoMark";

const SECTIONS = [
  { href: "#problem", id: "problem", label: "Problem" },
  { href: "#tjenester", id: "tjenester", label: "Tjenester" },
  { href: "#vvsai", id: "vvsai", label: "VVS-AI" },
  { href: "#oss", id: "oss", label: "Oss" },
];

export const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = SECTIONS
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (targets.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size === 0) {
          setActive(null);
          return;
        }
        // Choose the section that is most prominently in view.
        let bestId: string | null = null;
        let bestRatio = -1;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        setActive(bestId);
      },
      {
        // Offset top by navbar height so a section becomes "active"
        // as soon as it crosses below the navbar.
        rootMargin: "-96px 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled || open ? "rgba(20,18,16,0.92)" : "transparent",
        backdropFilter: scrolled || open ? "blur(12px)" : "none",
        borderBottom: scrolled || open ? "1px solid hsl(var(--border))" : "1px solid transparent",
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <LogoMark size={30} />
          <span className="font-display text-[17px] font-medium" style={{ color: "hsl(var(--text))" }}>
            Mind & Matter
          </span>
        </a>
        <div className="hidden md:flex items-center gap-10">
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={s.href}
                aria-current={isActive ? "true" : undefined}
                className="group relative font-mono text-[12px] uppercase tracking-[0.15em] hover:text-[hsl(var(--gold))] focus-visible:text-[hsl(var(--gold))] focus-visible:outline-none transition-colors"
                style={{ color: isActive ? "hsl(var(--gold))" : "hsl(var(--text-dim))" }}
              >
                {s.label}
                <span
                  aria-hidden
                  className={`absolute left-0 -bottom-1.5 h-px origin-left transition-transform duration-300 ease-out w-full ${
                    isActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  }`}
                  style={{ background: "hsl(var(--gold))" }}
                />
              </a>
            );
          })}
          <a
            href="#kontakt"
            className="font-display text-[14px] px-5 py-2.5 rounded-[2px] border transition-all duration-300"
            style={{ borderColor: "hsl(var(--gold))", color: "hsl(var(--gold))" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--gold))"; e.currentTarget.style.color = "hsl(var(--bg))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "hsl(var(--gold))"; }}
          >
            Avtal en prat
          </a>
        </div>
        <button
          aria-label={open ? "Lukk meny" : "Åpne meny"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px]"
        >
          <span
            className="block w-6 h-px transition-transform duration-300"
            style={{
              background: "hsl(var(--gold))",
              transform: open ? "translateY(3px) rotate(45deg)" : "none",
            }}
          />
          <span
            className="block w-6 h-px transition-transform duration-300"
            style={{
              background: "hsl(var(--gold))",
              transform: open ? "translateY(-3px) rotate(-45deg)" : "none",
            }}
          />
        </button>
      </div>
      {open && (
        <div
          className="md:hidden px-6 pb-8 pt-2 flex flex-col gap-6"
          style={{ background: "rgba(20,18,16,0.96)", backdropFilter: "blur(12px)" }}
        >
          {SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                href={s.href}
                aria-current={isActive ? "true" : undefined}
                onClick={() => setOpen(false)}
                className="group relative font-mono text-[13px] uppercase tracking-[0.18em] hover:text-[hsl(var(--gold))] focus-visible:text-[hsl(var(--gold))] focus-visible:outline-none transition-colors w-fit"
                style={{ color: isActive ? "hsl(var(--gold))" : "hsl(var(--text-dim))" }}
              >
                {s.label}
                <span
                  aria-hidden
                  className={`absolute left-0 -bottom-1.5 h-px origin-left transition-transform duration-300 ease-out w-full ${
                    isActive
                      ? "scale-x-100"
                      : "scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                  }`}
                  style={{ background: "hsl(var(--gold))" }}
                />
              </a>
            );
          })}
          <a
            href="#kontakt"
            onClick={() => setOpen(false)}
            className="font-display text-[14px] px-5 py-3 rounded-[2px] border inline-block w-fit transition-colors"
            style={{ borderColor: "hsl(var(--gold))", color: "hsl(var(--gold))" }}
          >
            Avtal en prat
          </a>
        </div>
      )}
    </nav>
  );
};
