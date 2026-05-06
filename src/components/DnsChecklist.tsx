import { useEffect, useState } from "react";

type CheckState = "loading" | "ok" | "missing" | "mismatch" | "error";

type RecordCheck = {
  label: string;
  type: "NS" | "TXT";
  name: string;
  expected: string[];
  matchMode: "all" | "any";
  found: string[];
  state: CheckState;
  error?: string;
};

const DOMAIN = "mindmatter.no";

const EXPECTED_NS = ["gigi.ns.cloudflare.com", "trevor.ns.cloudflare.com"];

type DohAnswer = { name: string; type: number; data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

const normalize = (v: string) => v.replace(/\.$/, "").replace(/^"|"$/g, "").trim().toLowerCase();

async function queryDoh(name: string, type: "NS" | "TXT"): Promise<string[]> {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { Accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS lookup feilet (${res.status})`);
  const json: DohResponse = await res.json();
  if (!json.Answer) return [];
  return json.Answer.filter((a) => (type === "NS" ? a.type === 2 : a.type === 16)).map((a) => normalize(a.data));
}

const StatusBadge = ({ state }: { state: CheckState }) => {
  const map: Record<CheckState, { label: string; bg: string; fg: string }> = {
    loading: { label: "Sjekker…", bg: "hsl(var(--bg-2))", fg: "hsl(var(--text-dim))" },
    ok: { label: "OK", bg: "hsl(140 60% 18%)", fg: "hsl(140 70% 75%)" },
    missing: { label: "Mangler", bg: "hsl(0 60% 20%)", fg: "hsl(0 80% 80%)" },
    mismatch: { label: "Feil verdi", bg: "hsl(35 70% 20%)", fg: "hsl(35 90% 75%)" },
    error: { label: "Oppslagsfeil", bg: "hsl(var(--bg-2))", fg: "hsl(var(--text-dim))" },
  };
  const s = map[state];
  return (
    <span
      style={{
        background: s.bg,
        color: s.fg,
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
};

export function DnsChecklist() {
  const initial: RecordCheck[] = [
    {
      label: "NS-delegering til Cloudflare",
      type: "NS",
      name: DOMAIN,
      expected: EXPECTED_NS,
      matchMode: "all",
      found: [],
      state: "loading",
    },
  ];

  const [checks, setChecks] = useState<RecordCheck[]>(initial);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await Promise.all(
        initial.map(async (c) => {
          try {
            const found = await queryDoh(c.name, c.type);
            if (found.length === 0) return { ...c, found, state: "missing" as CheckState };

            const expectedSet = new Set(c.expected.map(normalize));
            const allPresent = [...expectedSet].every((e) => found.includes(e));
            return { ...c, found, state: allPresent ? "ok" : "mismatch" } as RecordCheck;
          } catch (e) {
            return { ...c, state: "error" as CheckState, error: (e as Error).message };
          }
        }),
      );
      if (!cancelled) {
        setChecks(next);
        setLastChecked(new Date());
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const allOk = checks.every((c) => c.state === "ok");

  return (
    <section
      style={{
        background: "hsl(var(--bg-2))",
        border: "1px solid hsl(var(--line))",
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "hsl(var(--text))", margin: 0 }}>
          DNS-sjekkliste · {DOMAIN}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge state={allOk ? "ok" : checks.some((c) => c.state === "loading") ? "loading" : "mismatch"} />
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            style={{
              background: "hsl(var(--bg))",
              color: "hsl(var(--text))",
              border: "1px solid hsl(var(--line))",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sjekk på nytt
          </button>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "hsl(var(--text-dim))", margin: "0 0 16px" }}>
        Live-oppslag mot Google Public DNS (8.8.8.8). Kan ta opp til 72 t å propagere etter endringer.
        {lastChecked && ` · Sist sjekket ${lastChecked.toLocaleTimeString("no-NO")}`}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {checks.map((c) => (
          <div
            key={`${c.type}-${c.name}`}
            style={{
              background: "hsl(var(--bg))",
              border: "1px solid hsl(var(--line))",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "hsl(var(--text))" }}>
                  {c.label} <span style={{ color: "hsl(var(--text-dim))", fontWeight: 400 }}>({c.type})</span>
                </div>
                <div style={{ fontSize: 12, color: "hsl(var(--text-dim))", marginTop: 2 }}>{c.name}</div>
              </div>
              <StatusBadge state={c.state} />
            </div>

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
              <div>
                <div style={{ color: "hsl(var(--text-dim))", marginBottom: 4 }}>Forventet</div>
                {c.expected.map((e) => (
                  <div key={e} style={{ color: "hsl(var(--text))", fontFamily: "monospace" }}>
                    {e}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ color: "hsl(var(--text-dim))", marginBottom: 4 }}>Funnet</div>
                {c.found.length === 0 ? (
                  <div style={{ color: "hsl(var(--text-dim))", fontStyle: "italic" }}>
                    {c.state === "loading" ? "…" : c.error || "ingen records"}
                  </div>
                ) : (
                  c.found.map((f) => {
                    const ok = c.expected.map(normalize).includes(f);
                    return (
                      <div
                        key={f}
                        style={{
                          color: ok ? "hsl(140 70% 75%)" : "hsl(35 90% 75%)",
                          fontFamily: "monospace",
                          wordBreak: "break-all",
                        }}
                      >
                        {f}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!allOk && (
        <p style={{ fontSize: 12, color: "hsl(var(--text-dim))", marginTop: 14, marginBottom: 0 }}>
          Hvis noe mangler: sett riktige nameservers hos domeneleverandøren og vent på propagering (opptil 72t).
        </p>
      )}
    </section>
  );
}