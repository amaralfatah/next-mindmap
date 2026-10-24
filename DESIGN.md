# Mind Map Design System & Brand Identity

> Mind Map follows Notion's design language: a warm paper canvas, near-black Inter type, hairline edges, barely-there shadows and one confident blue.
> Purpose: untangling everything on your mind into one map, and keeping those maps for years (the author has maps from 2023 onward). Calm, direct, and every interaction stays functional and honest.

---

## 1. Character

- **Concept**: A well-organised desk in good daylight. The map is the hero; chrome is paper-quiet and gets out of the way. Interaction density and keyboard feel borrow from Linear: precise, fast, focus always visible.
- **Tone**: Calm, confident, fast and keyboard-first.
- **Posture**: No generic AI blue-to-purple gradients, no fake metrics, no dead mockup elements, no decoration that doesn't carry meaning.

---

## 2. Color

### Foundation (warm paper)
- **Background (`--background`)**: `#f6f5f4` warm paper (Dark: `#191918`). **Card (`--card`)**: `#ffffff` (Dark: `#202020`). **Popover**: `#ffffff` (Dark: `#2a2a29`).
- **Ink (`--foreground`)**: `#1a1a19` (Dark: `#f3f2f1`). **Stone (`--muted-foreground`)**: `#615d59` (Dark: `#9b9a97`).
- **Fills**: `--secondary` / `--muted` are warm greys (`rgb(55 53 47 / 0.08)` and `/ 0.06`). **Hairline (`--border`)**: `#e6e6e6`.
- **Dot grid (`--dot`)**: a faint warm grid on the canvas.

### One accent
- **Notion blue (`--primary`)**: `#0075de` (Dark: `#3b9bf0`); text-safe variant `--ink` `#005bab` (Dark: `#62aef0`). Used for the primary action, selection, links and focus only. Never decorative.

### Branch pigments
- Notion's sticker palette for branches and edges. Slot names are stored keys in saved maps, so they keep their old names:
  `teal` = blue, `clay` = orange, `ochre` = yellow, `moss` = green, `indigo` = teal, `plum` = purple, `rose` = pink, `slate` = stone.
  Filled nodes on yellow and green use dark text; the rest use white. Node text otherwise stays `--foreground`.

---

## 3. Typography

- **Text and display**: Inter (400, 500, 600, 700) with the system face as fallback. One family carries everything.
- **Tracking is size-specific**: large titles tighten (`-0.03em` h1/h2, `-0.015em` h3), body stays at `0`.
- **Hierarchy** comes from weight and size together: bold (700) tight headlines, regular (400) body at `1.5` leading. Never set body copy heavy.
- **Mono**: `ui-monospace` (SF Mono), Geist Mono as fallback, for keyboard shortcuts.

---

## 4. Shape, Materials & Motion

- **Radius**: base `0.5rem`. Cards `rounded-2xl`, dialogs `rounded-2xl`, menus and popovers `rounded-xl`. Only the primary action is a full capsule; secondary buttons use `rounded-xl`.
- **Cards** (`.card-surface`, `.card-lift`): white platter, 1px hairline, layered near-transparent shadow (`--shadow-card`). Hover lifts 2px with `--shadow-lift` (pointer devices only); press scales to `0.98` instantly. No tilt.
- **Floating chrome** (`.glass`): editor bars, palettes, zoom and search sit on a nearly opaque paper material (`--material` + light blur, `--shadow-float`). The home header is a `.material` bar that gains a hairline once scrolled. Menus, popovers and dialogs stay opaque so a translucent layer never sits on another.
- **Accessibility**: `prefers-reduced-transparency` makes glass solid; `prefers-contrast: more` adds a defined border; `prefers-reduced-motion` swaps rises and lifts for short cross-fades.
- **Motion**: springs, not timed curves. `--ease-spring` is a critically damped spring (no overshoot) for entrances and lifts; `--ease-out` for control feedback. Feedback lands on press. Canvas layout transitions stay at 140ms so keystrokes never feel laggy. No endless loops.
- **Lockup**: header and screens use the Mind Map lockup: the kawung glyph (four ovals around a centre, one oval in `--primary`) + "Mind Map" in Inter SemiBold in the text colour. The app icon (same kawung on a Sararia ink tile, `scripts/logo.mjs`) follows the Sararia family rules and is for the favicon and home screen only.
- **Emoji**: none in UI text.

---

## 5. State Honesty

- **Loading**: Names what is being fetched. **Empty**: explains cause and offers a next action. **Errors**: plain language with a recovery path.
