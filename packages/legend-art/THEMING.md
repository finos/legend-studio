# Theming guide for `@finos/legend-art` consumers

This guide is for **downstream repos and extension authors** that build UI on top of
`@finos/legend-art`, `@finos/legend-lego`, or the Legend Studio extension packages and
ship their own SCSS. It documents the theming **contract** so your components render
correctly under every Legend theme (dark, light, and future themes).

If you maintain SCSS that uses `var(--color-dark-grey-*)` / `var(--color-light-grey-*)`
directly, **your components will not respond to theme changes** and will look broken in
light theme. This guide tells you how to fix that.

> The full architecture + Studio-internal migration history lives in
> `docs/technical/THEMING.md` in the `finos/legend-studio` repo. This file is the
> portable subset you need as a consumer.

---

## 1. The model: two-tier CSS variables

```
Palette tokens (physical)   →   Semantic tokens (role-based)   →   Your components
--color-dark-grey-50            --color-bg-app                     .my-panel { background: var(--color-bg-app); }
```

- **Palette tokens** (`--color-dark-grey-50`, `--color-light-grey-400`, …) are raw,
  fixed colors. They do **not** change with the theme. **Never reference them directly
  in component styles.**
- **Semantic tokens** (`--color-bg-panel`, `--color-text-primary`, …) describe a
  _role_. The active theme remaps each one to the right palette value. **This is what
  your components must use.**
- A theme is activated by a class on `<body>` (`theme__default-dark` /
  `theme__default-light`). You don't apply this yourself — the host app does. Your job
  is only to consume semantic tokens so the remap reaches you.

**Rule of thumb:** if a hex value or a `*-grey-*` / `*-blue-*` palette token appears in
your component SCSS, it's a bug unless it's one of the documented exceptions in §4.

---

## 2. Semantic token vocabulary

The authoritative source is
`@finos/legend-art/style/base/themes/_semantic-tokens.scss` (with inline docs). Current
vocabulary:

**Surfaces (`background`)**
`--color-bg-app`, `--color-bg-panel`, `--color-bg-panel-header`, `--color-bg-chrome`,
`--color-bg-elevated`, `--color-bg-input`, `--color-bg-hover`, `--color-bg-selected`,
`--color-bg-tag`, `--color-bg-overlay`

**Text (`color`)**
`--color-text-primary`, `--color-text-secondary`, `--color-text-muted`,
`--color-text-disabled`, `--color-text-inverted`, `--color-text-on-accent`,
`--color-text-link`

**Borders (`border`)**
`--color-border-subtle`, `--color-border-default`, `--color-border-strong`,
`--color-border-focus`

**Accents**
`--color-accent`, `--color-accent-hover`, `--color-accent-subtle`

**Status**
`--color-status-error` / `-bg`, `--color-status-warn` / `-bg`,
`--color-status-success` / `-bg`, `--color-status-info`

**On-accent interaction** (for elements sitting on a saturated accent fill)
`--color-state-hover-on-accent`, `--color-state-disabled-on-accent`

**Active indicator** (tab underlines, focused rails — distinct from `accent`)
`--color-active-indicator`

**Category / brand** (theme-agnostic; encode meaning, identical in every theme)
`--color-category-class`, `--color-category-enumeration`, `--color-category-primitive`,
`--color-category-generation`, `--color-category-experimental`

**Misc**: `--color-shadow`

---

## 3. Migration recipe (palette → semantic)

Choose the replacement based on the **CSS property**, not just the old color value:

