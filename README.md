# Mind Map

By [Sararia](https://sararia.com) · mindmap.sararia.com

A fast, keyboard-first mind map web application. An account is required (Neon Auth: Google or email); maps are stored per account in Neon PostgreSQL. There is no guest mode: maps left in a browser by the old guest mode are moved into the account on the next sign-in.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (model, layout, io, storage, editor store, drag-drop)
npm run typecheck
npm run lint
npm run build      # standard Next.js server production build
npm start          # run production server
```

## How it works

| Folder | What lives there |
|---|---|
| `lib/model/` | The `MindMap` type and pure operations (add, delete, move, collapse, search), snapshot undo history, and `migrateMap`. |
| `lib/layout/` | Two-sided tree layout (uses `d3-hierarchy` for traversal), text wrapping and measuring, and arrow-key navigation over the laid-out map. |
| `lib/io/` | `.mindmap.json` (one map or a backup of all maps), Markdown outline import/export, SVG export, PNG rasterizing, color conversion for exports. |
| `lib/storage/` | API client for the Next.js `/api/maps` routes (Neon PostgreSQL). Saves are conditional on the last-seen `updatedAt` (`X-Base-Updated-At`; 409 changed, 410 deleted). Cross-tab notices over `BroadcastChannel`. |
| `lib/editor/` | The zustand editor store, 500 ms autosave, drop-target logic for drag and drop, the shared layout context, and export actions. |
| `components/editor/` | Canvas (`@xyflow/react`), custom node and edge, keyboard shortcuts, toolbars, notes panel, search. |
| `lib/i18n.ts`, `components/i18n-provider.tsx` | Indonesian and English dictionaries. The choice lives in the `mindmap-locale` cookie (default: the browser's first language), so the server renders the right language. Components read it with `useT()`. |
| `components/home/` | Map list, thumbnails, import, paste-outline, rename, and delete dialogs. |
| `app/api/` | Next.js API endpoints (`/api/maps`, `/api/maps/[id]`) backed by Neon PostgreSQL. |

## Keyboard Shortcuts

| Keys | Action |
|---|---|
| Tab / Enter | Add child / sibling |
| F2, or start typing | Edit text (Shift+Enter for a new line) |
| Delete | Delete node and its branch |
| Arrows | Move selection; Ctrl+↑/↓ reorders |
| Space | Collapse or expand |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |
| Ctrl+B / Ctrl+I | Bold / italic |
| Ctrl+. | Note panel |
| Ctrl+F | Search in map |
| Ctrl+0, Ctrl+± | Fit, zoom |
| Ctrl+/ | All shortcuts |
