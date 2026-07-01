# Conduit — UI Design Direction

**Purpose:** A single source of truth for redesigning every Conduit app page with a consistent, elevated look. Direction: **glowy, vivid, crypto-native dark** with **tactile cards** (soft shadows + hover lifts). Keep the signature green (#00E5A0). Refine the darks. Inspired by the polish of Material Kit / Linear, rendered in Conduit's identity.

**Golden rule:** Every page shares this *system* (colors, spacing, type, cards, buttons, motion). Only the *content* differs per page. Do not invent per-page styles — inherit from these tokens.

---

## 1. Color Tokens (refined)

Keep the green. Deepen and enrich the darks for more contrast and glow.

```css
:root {
  /* ── Brand green (unchanged signature) ── */
  --c: #00E5A0;                        /* primary accent */
  --c-hover: #00FFB2;                  /* brighter green for hover states */
  --c-dim: rgba(0, 229, 160, .10);     /* faint green fill */
  --c-glow: rgba(0, 229, 160, .22);    /* glow (raised from .18 for more vividness) */
  --c-border: rgba(0, 229, 160, .28);  /* green border (raised from .22) */
  --c-grad: linear-gradient(135deg, #00E5A0 0%, #00B894 100%); /* button/hero gradient */

  /* ── Refined darks (deeper, richer, more layered) ── */
  --bg: #05060a;                       /* near-black base (deepened from #08090e) */
  --bg-2: #080a10;                     /* subtle alt background for banding sections */
  --surface: #0d0f17;                  /* cards / panels */
  --raised: #12141e;                   /* inputs, raised elements */
  --hover: #171a26;                    /* hover surface */
  --overlay: rgba(5, 6, 10, .72);      /* modal/backdrop */

  /* ── Strokes ── */
  --stroke: rgba(255, 255, 255, .06);
  --stroke2: rgba(255, 255, 255, .11);
  --stroke-glow: rgba(0, 229, 160, .35); /* green stroke on focus/active */

  /* ── Ink (text) ── */
  --ink-1: #f7fafc;                    /* primary */
  --ink-2: #98a2b3;                    /* secondary (slightly lifted for readability) */
  --ink-3: #55607a;                    /* tertiary (lifted from #424d5e) */

  /* ── Status ── */
  --danger: #ff4d6a;
  --danger-dim: rgba(255, 77, 106, .12);
  --warning: #ffb02e;
  --warning-dim: rgba(255, 176, 46, .12);
  --info: #5b8ff9;
  --purple: #a78bfa;

  /* ── Radii ── */
  --r-sm: 10px;
  --r-md: 14px;
  --r-lg: 18px;
  --r-xl: 24px;
  --r-full: 999px;

  /* ── Elevation (tactile — soft shadows for dark) ── */
  --elev-1: 0 1px 0 rgba(255,255,255,.04), 0 2px 8px rgba(0,0,0,.4);
  --elev-2: 0 1px 0 rgba(255,255,255,.05), 0 8px 28px rgba(0,0,0,.5);
  --elev-3: 0 1px 0 rgba(255,255,255,.06), 0 16px 48px rgba(0,0,0,.6);
  --elev-glow: 0 0 0 1px var(--c-border), 0 8px 32px rgba(0,229,160,.14); /* green glow lift */
}
```

**Depth on dark = layered surfaces + soft shadow + optional green glow.** Never rely on shadow alone (invisible on dark); always pair with a subtle border or a lighter surface shade.

---

## 2. Spacing Scale

Use a consistent 4px-based scale everywhere. Material Kit's polish comes largely from *generous, consistent spacing*.

```
--sp-1: 4px    --sp-2: 8px    --sp-3: 12px   --sp-4: 16px
--sp-5: 20px   --sp-6: 24px   --sp-8: 32px   --sp-10: 40px
--sp-12: 48px  --sp-16: 64px  --sp-20: 80px  --sp-24: 96px
```

- Card padding: **24px** (--sp-6) minimum, 28-32px for hero cards
- Section gaps: **32-48px** between major blocks
- Element gaps within a card: **16-20px**
- Page top padding: **32-48px** — give the page room to breathe

---

## 3. Typography

Keep **Sora** (UI) + **IBM Plex Mono** (numbers, addresses, code).

```
Display / hero:   Sora 800, 40-56px, letter-spacing -1.5px, line-height 1.05
Page title (h1):  Sora 800, 28-32px, letter-spacing -0.5px
Section (h2):     Sora 700, 18-20px
Card title (h3):  Sora 700, 14-15px
Body:             Sora 400, 14px, line-height 1.6
Small / caption:  Sora 400, 12px, --ink-3
Label (form):     Sora 600, 12px, --ink-2
Mono (numbers):   IBM Plex Mono 600, for all USDC amounts, addresses, txHashes
Mono label:       IBM Plex Mono 600, 10-11px, uppercase, letter-spacing 0.08em, --ink-3
```

**Rule:** every USDC amount, wallet address, and txHash uses IBM Plex Mono. Every heading uses Sora with tight negative letter-spacing for that modern, confident feel.

---

## 4. Cards (the core building block)

Tactile, with hover lift + subtle green glow on interactive cards.

```css
.card {
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: var(--r-lg);
  padding: 24px;
  box-shadow: var(--elev-1);
  transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}

/* Interactive cards (clickable rows, feature cards) lift + glow on hover */
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--elev-glow);
  border-color: var(--c-border);
}

/* Accent bar — a thin green top edge for emphasis cards */
.card-accent::before {
  content: "";
  display: block;
  height: 3px;
  background: var(--c-grad);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
  margin: -24px -24px 20px;
}
```

Stat/metric cards: big mono number in green, small uppercase mono label, tiny sub-line. Keep the accent bar for the hero stat.

---

## 5. Buttons

Primary uses the green gradient with a glow lift. Ghost/secondary stays subtle.

```css
.btn-primary {
  background: var(--c-grad);
  color: #04140d;                     /* dark text on green for contrast */
  font-family: 'Sora'; font-weight: 700; font-size: 14px;
  padding: 11px 22px;
  border-radius: var(--r-sm);
  border: none;
  box-shadow: 0 4px 16px rgba(0,229,160,.2);
  transition: transform .15s, box-shadow .15s, filter .15s;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(0,229,160,.32); filter: brightness(1.05); }

.btn-ghost {
  background: var(--raised);
  color: var(--ink-2);
  border: 1px solid var(--stroke);
  border-radius: var(--r-sm);
  padding: 11px 22px;
  transition: all .15s;
}
.btn-ghost:hover { border-color: var(--stroke2); color: var(--ink-1); background: var(--hover); }
```

---

## 6. Navbar

Floating, glassy, well-spaced. Sticky top with blur.

```
- Sticky, top of page
- Background: rgba(13,15,23,.72) + backdrop-filter: blur(16px)
- Bottom border: 1px var(--stroke)
- Logo left, nav groups center/left, wallet + status right
- Active nav item: green text + faint green underline or pill
- Hover: subtle --hover background on the item
- Dropdown menus: --surface bg, --elev-2 shadow, rounded --r-md
```

Keep your existing nav *structure* (groups: Payments, x402, Account) — just apply the glassy floating treatment + green active states.

---

## 7. Inputs & Forms

```css
.input {
  background: var(--raised);
  border: 1px solid var(--stroke);
  border-radius: var(--r-sm);
  padding: 11px 14px;
  color: var(--ink-1);
  font-family: 'Sora'; font-size: 14px;
  transition: border-color .2s, box-shadow .2s;
}
.input:focus {
  outline: none;
  border-color: var(--stroke-glow);
  box-shadow: 0 0 0 3px var(--c-dim);   /* green focus ring */
}
```

Amount inputs and address fields use IBM Plex Mono. Focus always shows the green ring.

---

## 8. Motion

Subtle, fast, consistent. Nothing slow or bouncy.

```
- Hover transitions: 150-200ms ease
- Card lift: translateY(-2px)
- Button lift: translateY(-1px)
- Page/section fade-in on load: 300ms (optional, keep subtle)
- Focus rings: instant
```

---

## 9. Page Layout Pattern (applies to every app page)

```
[ Sticky glassy navbar ]

[ Page header ]
  h1 page title (Sora 800, tight)
  subtitle (--ink-3, 14px)
  — optional action button top-right (btn-primary)

[ Stat row ]  (where relevant)
  3-4 stat cards, one with accent bar

[ Main content ]
  cards / tables, 24px padding, elev-1, hover lift on interactive rows
  generous 32px gaps between sections

[ Consistent empty states ]
  icon in a rounded tinted square + title + subtext + optional CTA
```

Every page follows this skeleton. The dashboard, links, escrow, splits, agents, webhooks, etc. all share it — only the content inside changes.

---

## 10. Rollout Order

1. **Establish tokens** — drop the refined color/spacing/type tokens into `globals.css`. This alone shifts the whole app.
2. **Core components first** — card, button, input, navbar, page-header, stat-card. These are shared, so fixing them updates every page at once.
3. **Reference page** — perfect ONE page end-to-end (suggest: Dashboard). This proves the system.
4. **Roll page by page** — links, escrow, splits, transactions, analytics, agents, webhooks, marketplace, profile, pay pages. Each inherits the system; test + deploy as you go.

**Consistency check per page:** same card style? same spacing rhythm? same button styles? mono for all numbers/addresses? green focus rings? If yes to all, it matches.

---

## Notes for building with Claude Code

- Point Claude Code at this spec + `app/globals.css` + `app/components.css`.
- Ask it to **update the shared tokens and core component classes first**, then go page by page.
- Emphasize: *keep all functionality, wagmi hooks, and form logic untouched — this is a visual layer only.*
- Preserve existing class names where possible (`card`, `btn-primary`, `input`, `page-header`, `stat-card`) so the changes cascade automatically instead of requiring per-element edits.
