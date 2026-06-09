---
name: TrustLedger
description:
    Decentralized escrow and dispute resolution for freelance agreements on
    Ethereum.
colors:
    indigo: "#6366f1"
    indigo-hover: "#4f46e5"
    indigo-dark-accent: "#818cf8"
    surface-base: "#ffffff"
    surface-base-dark: "#030712"
    surface-raised: "#f9fafb"
    border-default: "#e5e7eb"
    text-primary: "#111827"
    text-muted: "#6b7280"
    text-label: "#374151"
    error: "#ef4444"
    error-dark: "#f87171"
typography:
    display:
        fontFamily: "Geist, Arial, sans-serif"
        fontSize: "3rem"
        fontWeight: 700
        lineHeight: 1.1
        letterSpacing: "-0.025em"
    headline:
        fontFamily: "Geist, Arial, sans-serif"
        fontSize: "1.5rem"
        fontWeight: 600
        lineHeight: 1.3
        letterSpacing: "-0.015em"
    title:
        fontFamily: "Geist, Arial, sans-serif"
        fontSize: "1.125rem"
        fontWeight: 600
        lineHeight: 1.4
        letterSpacing: "normal"
    body:
        fontFamily: "Geist, Arial, sans-serif"
        fontSize: "1rem"
        fontWeight: 400
        lineHeight: 1.6
        letterSpacing: "normal"
    label:
        fontFamily: "Geist, Arial, sans-serif"
        fontSize: "0.875rem"
        fontWeight: 500
        lineHeight: 1.4
        letterSpacing: "normal"
    caption:
        fontFamily: "Geist, Arial, sans-serif"
        fontSize: "0.75rem"
        fontWeight: 400
        lineHeight: 1.5
        letterSpacing: "normal"
    mono:
        fontFamily: "Geist Mono, Menlo, monospace"
        fontSize: "0.875rem"
        fontWeight: 400
        lineHeight: 1.6
        letterSpacing: "normal"
rounded:
    sm: "8px"
    md: "12px"
    lg: "16px"
    full: "9999px"
spacing:
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "40px"
    2xl: "96px"
components:
    button-primary:
        backgroundColor: "{colors.indigo}"
        textColor: "{colors.surface-base}"
        rounded: "{rounded.md}"
        padding: "12px 24px"
    button-primary-hover:
        backgroundColor: "{colors.indigo-hover}"
        textColor: "{colors.surface-base}"
        rounded: "{rounded.md}"
        padding: "12px 24px"
    button-ghost:
        backgroundColor: "transparent"
        textColor: "{colors.text-muted}"
        rounded: "{rounded.md}"
        padding: "12px 24px"
    input-default:
        backgroundColor: "{colors.surface-raised}"
        textColor: "{colors.text-primary}"
        rounded: "{rounded.sm}"
        padding: "8px 12px"
    input-error:
        backgroundColor: "{colors.surface-raised}"
        textColor: "{colors.text-primary}"
        rounded: "{rounded.sm}"
        padding: "8px 12px"
    card:
        backgroundColor: "{colors.surface-raised}"
        textColor: "{colors.text-primary}"
        rounded: "{rounded.lg}"
        padding: "24px"
---