| Old (palette)                | `background:`               | `color:`                    | `border:`                |
| ---------------------------- | --------------------------- | --------------------------- | ------------------------ |
| `--color-dark-grey-50`       | `--color-bg-app`            | —                           | —                        |
| `--color-dark-grey-80/85`    | `--color-bg-panel(-header)` | —                           | —                        |
| `--color-dark-grey-100`      | `--color-bg-panel-header`   | —                           | `--color-border-subtle`  |
| `--color-dark-grey-200`      | `--color-bg-tag`            | —                           | `--color-border-default` |
| `--color-dark-grey-300`      | `--color-bg-hover`          | `--color-text-disabled`     | `--color-border-strong`  |
| `--color-dark-grey-400/500`  | `--color-bg-selected`       | `--color-text-disabled`     | `--color-border-strong`  |
| `--color-light-grey-0`       | —                           | `--color-text-on-accent` \* | —                        |
| `--color-light-grey-50/100`  | —                           | `--color-text-primary`      | —                        |
| `--color-light-grey-200`     | —                           | `--color-text-secondary`    | —                        |
| `--color-light-grey-300/400` | —                           | `--color-text-muted`        | `--color-border-default` |

\* See the trap in §4.

This is a guideline, not a lookup table — pick the token whose _role_ matches the
element. When in doubt, look at how the same element type is tokenized in
`legend-application-studio/style`.

---

## 4. Rules & gotchas

### The `text-on-accent` trap (most common mistake)

`--color-text-on-accent` is **always light** (it's text meant to sit on a saturated
colored fill — a blue button, a status pill). It is **not** theme-aware. Use it **only**
when the background is a saturated accent/status/brand color that stays dark in both
themes:

```scss
// CORRECT — saturated fill
.my-button {
  background: var(--color-accent);
  color: var(--color-text-on-accent);
}

// WRONG — neutral surface flips to light grey in light theme → white-on-light-grey
.my-tag {
  background: var(--color-bg-tag);
  color: var(--color-text-on-accent);
}
//                                                ^ use --color-text-primary instead
```

If the surface is a neutral `bg-*` token, pair it with `--color-text-primary` (or
`-secondary`/`-muted`), which flips with the theme.

### Brand / category colors stay stable

Colors that encode _meaning_ (element-type badges: PK/FK, class=purple, enumeration,
generated=pink, etc.) should look the **same in every theme** so users learn the code.
Use a `--color-category-*` token if one fits, or keep the physical palette token inside
a clearly-commented block. Do **not** convert these to neutral surface/text tokens.

### Legitimate escape hatches (keep palette tokens)

- **ag-grid theme blocks** (`--ag-*` variable assignments inside `.ag-theme-balham-dark`)
  — left as palette tokens.
- **Stripe gradients** (`repeating-linear-gradient(...)`) — palette is fine.
- **Translucent backdrops** (`rgb(0 0 0 / 70%)`, overlay scrims) — intentional, keep.
- **`.X--dark` / `.X--light` modifier blocks** — see below.

### `*--dark` modifier classes are now no-ops

In older Legend code, components took a `darkMode` prop that toggled a `btn--dark` /
`input--dark` / `selector-input--dark` / `*--dark` class with a parallel block of forced
dark colors. Those blocks have been migrated to semantic tokens, so **they now render
identically to the base class in every theme**. The classes are preserved as
backward-compat aliases. You can keep passing `darkMode` (it won't break), but it no
longer does anything visual — prefer dropping it in new code and letting the active
theme drive colors.

---

## 5. How to verify your migration

1. Grep your component SCSS — there should be **no** `var(--color-(dark|light)-grey-*)`
   (or hex values) outside a documented escape-hatch/brand block:
   ```
   grep -rnE "var\(--color-(dark|light)-grey-[0-9]" your/style
   ```
2. Compile your SCSS against the published `@finos/legend-art` scss load-path.
3. Render your component in the host app and toggle Dark ↔ Light. Specifically check:
   - text stays readable on every surface (the §4 trap),
   - hover/selected states get _brighter_ in dark and _darker_ in light, not inverted,
   - badges/type-pills keep their brand colors,
   - borders remain visible against their surface.

---

## 6. Keeping in sync

The token vocabulary is versioned with `@finos/legend-art`. If you pin a version, the
tokens in §2 are the contract for that version. When you bump `@finos/legend-art`, skim
`style/base/themes/_semantic-tokens.scss` for added/renamed tokens. Tokens are additive
by policy; renames will be called out in the `@finos/legend-art` changeset.
