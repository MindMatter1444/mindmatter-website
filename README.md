# Mind & Matter — Norsk AI-infrastruktur

Landingsside for Mind & Matter AS, bygget med Vite + React + TypeScript + Tailwind CSS, og koblet til Lovable Cloud (Supabase) for kontaktskjema, e-post og auth.

## Forutsetninger

- **Node.js** 18+ (anbefalt 20+)
- **npm**, **bun** eller **pnpm** (eksemplene under bruker `npm`)

## Kom i gang lokalt

```bash
# 1. Installer avhengigheter
npm install

# 2. Start dev-server (Vite, hot reload)
npm run dev

# 3. Bygg produksjonsversjon til /dist
npm run build

# 4. Forhåndsvis prod-bygget lokalt
npm run preview
```

For en enkel start av produksjonsappen lokalt etter build (eksponert på nettverket):

```bash
npm run build
npm run start   # kjører `vite preview --host` på alle interfacer
```

Andre nyttige scripts:

| Script              | Beskrivelse                                       |
| ------------------- | ------------------------------------------------- |
| `npm run build:dev` | Bygg med `development`-mode (kildekart, ingen min.)|
| `npm run start`     | Kjør prod-bygget lokalt (`vite preview --host`)    |
| `npm run lint`      | Kjør ESLint over hele prosjektet                  |
| `npm run test`      | Kjør Vitest én gang                               |
| `npm run test:watch`| Vitest i watch-mode                               |

Dev-serveren ligger som standard på [http://localhost:8080](http://localhost:8080) (se `vite.config.ts`).

## Miljøvariabler

`.env` genereres og oppdateres automatisk av Lovable Cloud og skal **ikke** redigeres manuelt. Den inneholder bl.a.:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Hemmeligheter (API-nøkler o.l.) ligger i Lovable Cloud → Secrets, ikke i kodebasen.

## Prosjektstruktur (kort)

```
src/
  components/        Gjenbrukbare UI-komponenter
    sections/        Hovedseksjoner på landingssiden (Hero, Tjenester, ...)
    ui/              shadcn/ui-komponenter
  pages/             Routes (Index, Auth, Admin, Unsubscribe, NotFound)
  hooks/             React hooks (useAuth, use-toast, ...)
  integrations/      Auto-genererte Supabase-klienter (ikke rediger)
  index.css          Designsystem: tokens, typografi, komponentklasser
supabase/
  functions/         Edge functions (e-post, kontakt, captcha)
  config.toml        Cloud-konfig (autogenerert, ikke rediger project-felt)
```

## Stil og typografi

Designet er mørkt, varmt og redaksjonelt — kremfarget tekst på mørk brun bakgrunn med gull som accent.

### Designsystem (tokens)

Alle farger er definert som **HSL-tokens** i `src/index.css` under `:root`, og eksponert til Tailwind via semantiske navn i `tailwind.config.ts` (`bg-background`, `text-foreground`, `bg-primary`, …). Bruk **alltid** semantiske tokens i komponenter — aldri rå farger som `text-white` eller `bg-black`.

Hovedtokens:

| Token             | Verdi (HSL)        | Bruk                          |
| ----------------- | ------------------ | ----------------------------- |
| `--bg`            | `24 14% 8%`        | Hovedbakgrunn (mørk brun)     |
| `--bg-2`          | `26 14% 9%`        | Sekundær flate / kort         |
| `--text`          | `42 38% 88%`       | Brødtekst (varm krem)         |
| `--text-dim`      | `42 30% 78%`       | Dempet tekst                  |
| `--text-faint`    | `42 18% 58%`       | Hint / metadata               |
| `--gold`          | `35 53% 54%`       | Primær accent (#c89a4a)       |
| `--gold-bright`   | `35 60% 60%`       | Hover-state for gull          |
| `--border`        | `42 14% 18%`       | Linjer og rammer              |
| `--radius`        | `0.25rem`          | Standard hjørneradius         |

Disse mappes igjen til shadcn-tokens (`--background`, `--foreground`, `--primary`, `--accent`, …) slik at hele UI-biblioteket arver paletten.

### Typografi

Tre fonter, lastet fra Google Fonts i `index.html`:

- **Fraunces** (serif, display) — overskrifter, knapper, kursiv accent. Hjelpeklasser: `.font-display`, `.italic-display`.
- **IBM Plex Sans** (sans, body) — standard `body`-font, vekt 300/400/500.
- **IBM Plex Mono** (mono) — etiketter, små caps, tekniske detaljer. Hjelpeklasse: `.font-mono`, `.section-label`, `.field-label`.

### Komponentklasser

Definert i `@layer components` i `src/index.css`:

- `.btn-primary` / `.btn-secondary` — knappestiler i merkevareprofilen
- `.input-field` / `.field-label` — skjemafelter
- `.section-label` — liten gull-etikett med strek foran (brukes over seksjonstitler)
- `.gold-text`, `.italic-display` — accent-typografi
- `.hero-fade` + `.delay-1…5` — fade-in-animasjon for hero-elementer

### Animasjon og bevegelse

- `tailwindcss-animate` for accordion/transitions
- Egne keyframes: `heroFade`, `spin`
- Respekterer `prefers-reduced-motion` (smooth scroll deaktiveres)

## Backend (Lovable Cloud)

Backend håndteres via Lovable Cloud:

- **Database & RLS** — Supabase Postgres
- **Auth** — `useAuth`-hook + `/auth`-side
- **Edge functions** — under `supabase/functions/` (kontakt-e-post, hCaptcha-verifisering, e-postkø, m.m.)

Endringer i database eller edge functions deployes automatisk via Lovable.

## Deploy

Publiseres via Lovable. Live-domene: [mindmatter.no](https://mindmatter.no).
