# Design — Harf

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre
atmospheric — dark-mode, glow-driven, cinematic reveal. Signals: dark-only
palette, breathing/glow/shine-sweep motion already in `globals.css`, typewriter
hero on the landing page.

## Macrostructure family
- Marketing pages (`/` only): typewriter-reveal hero, kept from the existing
  implementation — the reveal mechanic is genuinely distinctive and on-brand.
  Only the background enrichment changes (see Per-page allowances).
- App/tool pages (`/app`, `/study`, `/words`, `/word/[id]`, `/names`,
  `/coverage`, `/settings`, `/drill`, `/quiz`, `/search`, `/tadabbur`,
  `/mutashabihat`): Workbench family — content-dense, no decorative
  enrichment, structure carries function. Section heads use a plain heading +
  one-line subhead, no numbered eyebrows.

## Theme
Custom — tuned to the existing brand, not reset to a catalog theme. Values
below are OKLCH-exact conversions of the hex values already shipping in
`globals.css`; visually identical, just expressed in the token format Hallmark
requires.

- `--color-paper`    oklch(17.0% 0.024 268.5)   /* bg */
- `--color-paper-2`  oklch(21.7% 0.033 270.3)   /* surface */
- `--color-paper-3`  oklch(27.2% 0.051 271.6)   /* surface-plus */
- `--color-ink`      oklch(87.8% 0.020 84.6)    /* text */
- `--color-ink-2`    oklch(59.2% 0.020 275.4)   /* muted */
- `--color-rule`     oklch(29.2% 0.036 270.6)   /* border */
- `--color-accent`   oklch(74.3% 0.117 89.5)    /* gold */
- `--color-accent-2` oklch(61.8% 0.097 85.6)    /* gold-muted */
- `--color-brand`    oklch(53.1% 0.197 19.5)    /* burgundy — landing wordmark + brand-only accents */
- `--color-positive` oklch(44.5% 0.070 163.4)   /* green — mastery/success state */
- `--color-focus`    oklch(74.3% 0.117 89.5)    /* = accent, existing focus-ring behavior */

## Typography
- Display: Amiri, weight 400/700, style normal/italic (Arabic headings, wordmark)
- Verse: Amiri Quran, weight 400 (Uthmanic annotation marks — verse text only)
- Body/UI: Rubik, weight 300–700
- Display tracking: 0 (Amiri does not want letter-spacing)
- UI label tracking: 0.08em–0.35em uppercase (existing eyebrow/label convention)
- Type scale anchor: fluid clamp scale already defined in `globals.css`
  (`--text-fluid-xs` … `--text-fluid-3xl`) — kept as-is.

## Spacing
Tailwind v4 default spacing scale (no custom `--space-*` scale currently
defined). Pages use Tailwind spacing utilities directly; no raw px values in
new work.

## Motion
- Easings: `--ease-out-expo` cubic-bezier(0.19,1,0.22,1), `--ease-in-out-smooth`
  cubic-bezier(0.42,0,0.58,1) — both already defined, reused, not replaced.
- Reveal pattern: fade + slide (12px) on entrance; typewriter reveal reserved
  for the landing hero only — do not spread it to other pages.
- Ambient motion (breathe, glow, shine-sweep) is landing-only enrichment.
  App/tool pages use functional motion only (hover lift, focus ring,
  card-reveal) — no idle ambient animation competing with study content.
- Reduced-motion fallback: opacity-only, ≤150ms (already implemented globally).

## Microinteractions stance
- Silent success on save-to-localStorage actions (no toast) — matches
  existing `card-interactive` hover pattern.
- Hover delay 800ms / focus delay 0ms on any future tooltip.
- Loading states use skeleton blocks (already the pattern in `FlashCard.tsx`),
  not spinners.

## CTA voice
- Primary CTA: filled gold pill (`bg-gold text-bg`), uppercase tracked label,
  arrow suffix — existing landing "Begin" button is the reference. Reuse this
  exact voice everywhere a primary CTA appears.
- Secondary CTA: outline/ghost, `text-muted` → `text-harf-text` on hover, no
  fill.

## Per-page allowances
- Landing (`/`) MAY use enrichment — but Tier-A CSS art / restrained motif
  only. The tiled isometric-square SVG background is retired: a *repeating*
  geometric pattern behind a typewriter reveal reads as generic stock
  "Islamic pattern" clipart, not as this app's voice. Replacement is a single
  off-center radial glow (extending the existing `.harf-glow` language) with
  no tiling.
- App/tool pages MUST NOT use decorative enrichment — function carries the
  page, per the Workbench family.
- The masthead nav (`Navbar.tsx`, N6 archetype: sticky glass header, active-dot
  links, inline search, mobile drawer) is kept in place across every route —
  it already satisfies the system and is not part of what the user flagged.
  No footer on any route — matches the existing utility-first shape.

## What pages MUST share
- The حرف wordmark treatment (Amiri, gold in nav / burgundy on landing).
- `--color-accent` (gold) as the only chromatic accent color on UI chrome;
  `--color-brand` (burgundy) stays scoped to the landing page and the wordmark.
- Amiri (display/Arabic) + Rubik (body/UI) — no new fonts introduced.
- The primary-CTA voice (filled gold pill, uppercase tracked label).
- The masthead nav, unchanged.

## What pages MAY differ on
- Hero/hero-adjacent enrichment — landing only, Tier-A CSS art.
- Internal section layout within the Workbench family (a study session and a
  word browser both belong to Workbench but compose differently).

## Exports

### tokens.css
```css
:root {
  --color-paper:      oklch(17.0% 0.024 268.5);
  --color-paper-2:    oklch(21.7% 0.033 270.3);
  --color-paper-3:    oklch(27.2% 0.051 271.6);
  --color-ink:        oklch(87.8% 0.020 84.6);
  --color-ink-2:      oklch(59.2% 0.020 275.4);
  --color-rule:       oklch(29.2% 0.036 270.6);
  --color-accent:     oklch(74.3% 0.117 89.5);
  --color-accent-2:   oklch(61.8% 0.097 85.6);
  --color-brand:      oklch(53.1% 0.197 19.5);
  --color-positive:   oklch(44.5% 0.070 163.4);
  --color-focus:      oklch(74.3% 0.117 89.5);

  --font-display: "Amiri", serif;
  --font-verse:   "Amiri Quran", "Amiri", serif;
  --font-body:    "Rubik", sans-serif;

  --ease-out: cubic-bezier(0.19, 1, 0.22, 1);
  --ease-in-out: cubic-bezier(0.42, 0, 0.58, 1);
  --dur-short: 200ms;
  --dur-med: 350ms;

  --radius-card: 1rem;
  --radius-pill: 999px;
}
```

## Log

Redesign progress tracked in `.hallmark/log.json` with `"scope": "app"`
entries. Landing page redesigned first (isometric background removed). The
remaining 12 app/tool routes were audited against the Workbench allowances
above (no decorative enrichment, tokens-only color) and already conform —
no structural changes were needed. `layout.tsx`'s `themeColor` meta and
`global-error.tsx`'s inline-styled error boundary keep literal hex values
intentionally (metadata and the error fallback can't rely on `globals.css`
being loaded), not a token violation.
