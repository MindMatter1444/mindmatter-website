import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import { GrainOverlay } from "@/components/GrainOverlay";
import { LogoMark } from "@/components/LogoMark";
import { DnsChecklist } from "@/components/DnsChecklist";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Tab = "spam" | "contact";
type SpamRow = {
  id: string; created_at: string; reason: string;
  time_on_form_ms: number | null; honeypot_value: string | null;
  payload: any; user_agent: string | null;
};
type ContactRow = {
  id: string; created_at: string; name: string; company: string | null; email: string; message: string;
};

const CSV_LIMITS: Record<Tab, number> = {
  spam: 5000,
  contact: 2000,
};
const TAB_LABELS: Record<Tab, string> = {
  spam: "spam-rader",
  contact: "forespørsler",
};
const TAB_NAMES: Record<Tab, string> = {
  spam: "Spam-logg",
  contact: "Forespørsler",
};

const csvEscape = (v: unknown) => {
  if (v == null) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadCSV = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const slugifyForFilename = (value: string, max = 30) => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
  return slug;
};

const buildExportFilename = (
  base: string,
  opts: { search: string; from: string; to: string; reason: string }
) => {
  const parts: string[] = [base];
  parts.push(`reason-${opts.reason && opts.reason !== "all" ? opts.reason : "alle"}`);
  parts.push(`${opts.from || "start"}_${opts.to || "now"}`);
  const slug = opts.search ? slugifyForFilename(opts.search) : "";
  parts.push(`q-${slug || "ingen"}`);
  parts.push(format(new Date(), "yyyyMMdd-HHmm"));
  return `${parts.join("__")}.csv`;
};

/**
 * Scrub sensitive data (PII, tokens, secrets) from arbitrary text before
 * surfacing it to the UI. Patterns are intentionally conservative —
 * false positives only mean a `[REDACTED:*]` placeholder, never lost data.
 */
