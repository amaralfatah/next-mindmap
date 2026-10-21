# Mind Map Design System & Brand Identity

> Mind Map is a pink sticker-book notebook for thinking: blush dotted paper, berry ink, and playful, rounded shapes.
> Audience: teenage girls. Cute and friendly, but every interaction stays functional and honest.

---

## 1. Brand Metaphor & Core Character

- **Concept**: A decorated notebook full of stickers. Dotted blush paper, bubblegum-pink accents, chunky sticker shadows.
- **Tone**: Playful, warm, encouraging, still fast and keyboard-first.
- **Posture**: No generic AI blue-to-purple gradients, no fake metrics, no dead mockup elements.

---

## 2. Color Palette (OKLCH)

### Core Foundation
- **Background (`--background`)**: Blush paper `oklch(0.982 0.014 350)` (Dark: aubergine `oklch(0.2 0.04 340)`)
- **Secondary Surface (`--paper-2`)**: `oklch(0.96 0.03 350)`
- **Foreground (`--foreground`)**: Deep berry ink `oklch(0.27 0.06 350)` (Dark: `oklch(0.95 0.02 350)`)
- **Dot Grid (`--dot`)**: Pink guidance dots `oklch(0.86 0.07 350)`

### One Deliberate Accent
- **Bubblegum Pink (`--primary`)**: `oklch(0.58 0.21 5)`; text-safe variant `--ink` `oklch(0.54 0.2 5)`. `--ink-soft` is the sticker shadow color.

### Branch Pigments (Data Visualization)
- Candy set used for mind map branches and edges. Slot names are stored keys in saved maps, so they keep their old names:
  `teal` = hot pink, `clay` = coral, `ochre` = butter, `moss` = mint, `indigo` = lavender, `plum` = orchid, `rose` = bubblegum, `slate` = sky.
  Node text always stays `--foreground`.

---

## 3. Typography

- **Display (`--font-display`)**: Fredoka, a round, friendly face for headings and nodes.
- **Body (`--font-sans`)**: Nunito, rounded and highly legible.
- **Mono (`--font-mono`)**: Geist Mono for keyboard shortcuts.

---

## 4. Shape, Motion & Dose Caps

- **Radius**: base `1rem`, cards `rounded-3xl`. Only the primary action is a full pill; secondary buttons use `rounded-xl` so controls keep a visible hierarchy.
- **Stickers**: `.sticker` / `.sticker-hover` give a hard offset pink shadow; cards tilt slightly on hover (pointer devices only).
- **Motion**: Level 2. Canvas transitions capped at 140ms; entrances 520ms rise. Respect `prefers-reduced-motion`. No endless animated loops.
- **Glass**: max 1 blurred boundary (sticky nav). Floating palettes stay opaque.
- **Lockup**: header and screens use the Mind Map lockup: the kawung glyph (four ovals around a centre, one oval in `--primary`) + "Mind Map" in Inter SemiBold, ink `#1d1d1f` / white. The app icon (same kawung on a Sararia ink tile, `scripts/logo.mjs`) is for the favicon and home screen only.
- **Emoji**: none in UI text. Cuteness comes from color, shape and tone of voice.

---

## 5. State Honesty

- **Loading**: Names what is being fetched. **Empty**: explains cause and offers a next action. **Errors**: plain language with a recovery path.
