# Design — Harf

Reviewed 29 October 2026 against `app/globals.css`, the shared UI components and shell.
This replaces the pre-rebuild dark/gold guide. Historical visual decisions remain available in Git history and
[the September redesign specification](HARF_REDESIGN_PLAN.md); use current source for exact values.

## Direction

A quiet study book with Paper and Night themes, Arabic-first reading, clear text hierarchy, generous whitespace
and a visible next action. Avoid the obsolete glow/typewriter/rank-dashboard design. Vocabulary familiarity,
personal understanding feedback and sourced commentary remain distinct.

## Source of truth

- `app/globals.css`: semantic tokens, layouts, responsive rules, focus styles, reduced-motion handling.
- `components/ui/`: shared buttons, fields, dialog, progress, skeleton and status primitives.
- `components/shell/AppShell.tsx`: actual navigation. Route groups are not URL segments.
- `app/layout.tsx`, `lib/theme.ts`, `components/ThemeSync.tsx`: local fonts and pre-paint theme restoration.

## Themes and typography

Use semantic variables such as `--canvas`, `--surface`, `--text`, `--muted`, `--primary`,
`--line`, `--control-line`, `--danger` and `--focus`. Paper uses warm off-white surfaces and green;
Night uses dark green surfaces. Do not copy old gold/dark-only tokens.

Fonts are local Source Sans 3, Amiri and Amiri Quran. QPC V2 page fonts are loaded on demand in Reading mode.
Keep Quranic Arabic exact, RTL and language-labelled. Do not add Arabic letter spacing, synthesize diacritics
or use display glyphs as the source of meanings/search. Reader Arabic size is selectable at 30/36/42px.

## Layout and interaction

The desktop rail begins at 1024px, with a 1120px maximum main measure. Smaller screens use the mobile header and
bottom navigation. Use current shell components rather than rebuilding old `LayoutShell` or `/app` routes.
Study/setup have focus layouts. Reading mode has its own page/word presentation; Ayah mode keeps translation and context close.

Use links for navigation and buttons for changes. Preserve visible focus, accessible names, semantic headings,
touch targets, keyboard dialog behavior and reduced motion. Native selects and details fit the existing system.
Use shared `sheet`, `stack`, `field`, `button` and status patterns rather than adding a parallel component system.

## Learning surfaces

Hide Arabic/translation until the learner requests a hint or reveal; accessible labels must not reveal hidden answers.
After reveal, word inspection, personal reflections, tafsir and language examples are available.
Label personal assessments as self-report. Saving ranges/assessments and reviewing similar pairs are separate actions;
neither contributes a Quran-comprehension percentage or religious rank.

Saving states and errors must be visible. Preserve failed inputs and allow retry. Confirm replacement imports and
explain what reset retains. Keep sourced commentary visibly separate from personal writing and authored teaching notes.

## Verification boundary

Automated axe checks ran in the recorded learning/passage browser tests through `a7998f6`.
This documentation review is not a manual keyboard, screen-reader, visual or accessibility-conformance certification.
See [the roadmap](docs/ROADMAP.md) for remaining verification.