const SENSITIVE_PATTERNS: Array<{ label: string; re: RegExp }> = [
  // Bearer / Authorization headers
  { label: "auth", re: /\b(?:Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+/gi },
  // JWT (three base64url segments)
  { label: "jwt", re: /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g },
  // Generic API-key style tokens (sk_, pk_, supabase ref keys, etc.)
  { label: "token", re: /\b(?:sk|pk|rk|api|key|token|secret)[_-][A-Za-z0-9_-]{16,}\b/gi },
  // Long opaque hex/base64 secrets (40+ chars)
  { label: "secret", re: /\b[A-Fa-f0-9]{40,}\b/g },
  { label: "secret", re: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g },
  // Email addresses
  { label: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  // Phone numbers (loose, intl + national)
  { label: "phone", re: /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,4}\d{2,4}/g },
  // IPv4
  { label: "ip", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  // URLs with query strings — keep host, drop query (often holds tokens)
  { label: "url-query", re: /(https?:\/\/[^\s?#]+)\?[^\s]*/g },
  // Common key=value secret pairs in query strings or stack frames
  {
    label: "kv",
    re: /\b(?:password|passwd|pwd|access_token|refresh_token|id_token|api[_-]?key|authorization|cookie|session)\s*[=:]\s*["']?[^&"'\s,;}]+/gi,
  },
  // Norwegian personnummer (11 digits)
  { label: "ssn", re: /\b\d{11}\b/g },
  // Credit-card-ish (13–19 digits, possibly grouped)
  { label: "cc", re: /\b(?:\d[ -]?){13,19}\b/g },
];

type SanitizeResult = { text: string; labels: string[]; count: number };

const sanitizeSensitive = (input: string | undefined | null): SanitizeResult => {
  if (!input) return { text: "", labels: [], count: 0 };
  let out = String(input);
  if (out.length > 8000) out = out.slice(0, 8000) + "\n…[truncated]";
  const hits = new Set<string>();
  let count = 0;
  for (const { label, re } of SENSITIVE_PATTERNS) {
    let matched = false;
    if (label === "url-query") {
      out = out.replace(re, (_m, p1) => {
        matched = true;
        count++;
        return `${p1}?[REDACTED:query]`;
      });
    } else {
      out = out.replace(re, () => {
        matched = true;
        count++;
        return `[REDACTED:${label}]`;
      });
    }
    if (matched) hits.add(label);
  }
  return { text: out, labels: [...hits], count };
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const [tab, setTab] = useState<Tab>("spam");
  const [spam, setSpam] = useState<SpamRow[]>([]);
  const [contact, setContact] = useState<ContactRow[]>([]);
  const [reason, setReason] = useState<"all" | "honeypot" | "timing">("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [fetching, setFetching] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    "idle" | "starting" | "transferring" | "downloading" | "done" | "error"
  >("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  type StepStatus = "pending" | "running" | "ok" | "failed";
  const [exportSteps, setExportSteps] = useState<{
    serialize: StepStatus;
    download: StepStatus;
  }>({ serialize: "pending", download: "pending" });
  const [exportStepErrors, setExportStepErrors] = useState<{
    serialize: {
      message: string;
      stack?: string;
      redactedLabels: string[];
      redactedCount: number;
      fieldsProcessed: number;
    } | null;
    download: {
      message: string;
      stack?: string;
      redactedLabels: string[];
      redactedCount: number;
      fieldsProcessed: number;
    } | null;
  }>({ serialize: null, download: null });
  const [showRedactionDetails, setShowRedactionDetails] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    setFetching(true);
    Promise.all([
      supabase.from("spam_log").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("contact_requests").select("*").order("created_at", { ascending: false }).limit(1000),
    ]).then(([s, c]) => {
      if (!s.error && s.data) setSpam(s.data as SpamRow[]);
      if (!c.error && c.data) setContact(c.data as ContactRow[]);
      setFetching(false);
    });
  }, [isAdmin]);

  const filteredSpam = useMemo(() => {
    return spam.filter((r) => {
      if (reason !== "all" && r.reason !== reason) return false;
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
      if (search) {
        const hay = `${r.reason} ${r.honeypot_value ?? ""} ${JSON.stringify(r.payload ?? {})} ${r.user_agent ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [spam, reason, from, to, search]);

  const filteredContact = useMemo(() => {
    return contact.filter((r) => {
      if (from && new Date(r.created_at) < new Date(from)) return false;
      if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
      if (search) {
        const hay = `${r.name} ${r.company ?? ""} ${r.email} ${r.message}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [contact, from, to, search]);

  const performExport = async () => {
    const limit = CSV_LIMITS[tab];
    const base = tab === "spam" ? "spam_log" : "contact_requests";
    const filename = buildExportFilename(base, { search, from, to, reason: tab === "spam" ? reason : "all" });

    setExportStatus("starting");
    setExportProgress(0);
    setExportError(null);
    setExportSteps({ serialize: "pending", download: "pending" });
    setExportStepErrors({ serialize: null, download: null });

    try {
      const rows =
        tab === "spam"
          ? filteredSpam.slice(0, limit).map((r) => ({
              id: r.id,
              created_at: r.created_at,
              reason: r.reason,
              time_on_form_ms: r.time_on_form_ms ?? "",
              honeypot_value: r.honeypot_value ?? "",
              payload: r.payload ?? "",
              user_agent: r.user_agent ?? "",
            }))
          : filteredContact.slice(0, limit).map((r) => ({
              id: r.id, created_at: r.created_at, name: r.name,
              company: r.company ?? "", email: r.email, message: r.message,
            }));

      if (!rows.length) {
        setExportStatus("done");
        await new Promise((r) => setTimeout(r, 600));
        setConfirmOpen(false);
        return;
      }

      // Phase 1: serialize CSV row-by-row in measurable batches.
      setExportStatus("transferring");
      setExportSteps((s) => ({ ...s, serialize: "running" }));
      const headers = Object.keys(rows[0]);
      const lines: string[] = [headers.join(",")];
      const total = rows.length;
      const batchSize = Math.max(1, Math.min(500, Math.ceil(total / 100)));
      let processed = 0;

      try {
        for (let i = 0; i < total; i += batchSize) {
          const end = Math.min(total, i + batchSize);
          for (let j = i; j < end; j++) {
            lines.push(headers.map((h) => csvEscape(rows[j][h])).join(","));
          }
          processed = end;
          setExportProgress(Math.round((processed / total) * 100));
          await new Promise((r) => setTimeout(r, 0));
        }
      } catch (err) {
        setExportSteps((s) => ({ ...s, serialize: "failed" }));
        const msg = sanitizeSensitive(err instanceof Error ? err.message : String(err));
        const stk = sanitizeSensitive(err instanceof Error ? err.stack : undefined);
        setExportStepErrors((e) => ({
          ...e,
          serialize: {
            message: msg.text,
            stack: stk.text || undefined,
            redactedLabels: [...new Set([...msg.labels, ...stk.labels])],
            redactedCount: msg.count + stk.count,
            fieldsProcessed: processed * headers.length,
          },
        }));
        throw new Error(
          `CSV-serialisering feilet etter ${processed}/${total} rader: ${msg.text}`
        );
      }
      setExportSteps((s) => ({ ...s, serialize: "ok" }));

      // Phase 2: build blob + trigger browser download.
      setExportStatus("downloading");
      setExportSteps((s) => ({ ...s, download: "running" }));
      setExportProgress(100);
      await new Promise((r) => setTimeout(r, 0));

      let url: string | null = null;
      try {
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
        url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        // Some browsers require the anchor in the DOM to honor the download attribute.
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        setExportSteps((s) => ({ ...s, download: "failed" }));
        const msg = sanitizeSensitive(err instanceof Error ? err.message : String(err));
        const stk = sanitizeSensitive(err instanceof Error ? err.stack : undefined);
        setExportStepErrors((e) => ({
          ...e,
          download: {
            message: msg.text,
            stack: stk.text || undefined,
            redactedLabels: [...new Set([...msg.labels, ...stk.labels])],
            redactedCount: msg.count + stk.count,
            fieldsProcessed: 1,
          },
        }));
        throw new Error(
          `Kunne ikke starte filnedlasting: ${msg.text}`
        );
      } finally {
        if (url) {
          // Delay revoke so the browser has time to read the blob.
          setTimeout(() => URL.revokeObjectURL(url!), 1000);
        }
      }
      setExportSteps((s) => ({ ...s, download: "ok" }));

      await new Promise((r) => setTimeout(r, 350));

      setExportStatus("done");
      await new Promise((r) => setTimeout(r, 700));
      setConfirmOpen(false);
    } catch (err) {
      console.error("CSV-eksport feilet:", err);
      setExportError(
        sanitizeSensitive(err instanceof Error ? err.message : "Ukjent feil under eksport.").text
      );
      setExportStatus("error");
    }
  };


  // Reset export status whenever the dialog closes.
  useEffect(() => {
    if (!confirmOpen) {
      setExportStatus("idle");
      setExportProgress(0);
      setExportError(null);
      setExportSteps({ serialize: "pending", download: "pending" });
      setExportStepErrors({ serialize: null, download: null });
    }
  }, [confirmOpen]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (loading || isAdmin === null) {
    return (
      <main className="min-h-screen flex items-center justify-center font-mono text-[12px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>
        Laster…
      </main>
    );
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <main className="relative min-h-screen flex items-center justify-center px-6">
        <GrainOverlay />
        <div className="max-w-[440px] text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: "hsl(var(--gold))" }}>Ingen tilgang</div>
          <h1 className="font-display" style={{ fontSize: 32, color: "hsl(var(--text))" }}>Kun for administratorer.</h1>
          <p className="mt-4" style={{ color: "hsl(var(--text-dim))" }}>
            Kontoen din ({user.email}) har ikke admin-rolle. Be en eksisterende admin om å gi deg tilgang.
          </p>
          <button onClick={signOut} className="btn-secondary mt-8">Logg ut</button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen">
      <GrainOverlay />
      <header className="border-b" style={{ borderColor: "hsl(var(--border))" }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <LogoMark size={28} />
            <span className="font-display text-[16px] font-medium" style={{ color: "hsl(var(--text))" }}>Mind & Matter — Admin</span>
          </a>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px]" style={{ color: "hsl(var(--text-faint))" }}>{user.email}</span>
            <button onClick={signOut} className="font-mono text-[11px] uppercase tracking-[0.2em] hover:text-[hsl(var(--gold))] transition-colors" style={{ color: "hsl(var(--text-dim))" }}>
              Logg ut
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-10">
        <DnsChecklist />
        {/* Tabs */}
        <div className="flex gap-px mb-8" style={{ background: "hsl(var(--border))" }}>
          {([
            { id: "spam", label: "Spam-logg", count: spam.length },
            { id: "contact", label: "Forespørsler", count: contact.length },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-6 py-4 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors flex items-center gap-3"
              style={{
                background: tab === t.id ? "hsl(var(--bg-2))" : "hsl(var(--bg))",
                color: tab === t.id ? "hsl(var(--gold))" : "hsl(var(--text-dim))",
                borderBottom: tab === t.id ? "2px solid hsl(var(--gold))" : "2px solid transparent",
              }}
            >
              {t.label}
              <span style={{ color: "hsl(var(--text-faint))" }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
          <div className="md:col-span-4">
            <label className="field-label">Søk</label>
            <input className="input-field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk i innhold…" />
          </div>
          {tab === "spam" && (
            <div className="md:col-span-2">
              <label className="field-label">Årsak</label>
              <select className="input-field" value={reason} onChange={(e) => setReason(e.target.value as any)}>
                <option value="all">Alle</option>
                <option value="honeypot">Honeypot</option>
                <option value="timing">Timing</option>
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="field-label">Fra</label>
            <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="field-label">Til</label>
            <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-end">
            {(() => {
              const total = (tab === "spam" ? filteredSpam.length : filteredContact.length);
              const limit = CSV_LIMITS[tab];
              const willExport = Math.min(total, limit);
              return (
                <button
                  onClick={() => setConfirmOpen(true)}
                  disabled={willExport === 0}
                  className="btn-primary w-full justify-center disabled:cursor-not-allowed"
                  style={{ fontSize: 13, opacity: willExport === 0 ? 0.5 : 1, lineHeight: 1.2 }}
                  title={total > limit ? `${total} treff – eksporterer ${limit}` : `Eksporterer ${total}`}
                >
                  Eksporter CSV ({willExport.toLocaleString("nb-NO")}{total > limit ? ` av ${total.toLocaleString("nb-NO")}` : ""})
                </button>
              );
            })()}
          </div>
        </div>

        {/* Export limit notice */}
        {(() => {
          const total = (tab === "spam" ? filteredSpam.length : filteredContact.length);
          const limit = CSV_LIMITS[tab];
          if (total <= limit) return null;
          return (
            <div
              className="mb-6 p-4 flex items-start gap-3"
              style={{
                border: "1px solid rgba(200,154,74,0.4)",
                background: "rgba(200,154,74,0.06)",
                borderRadius: 4,
              }}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: "hsl(var(--gold))" }}>
                Merk
              </span>
              <p style={{ color: "hsl(var(--text-dim))", fontSize: 13, lineHeight: 1.6 }}>
                Filtrene treffer <strong style={{ color: "hsl(var(--text))" }}>{total.toLocaleString("nb-NO")}</strong> {TAB_LABELS[tab]},
                men CSV-eksporten for denne fanen er begrenset til <strong style={{ color: "hsl(var(--text))" }}>{limit.toLocaleString("nb-NO")}</strong>.
                Bare de nyeste {limit.toLocaleString("nb-NO")} blir inkludert — snevre inn datoområdet for å få med alt.
              </p>
            </div>
          );
        })()}

        {/* Tables */}
        {fetching ? (
          <p className="font-mono text-[12px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>Laster data…</p>
        ) : tab === "spam" ? (
          <SpamTable rows={filteredSpam} />
        ) : (
          <ContactTable rows={filteredContact} />
        )}
      </div>

      {(() => {
        const total = tab === "spam" ? filteredSpam.length : filteredContact.length;
        const limit = CSV_LIMITS[tab];
        const willExport = Math.min(total, limit);
        const capped = total > limit;
        return (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent
              onEscapeKeyDown={(e) => {
                const blocking =
                  exportStatus === "starting" ||
                  exportStatus === "transferring" ||
                  exportStatus === "downloading";
                if (blocking) e.preventDefault();
                else setConfirmOpen(false);
              }}
              style={{
                background: "hsl(var(--bg))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 4,
                color: "hsl(var(--text))",
              }}
            >
              <AlertDialogHeader>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(var(--gold))" }}>
                  Bekreft eksport
                </div>
                <AlertDialogTitle className="font-display" style={{ fontSize: 22, color: "hsl(var(--text))" }}>
                  Eksporter {TAB_NAMES[tab]} til CSV?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div style={{ color: "hsl(var(--text-dim))", fontSize: 14, lineHeight: 1.6 }}>
                    <dl className="mt-4 space-y-3">
                      <div className="flex justify-between gap-6 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <dt className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>
                          Fane
                        </dt>
                        <dd className="font-mono text-[13px]" style={{ color: "hsl(var(--text))" }}>{TAB_NAMES[tab]}</dd>
                      </div>
                      <div className="flex justify-between gap-6 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <dt className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>
                          Treff i filteret
                        </dt>
                        <dd className="font-mono text-[13px]" style={{ color: "hsl(var(--text))" }}>
                          {total.toLocaleString("nb-NO")} {TAB_LABELS[tab]}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6 pb-3" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                        <dt className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--text-faint))" }}>
                          Grense for fanen
                        </dt>
                        <dd className="font-mono text-[13px]" style={{ color: "hsl(var(--text))" }}>
                          {limit.toLocaleString("nb-NO")} rader
                        </dd>
                      </div>
                      <div className="flex justify-between gap-6">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "hsl(var(--gold))" }}>
                          Eksporteres nå
                        </dt>
                        <dd className="font-mono text-[13px]" style={{ color: "hsl(var(--gold))" }}>
                          {willExport.toLocaleString("nb-NO")} rader
                        </dd>
                      </div>
                    </dl>

                    <div
                      className="mt-5 p-4"
                      style={{
                        background: "hsl(var(--bg-2))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 4,
                      }}
                    >
                      <div
                        className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3"
                        style={{ color: "hsl(var(--text-faint))" }}
                      >
                        Aktive filtre
                      </div>
                      <ul className="space-y-2 font-mono text-[12px]">
                        <li className="flex justify-between gap-4">
                          <span style={{ color: "hsl(var(--text-faint))" }}>Søk</span>
                          <span style={{ color: search ? "hsl(var(--text))" : "hsl(var(--text-faint))" }}>
                            {search ? `"${search}"` : "—"}
                          </span>
                        </li>
                        <li className="flex justify-between gap-4">
                          <span style={{ color: "hsl(var(--text-faint))" }}>Fra dato</span>
                          <span style={{ color: from ? "hsl(var(--text))" : "hsl(var(--text-faint))" }}>
                            {from || "—"}
                          </span>
                        </li>
                        <li className="flex justify-between gap-4">
                          <span style={{ color: "hsl(var(--text-faint))" }}>Til dato</span>
                          <span style={{ color: to ? "hsl(var(--text))" : "hsl(var(--text-faint))" }}>
                            {to || "—"}
                          </span>
                        </li>
                        {tab === "spam" && (
                          <li className="flex justify-between gap-4">
                            <span style={{ color: "hsl(var(--text-faint))" }}>Årsak</span>
                            <span style={{ color: reason !== "all" ? "hsl(var(--text))" : "hsl(var(--text-faint))" }}>
                              {reason === "all" ? "Alle" : reason}
                            </span>
                          </li>
                        )}
                      </ul>
                      {!search && !from && !to && (tab !== "spam" || reason === "all") && (
                        <p className="mt-3 font-mono text-[11px]" style={{ color: "hsl(var(--text-faint))" }}>
                          Ingen filtre aktive — eksporten dekker alle tilgjengelige rader.
                        </p>
                      )}
                    </div>

                    {capped && (
                      <p
                        className="mt-5 p-3"
                        style={{
                          border: "1px solid rgba(200,154,74,0.4)",
                          background: "rgba(200,154,74,0.06)",
                          borderRadius: 4,
                          fontSize: 13,
                        }}
                      >
                        Filtrene treffer flere rader enn grensen. Bare de{" "}
                        <strong style={{ color: "hsl(var(--text))" }}>{limit.toLocaleString("nb-NO")} nyeste</strong>{" "}
                        blir lastet ned. Snevre inn datoområdet for å få med alt.
                      </p>
                    )}

                    {exportStatus !== "idle" && (
                      <div className="mt-5">
                        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] mb-2">
                          <span style={{ color: "hsl(var(--text-faint))" }}>Status</span>
                          <span style={{ color: exportStatus === "error" ? "#e07c7c" : "hsl(var(--gold))" }}>
                            {exportStatus === "starting" && "Forbereder rader…"}
                            {exportStatus === "transferring" && (() => {
                              const processed = Math.round((exportProgress / 100) * willExport);
                              return `Serialiserer ${processed.toLocaleString("nb-NO")} / ${willExport.toLocaleString("nb-NO")} rader (${exportProgress}%)`;
                            })()}
                            {exportStatus === "downloading" && "Bygger blob og starter nedlasting…"}
                            {exportStatus === "done" && "Ferdig — fil lastet ned"}
                            {exportStatus === "error" && "Feil under eksport"}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 4,
                            background: "hsl(var(--bg-2))",
                            border: "1px solid hsl(var(--border))",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${
                                exportStatus === "starting"
                                  ? 8
                                  : exportStatus === "done"
                                  ? 100
                                  : exportProgress
                              }%`,
                              background: exportStatus === "error" ? "#e07c7c" : "hsl(var(--gold))",
                              transition: "width 120ms linear",
                            }}
                          />
                        </div>
                        {exportStatus === "error" && exportError && (
                          <p
                            className="mt-3 p-3"
                            style={{
                              border: "1px solid rgba(224,124,124,0.4)",
                              background: "rgba(224,124,124,0.08)",
                              borderRadius: 4,
                              fontSize: 13,
                              color: "hsl(var(--text-dim))",
                            }}
                          >
                            <strong style={{ color: "#e07c7c" }}>Eksport feilet:</strong> {exportError}
                          </p>
                        )}
                        {exportStatus === "error" && (
                          <div className="mt-3">
                            {(() => {
                              const totalCount =
                                (exportStepErrors.serialize?.redactedCount ?? 0) +
                                (exportStepErrors.download?.redactedCount ?? 0);
                              const uniqueLabels = new Set<string>([
                                ...(exportStepErrors.serialize?.redactedLabels ?? []),
                                ...(exportStepErrors.download?.redactedLabels ?? []),
                              ]);
                              if (totalCount === 0) return null;
                              return (
                                <div
                                  className="mb-3 px-3 py-2 flex items-center justify-between gap-3 font-mono text-[11px]"
                                  style={{
                                    border: "1px solid rgba(200,154,74,0.4)",
                                    background: "rgba(200,154,74,0.06)",
                                    borderRadius: 4,
                                    color: "hsl(var(--text-dim))",
                                  }}
                                >
                                  <span>
                                    🔒 Sanitering:{" "}
                                    <strong style={{ color: "hsl(var(--gold))" }}>
                                      {totalCount.toLocaleString("nb-NO")}
                                    </strong>{" "}
                                    {totalCount === 1 ? "felt maskert" : "felt maskert"} på tvers av{" "}
                                    <strong style={{ color: "hsl(var(--gold))" }}>
                                      {uniqueLabels.size.toLocaleString("nb-NO")}
                                    </strong>{" "}
                                    {uniqueLabels.size === 1 ? "kategori" : "kategorier"}
                                  </span>
                                  {showRedactionDetails && (
                                    <span className="text-[10px]" style={{ color: "hsl(var(--text-faint))" }}>
                                      [{[...uniqueLabels].join(", ")}]
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                            <div className="flex items-center justify-between mb-2">
                              <div
                                className="font-mono text-[10px] uppercase tracking-[0.2em]"
                                style={{ color: "hsl(var(--text-faint))" }}
                              >
                                Steg-status
                              </div>
                              {(exportStepErrors.serialize?.redactedLabels.length ||
                                exportStepErrors.download?.redactedLabels.length) ? (
                                <label
                                  className="flex items-center gap-2 cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] select-none"
                                  style={{ color: "hsl(var(--text-dim))" }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={showRedactionDetails}
                                    onChange={(e) => setShowRedactionDetails(e.target.checked)}
                                    className="accent-[hsl(var(--gold))]"
                                  />
                                  Vis maskerte kategorier
                                </label>
                              ) : null}
                            </div>
                            <ul className="space-y-2">
                              {([
                                { key: "serialize", label: "CSV-serialisering" },
                                { key: "download", label: "Filnedlasting (Blob)" },
                              ] as const).map(({ key, label }) => {
                                const st = exportSteps[key];
                                const icon =
                                  st === "ok" ? "✓" : st === "failed" ? "✕" : st === "running" ? "…" : "·";
                                const color =
                                  st === "ok"
                                    ? "hsl(var(--gold))"
                                    : st === "failed"
                                    ? "#e07c7c"
                                    : st === "running"
                                    ? "hsl(var(--text))"
                                    : "hsl(var(--text-faint))";
                                const labelText =
                                  st === "ok"
                                    ? "Fullført"
                                    : st === "failed"
                                    ? "Feilet"
                                    : st === "running"
                                    ? "Pågikk"
                                    : "Ikke startet";
                                return (
                                  <li
                                    key={key}
                                    style={{
                                      border: `1px solid ${
                                        st === "failed" ? "rgba(224,124,124,0.4)" : "hsl(var(--border))"
                                      }`,
                                      background:
                                        st === "failed" ? "rgba(224,124,124,0.06)" : "hsl(var(--bg-2))",
                                      borderRadius: 4,
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-4 px-3 py-2 font-mono text-[12px]">
                                      <span className="flex items-center gap-3">
                                        <span style={{ color, width: 14, textAlign: "center" }}>{icon}</span>
                                        <span style={{ color: "hsl(var(--text))" }}>{label}</span>
                                      </span>
                                      <span
                                        className="text-[10px] uppercase tracking-[0.2em]"
                                        style={{ color }}
                                      >
                                        {labelText}
                                      </span>
                                    </div>
                                    {st === "failed" && exportStepErrors[key] && (
                                      <div
                                        className="px-3 py-3 font-mono text-[11px]"
                                        style={{
                                          borderTop: "1px solid rgba(224,124,124,0.3)",
                                          color: "hsl(var(--text-dim))",
                                          lineHeight: 1.55,
                                        }}
                                      >
                                        <div className="mb-1" style={{ color: "#e07c7c" }}>
                                          {exportStepErrors[key]!.message}
                                        </div>
                                        {exportStepErrors[key]!.redactedLabels.length > 0 && (
                                          <div
                                            className="mb-2 px-2 py-1 inline-block uppercase tracking-[0.2em] text-[9px]"
                                            style={{
                                              border: "1px solid rgba(200,154,74,0.4)",
                                              background: "rgba(200,154,74,0.08)",
                                              color: "hsl(var(--gold))",
                                              borderRadius: 3,
                                            }}
                                            title={`Maskerte typer: ${exportStepErrors[key]!.redactedLabels.join(", ")}`}
                                          >
                                            {(() => {
                                              const c = exportStepErrors[key]!.redactedCount;
                                              const fields = exportStepErrors[key]!.fieldsProcessed;
                                              const cats = exportStepErrors[key]!.redactedLabels.length;
                                              const pct =
                                                fields > 0
                                                  ? Math.min(100, (c / fields) * 100)
                                                  : 0;
                                              const pctStr =
                                                pct === 0
                                                  ? "0"
                                                  : pct < 0.1
                                                  ? "<0,1"
                                                  : pct.toLocaleString("nb-NO", {
                                                      maximumFractionDigits: 1,
                                                    });
                                              return (
                                                <>
                                                  🔒 Noe sensitivt ble fjernet —{" "}
                                                  {c.toLocaleString("nb-NO")} av{" "}
                                                  {fields.toLocaleString("nb-NO")} felt ({pctStr}%) i{" "}
                                                  {cats.toLocaleString("nb-NO")}{" "}
                                                  {cats === 1 ? "kategori" : "kategorier"}
                                                </>
                                              );
                                            })()}
                                            {showRedactionDetails && (
                                              <span className="ml-1 normal-case tracking-normal" style={{ color: "hsl(var(--text-dim))" }}>
                                                ({exportStepErrors[key]!.redactedLabels.join(", ")})
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {exportStepErrors[key]!.stack && (
                                          <details>
                                            <summary
                                              className="cursor-pointer uppercase tracking-[0.2em] text-[9px] mt-1"
                                              style={{ color: "hsl(var(--text-faint))" }}
                                            >
                                              Vis stack
                                            </summary>
                                            <pre
                                              className="mt-2 whitespace-pre-wrap"
                                              style={{
                                                color: "hsl(var(--text-faint))",
                                                fontSize: 10,
                                                maxHeight: 180,
                                                overflow: "auto",
                                              }}
                                            >
                                              {exportStepErrors[key]!.stack}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  className="btn-secondary"
                  aria-keyshortcuts="Escape"
                  disabled={
                    exportStatus === "starting" ||
                    exportStatus === "transferring" ||
                    exportStatus === "downloading"
                  }
                >
                  Avbryt <span className="ml-2 font-mono text-[10px] opacity-60">ESC</span>
                </AlertDialogCancel>
                <AlertDialogAction
                  className="btn-primary"
                  onClick={(e) => {
                    // Prevent Radix from auto-closing so we can show progress.
                    e.preventDefault();
                    if (exportStatus === "idle" || exportStatus === "error") performExport();
                  }}
                  autoFocus
                  aria-keyshortcuts="Enter"
                  disabled={exportStatus !== "idle" && exportStatus !== "error"}
                >
                  {exportStatus === "idle" && (
                    <>
                      Last ned {willExport.toLocaleString("nb-NO")} rader
                      <span className="ml-2 font-mono text-[10px] opacity-60">↵</span>
                    </>
                  )}
                  {exportStatus === "starting" && <>Starter…</>}
                  {exportStatus === "transferring" && <>Overfører… {exportProgress}%</>}
                  {exportStatus === "downloading" && <>Laster ned…</>}
                  {exportStatus === "done" && <>Ferdig ✓</>}
                  {exportStatus === "error" && (
                    <>
                      Prøv igjen <span className="ml-2 font-mono text-[10px] opacity-60">↵</span>
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid hsl(var(--border))",
  fontSize: 14,
  color: "hsl(var(--text-dim))",
  verticalAlign: "top",
};
const headStyle: React.CSSProperties = {
  ...cellStyle,
  color: "hsl(var(--gold))",
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  fontSize: 10,
  fontFamily: "'IBM Plex Mono', monospace",
  textAlign: "left",
};

function SpamTable({ rows }: { rows: SpamRow[] }) {
  if (!rows.length) return <Empty msg="Ingen spam-treff for valgte filtre." />;
  return (
    <div className="overflow-x-auto" style={{ border: "1px solid hsl(var(--border))" }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead style={{ background: "hsl(var(--bg-2))" }}>
          <tr>
            <th style={headStyle}>Tidspunkt</th>
            <th style={headStyle}>Årsak</th>
            <th style={headStyle}>Tid på skjema</th>
            <th style={headStyle}>Honeypot</th>
            <th style={headStyle}>Payload</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={cellStyle} className="font-mono text-[12px] whitespace-nowrap">
                {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
              </td>
              <td style={cellStyle}>
                <span
                  className="font-mono text-[10px] uppercase tracking-[0.2em] px-2 py-1"
                  style={{
                    color: r.reason === "honeypot" ? "#e07c7c" : "hsl(var(--gold))",
                    border: `1px solid ${r.reason === "honeypot" ? "rgba(224,124,124,0.4)" : "rgba(200,154,74,0.4)"}`,
                  }}
                >
                  {r.reason}
                </span>
              </td>
              <td style={cellStyle} className="font-mono text-[12px]">
                {r.time_on_form_ms != null ? `${r.time_on_form_ms} ms` : "—"}
              </td>
              <td style={cellStyle} className="font-mono text-[12px]">{r.honeypot_value || "—"}</td>
              <td style={cellStyle}>
                <pre className="font-mono text-[11px] whitespace-pre-wrap" style={{ color: "hsl(var(--text-faint))", maxWidth: 480 }}>
                  {r.payload ? JSON.stringify(r.payload, null, 2) : "—"}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactTable({ rows }: { rows: ContactRow[] }) {
  if (!rows.length) return <Empty msg="Ingen forespørsler for valgte filtre." />;
  return (
    <div className="overflow-x-auto" style={{ border: "1px solid hsl(var(--border))" }}>
      <table className="w-full" style={{ borderCollapse: "collapse" }}>
        <thead style={{ background: "hsl(var(--bg-2))" }}>
          <tr>
            <th style={headStyle}>Tidspunkt</th>
            <th style={headStyle}>Navn</th>
            <th style={headStyle}>Bedrift</th>
            <th style={headStyle}>E-post</th>
            <th style={headStyle}>Melding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={cellStyle} className="font-mono text-[12px] whitespace-nowrap">
                {format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
              </td>
              <td style={{ ...cellStyle, color: "hsl(var(--text))" }}>{r.name}</td>
              <td style={cellStyle}>{r.company ?? "—"}</td>
              <td style={cellStyle}>
                <a href={`mailto:${r.email}`} className="hover:text-[hsl(var(--gold))] transition-colors">{r.email}</a>
              </td>
              <td style={cellStyle}><div style={{ maxWidth: 480 }}>{r.message}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="p-12 text-center font-mono text-[12px] uppercase tracking-[0.2em]" style={{ border: "1px solid hsl(var(--border))", color: "hsl(var(--text-faint))" }}>
      {msg}
    </div>
  );
}