**Authors & Contributors:** [Kevin Le](https://www.linkedin.com/in/lekevin1),
[Kellen Snider](https://www.linkedin.com/in/kellen-snider-683396256/)

## Design System: TrustLedger

## 1. Overview

### Creative North Star: "The Notary's Interface"

TrustLedger handles real money under enforceable contract terms. The interface
must convey institutional weight without becoming bureaucratic. Every surface
signals that something consequential is happening here, and that the system
knows exactly what to do about it. The product earns trust not through
decoration, but through clarity: clear states, clear labels, clear consequences.

The system is built for mainstream freelancers who are new to Web3. That means
the UI does the work of explanation at every step, not a documentation page.
Labels are plain English. States are unambiguous. Errors say what to do next.
The "tactile and confident" component feel gives users physical feedback that
actions have been received, without choreography that makes them wait.

Dark mode and light mode are both production surfaces. The palette is restrained
with a single indigo accent used exclusively for primary actions and selection
state. Nothing decorates with the brand color; it is reserved for "this is the
thing to do."

This system explicitly rejects: crypto hype aesthetics (neon gradients,
excessive animation, aggressive dark themes), casual SaaS pastels that
underweight the financial gravity, and opaque DeFi UIs that assume Web3
literacy.

**Key Characteristics:**

- Flat surfaces with border-based depth, no structural shadows
- Single accent color reserved for action, not decoration
- Monospace used exclusively for on-chain data (addresses, hashes, amounts)
- Every interactive state documented: hover, focus, active, disabled, error,
  loading
- Plain-English labels with inline explanation for Web3 concepts

## 2. Colors: The Ledger Palette

A restrained palette anchored by a single institutional indigo. Neutrals carry
all structural work; the accent color is earned.

### Primary

- **Institutional Indigo** (`#6366f1`): Primary CTA buttons, active nav
  indicators, focus rings on form controls, role-toggle selected state. The
  accent is used on ≤15% of any given screen surface.
- **Indigo Deep** (`#4f46e5`): Hover state for all primary buttons and indigo
  text links. Never appears at rest.
- **Indigo Lifted** (`#818cf8`): Dark-mode equivalent of Institutional Indigo
  for indigo text (links, accent labels). Ensures 4.5:1 contrast on `#030712`.

### Neutral

- **Ink** (`#111827`): All primary body text, headings, and high-emphasis labels
  in light mode.
- **Label Gray** (`#374151`): Form labels and secondary headings in light mode.
- **Muted Gray** (`#6b7280`): Hint text, descriptive copy, secondary metadata.
  Meets 4.5:1 against white (`#ffffff`).
- **Border** (`#e5e7eb`): All card borders, input strokes, dividers, and nav
  borders in light mode.
- **Surface Raised** (`#f9fafb`): Card backgrounds, input backgrounds; one step
  above the page surface to create tonal layering without shadow.
- **Page White** (`#ffffff`): Base page background in light mode. Also the text
  color for buttons with an indigo background.
- **Pitch Dark** (`#030712`): Base page background in dark mode.

### Semantic

- **Error Red** (`#ef4444`): Error borders on inputs, inline validation
  messages. Paired with a text label (not color alone) for accessibility.
- **Error Red Dark** (`#f87171`): Error treatment in dark mode for sufficient
  contrast on `#030712`.

### Named Rules

**The Single Voice Rule.** Institutional Indigo appears once per CTA hierarchy
per screen. It is never used decoratively on backgrounds, icons, or text unless
that element is the primary action. Its rarity is the trust signal.

**The Color-Blind Safety Rule.** All state information conveyed by color (error,
active selection, status badges) has a non-color fallback: an icon, a border
treatment, a text label, or a shape change. Red alone never means "error"; the
word "Error" or a caution icon is always present alongside the red.

## 3. Typography

**Body and UI Font:** Geist Sans (with Arial, sans-serif fallback) **Mono
Font:** Geist Mono (with Menlo, monospace fallback)

**Character:** Geist is a technical sans with enough warmth to read as
accessible rather than cold. Its weight range carries the full hierarchy from
body copy through display headings using a single family, which keeps the
interface consistent without requiring a display/body split. Mono is reserved
strictly for on-chain data.

### Hierarchy

- **Display** (700 weight, 3rem, leading 1.1, tracking -0.025em): Hero headings
  on the landing page only. Maximum one per view.
- **Headline** (600 weight, 1.5rem, leading 1.3, tracking -0.015em): Section
  headings within app pages. Used for page titles and card group headings.
- **Title** (600 weight, 1.125rem, leading 1.4): Contract card titles, modal
  headings, sidebar section labels.
- **Body** (400 weight, 1rem, leading 1.6): Paragraph copy, descriptions, and
  explanatory text. Cap line length at 65-75ch.
- **Label** (500 weight, 0.875rem, leading 1.4): Form field labels, button text,
  nav links, and short UI copy. Never all-caps.
- **Caption** (400 weight, 0.75rem, leading 1.5): Hint text below form fields,
  error messages, metadata timestamps.
- **Mono** (400 weight, 0.875rem, leading 1.6): Ethereum addresses, transaction
  hashes, contract IDs, and any on-chain data string. Never used for prose or UI
  labels.

### Named Rules

**The Mono Boundary Rule.** Geist Mono is strictly for on-chain data: addresses
(`0x...`), hashes, amounts expressed as wei. Form labels, nav links, button
copy, and explanatory text always use Geist Sans, even when the content is
technical. If it is prose, it is sans. If it is a chain datum, it is mono.

## 4. Elevation

TrustLedger is flat by default. There are no structural drop shadows on cards,
panels, or modals. Depth is expressed through tonal layering (page white →
surface raised → border) and backdrop-blur on sticky elements (the navigation
bar uses `backdrop-blur` + `bg-white/80`).

The navigation bar's blur is the only active elevation effect in the system.
Modal backdrops use a semi-transparent overlay on `#030712`, not a shadow on the
modal itself.

### Named Rules

**The Flat-By-Default Rule.** Shadows appear only on overlay surfaces (dropdown
menus, tooltips, modals) as a positional signal, never as a style choice. If a
component is in the page flow, it has no shadow.

## 5. Components

### Buttons

Tactile and confident: the primary button has enough visual weight that it reads
as a control, not a label.

- **Shape:** Gently rounded corners (12px radius, `rounded-xl`)
- **Primary:** Institutional Indigo background (`#6366f1`), white text (700
  contrast ratio), 12px top/bottom padding, 24px left/right padding.
  `transition-colors` on hover.
- **Primary Hover:** Indigo Deep (`#4f46e5`). No transform; no lift.
- **Primary Disabled:** 40% opacity (`opacity-40`), `cursor-not-allowed`.
  Loading state: button disabled while tx is pending or confirming.
- **Ghost / Secondary:** Transparent background, gray-200 border, gray-600 text.
  Hover: border darkens to gray-300, text to gray-900.
- **Destructive (small):** Same shape as primary but no indigo background used
  for explicit destructive actions; use red-600 background and white text to
  signal consequence.

### Inputs and Fields

- **Shape:** Rounded corners (8px radius, `rounded-lg`)
- **Default:** `#f9fafb` background, `#e5e7eb` border (1px), gray-900 text,
  gray-400 placeholder, 8px top/bottom padding, 12px left/right padding.
- **Focus:** Indigo-500 ring (`focus:ring-2 focus:ring-indigo-500`), border
  removed.
- **Error:** Red-500 border (1px), red-500 focus ring. Error message in caption
  size below the field, red-500 color, with `role="alert"`.
- **Select:** Same treatment as Input; `#f3f4f6` background (`gray-100`) for
  visual distinction from free-text inputs.
- **Label:** 0.875rem medium, gray-700 light / gray-200 dark. Always above the
  control, never inside as placeholder.
- **Hint:** 0.75rem regular, gray-500, below the control. Hidden when an error
  is shown.

### Cards

- **Corner Style:** Generously rounded (16px radius, `rounded-2xl`)
- **Background:** `#f9fafb` (gray-50) in light mode; `rgba(255,255,255,0.05)` in
  dark mode
- **Border:** 1px `#e5e7eb` (gray-200) light / `rgba(255,255,255,0.10)` dark
- **Shadow:** None
- **Internal Padding:** 24px (`p-6`)
- **Content:** Title (600 weight, gray-900) + body copy (0.875rem, gray-500). No
  icon-above-heading card grid; use contextual layout instead.

### Navigation

- **Style:** Sticky top bar, white/80 + backdrop-blur light; gray-950/80 +
  backdrop-blur dark. 1px border-bottom in the same border-default color.
- **Height:** 64px (`h-16`)
- **Logo:** Indigo-600 text + logo image, bold, 1.125rem, tight tracking.
- **Nav links:** 0.875rem medium, gray-500 default, gray-900 active (light) /
  gray-400 default, white active (dark). No underlines; active state by text
  color only.
- **Role toggle:** Pill container with rounded-full border. Active segment fills
  with indigo-600 + white text. Inactive segment text-gray-500 with hover to
  gray-900.

### Status Badges (Contract State)

Each contract status has a background-tinted badge with a non-color label:

- **PENDING:** amber-100 bg, amber-800 text
- **ACTIVE:** blue-100 bg, blue-800 text
- **SUBMITTED:** purple-100 bg, purple-800 text
- **APPROVED:** green-100 bg, green-800 text
- **DISPUTED:** red-100 bg, red-800 text
- **RESOLVED:** gray-100 bg, gray-700 text
- **CANCELLED:** gray-100 bg, gray-500 text

All badges include the status text as a label (never color alone). Use a
contrasting border (1px, same hue, 20% darker) for additional differentiation on
colorblind-safe displays.

### Transaction State Button (Signature Component)

The `ActionButton` component handles the two-phase wagmi write pattern (pending
→ confirming → done). States:

- **Default:** Standard primary button appearance.
- **Pending (tx submitted):** Disabled + "Pending…" label replacement +
  opacity-40.
- **Confirming (mining):** Disabled + "Confirming…" label replacement.
- **Never** replace the button with a spinner in the center of the card;
  disabled state is the full treatment.

## 6. Do's and Don'ts

### Do

- **Do** use Institutional Indigo exclusively on primary CTAs, active selection
  indicators, and focus rings. Nowhere else.
- **Do** use Geist Mono for all on-chain data strings: addresses, hashes,
  amounts in wei or token units.
- **Do** provide a non-color fallback (icon, label, border change) alongside
  every color-coded state signal. WCAG AA + color-blind safe.
- **Do** disable action buttons during pending and confirming transaction
  states; show the status in the button label itself.
- **Do** give every error message a plain-English explanation of what went wrong
  and what to do next. "Invalid address" is not enough; "Enter a valid Ethereum
  address starting with 0x" is.
- **Do** explain Web3 concepts (gas, escrow, commit-reveal) inline and
  contextually, not in a separate glossary.
- **Do** use `backdrop-blur` on the sticky nav; it is the one structural
  elevation effect the system permits.

### Don't

- **Don't** use crypto hype aesthetics: neon gradients on dark backgrounds,
  aggressive coin or rocket imagery, or animated tickers. TrustLedger is a
  financial tool.
- **Don't** use casual SaaS pastels (Notion / Loom aesthetic). Colors and
  typographic weight must signal that real financial value is at stake.
- **Don't** use `border-left` greater than 1px as a colored accent stripe on
  cards, alerts, or list items.
- **Don't** apply `background-clip: text` gradient text anywhere.
- **Don't** use glassmorphism on cards or panels; it belongs on the nav blur
  only.
- **Don't** use uppercase tracked eyebrow labels above every section.
- **Don't** use numbered section markers (01 · 02 · 03) as scaffolding.
- **Don't** put Geist Mono on labels, button text, nav links, or prose. Mono is
  for chain data only.
- **Don't** convey state through color alone. Every badge, error, and indicator
  has a text or shape fallback.
- **Don't** use structural shadows on cards or modals; tonal layering handles
  depth.
- **Don't** use decorative motion: no page-load animation sequences, no entrance
  animations on static content. Motion is reserved for state feedback (button
  disabled, toast appear, modal open).
- **Don't** use modal dialogs as a first thought for confirmation flows; exhaust
  inline or progressive alternatives before reaching for a modal.
