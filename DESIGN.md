# Mind Map Design System & Brand Identity

> Mind Map follows Apple's Human Interface Guidelines: quiet system neutrals, the system typeface, translucent floating chrome and one pink tint.
> Purpose: untangling everything on your mind into one map, and keeping those maps for years (the author has maps from 2023 onward). Calm, direct, and every interaction stays functional and honest.

---

## 1. Character

- **Concept**: Content first. The map is the hero; chrome floats above it as a light material and gets out of the way (deference, clarity, depth).
- **Tone**: Calm, confident, fast and keyboard-first.
- **Posture**: No generic AI blue-to-purple gradients, no fake metrics, no dead mockup elements, no decoration that doesn't carry meaning.

---

## 2. Color

### Foundation (Apple system neutrals)
- **Background (`--background`)**: `#f5f5f7` (Dark: `#000000`). **Card / grouped surface (`--card`)**: `#ffffff` (Dark: `#1c1c1e`). **Popover**: `#ffffff` (Dark: `#2c2c2e`).
- **Label (`--foreground`)**: `#1d1d1f` (Dark: `#f5f5f7`). **Secondary label (`--muted-foreground`)**: `#6e6e73` (Dark: `#98989d`).
- **Fills**: `--secondary` / `--muted` are system fills (`rgb(120 120 128 / 0.12)`). **Separator (`--border`)**: `rgb(0 0 0 / 0.1)`.
- **Dot grid (`--dot`)**: a faint neutral grid on the canvas, like Freeform.

### One tint
- **System pink (`--primary`)**: `#e8194b` (Dark: `#ff375f`); text-safe variant `--ink` `#d30f45` (Dark: `#ff6482`). Used for the primary action, selection and focus only.

### Branch pigments
- Apple system colors for branches and edges. Slot names are stored keys in saved maps, so they keep their old names:
  `teal` = pink, `clay` = orange, `ochre` = yellow, `moss` = green, `indigo` = indigo, `plum` = purple, `rose` = red, `slate` = blue.
  Filled nodes on yellow, orange and green use dark text; the rest use white. Node text otherwise stays `--foreground`.

---

## 3. Typography

- **Text and display**: the system face (`system-ui`, SF Pro on Apple devices). No web fonts for UI text.
- **Tracking is size-specific**: large titles tighten (`-0.03em` hero, `-0.025em` page titles, `-0.022em` h1/h2), body stays at `0`.
- **Hierarchy** comes from weight + size + leading together: bold, tight leading for titles; regular, `1.5` leading for body.
- **Mono**: `ui-monospace` (SF Mono), Geist Mono as fallback, for keyboard shortcuts.

---

## 4. Shape, Materials & Motion

- **Radius**: base `0.75rem`. Cards `rounded-2xl`, dialogs `rounded-2xl`, menus and popovers `rounded-xl`. Only the primary action is a full capsule; secondary buttons use `rounded-xl`.
- **Cards** (`.card-surface`, `.card-lift`): white platter, hairline edge, soft ambient shadow (`--shadow-card`). Hover lifts 2px with `--shadow-lift` (pointer devices only); press scales to `0.98` instantly. No tilt.
- **Materials** (`.glass`): editor bars, palettes, zoom and search float as a translucent material (`--material` + `backdrop-filter: blur(24px) saturate(180%)`, `--shadow-float`). The home header is a `.material` bar that gains a hairline once scrolled. Menus, popovers and dialogs stay opaque so a translucent layer never sits on another.
- **Accessibility**: `prefers-reduced-transparency` makes glass solid; `prefers-contrast: more` adds a defined border; `prefers-reduced-motion` swaps rises and lifts for short cross-fades.
- **Motion**: springs, not timed curves. `--ease-spring` is a critically damped spring (no overshoot) for entrances and lifts; `--ease-out-apple` for control feedback. Feedback lands on press. Canvas layout transitions stay at 140ms so keystrokes never feel laggy. No endless loops.
- **Lockup**: header and screens use the Mind Map lockup: the kawung glyph (four ovals around a centre, one oval in `--primary`) + "Mind Map" in Inter SemiBold, ink `#1d1d1f` / white. The app icon (same kawung on a Sararia ink tile, `scripts/logo.mjs`) is for the favicon and home screen only.
- **Emoji**: none in UI text.

---

## 5. State Honesty

- **Loading**: Names what is being fetched. **Empty**: explains cause and offers a next action. **Errors**: plain language with a recovery path.
