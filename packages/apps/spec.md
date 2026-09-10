# Spec — packages/apps

English | [中文](spec.zh.md)

## Structure

```
packages/apps/                     frontend package
├── index.html                     page shell shared by every window
├── vite.config.ts                 frontend build and dev server
├── package.json                   frontend dependencies and scripts
├── src/                           frontend body, host-agnostic
│   ├── main.ts                    window label / hash → entry module
│   ├── entry/                     per-window entry: createWindowShell + mount
│   ├── shell/                     services an entry creates: bridge, store, actions, theme, i18n, window adapter
│   │   └── kinds/                 per-window host wiring and shared state (`<kind>.ts` / `<kind>-state.svelte.ts`)
│   ├── windows/                   window components: the frame and exactly one Surface's content
│   ├── widgets/                   tier-1 widgets and their variants
│   ├── components/                tier-2 business components: Card rendering and its type registry, message list, config field rows
│   ├── size/                      size model: text measurement, block model, per-type sizeModel
│   ├── positioning/               window placement engine
│   ├── utils/                     small shared helpers: no UI, no services (debounce, text)
│   └── styles/                    token table, the Tailwind entry, and the rules components share (the config-row family)
├── test/                          headless frontend cases (vitest)
├── tauri/                         tauri form: host layer + Tauri shell
│   └── src-tauri/                 shell crate (frontendDist → ../../dist)
└── webui/                         pure-web form: host layer (static serving + browser-side IPC transport)
```

- A form adds its host layer only — window creation, IPC transport, packaging — around the same `src/`.
- `entry/` is the only place that creates services; `windows/`, `widgets/` and `components/` hold components; `size/` holds the size model and nothing else. Layer rules and widget tiers: `docs/ui-composition.md`.
- Window management — create, size, place, show, hide, destroy — belongs to the form's host layer (`tauri/src-tauri/`); the frontend never performs it.
- Content one window uses sits beside its window component; content shared across windows sits in `components/`.

## Best practices

Rules this package adopts, taken from the frameworks it builds on — Svelte's and bits-ui's own best practices — and the placement they imply. Upstream rules are not local taste: local markup reuse is a snippet, a keyed block keys by identity, and an effect does not write state.

- **One component per file**, named `PascalCase.svelte`; the file name is the component's name. A window component keeps the window name (`windows/ChatWindow.svelte`).
- **A component with private files gets a directory named after it** — variants, pure logic and its own state module sit beside it: `widgets/button/Button.svelte` + `button-variants.ts`, `components/chat-panel/ChatPanel.svelte` + `chat-rows.ts`. A component without private files stays flat in its layer directory.
- **A widget's variants are declared beside it** (`tailwind-variants`), never in the shared stylesheet.
- **Pure logic is a plain module** beside the component that consumes it: no DOM, no services, no runes — the component calls it and renders the result.
- **Reactive state shared by a host and its component lives in the shell** (`shell/kinds/<kind>-state.svelte.ts`); the component receives it as a prop and never constructs it.
- **Local reuse is a snippet** (`{#snippet}` with `{@render}`); it becomes its own component file when a second consumer appears or when it carries a behaviour contract of its own.
- **A keyed each block keys by identity** — never by index.
- **`$derived` carries computation; `$effect` is an escape hatch** for DOM side effects (scroll, measurement, observers) and writes no state — an interaction drives state from its own handler.
- **A measurement reads the DOM after the render it depends on**: a state write lands in the DOM on the next render, so a measurement that follows one awaits `tick()`; reading it in the same task measures the previous frame and yields a size or a rect taken from stale geometry.
- **No prop or local binding named `state`**: a binding that collides with a rune name makes `$state(...)` read as a store subscription, and the component silently loses its reactivity.
- **A class handed to a child component is styled with `:global()`**, in the component that owns the class name: the scope hash never reaches a child's element, and Svelte prunes the rule as unused — the style disappears from the bundle.
- **A primitive's portal renders flat**: bits-ui's dialog portal puts `Overlay` and `Content` into the page root as siblings, and the content carries no position of its own — the caller styles its box (`position: fixed`, its own centering, a `z-index` above the overlay), otherwise it lands in the document flow behind the overlay.
- **A control that shows only an icon or a symbol carries a Tooltip and an `aria-label`**; a text hint attached to a labelled row keeps the native `title`.
- **Runes only in new code**: `onclick={...}`, `$props()`, snippets instead of slots; no legacy APIs.

## Technology choices

| Form | Technology |
|---|---|
| tauri | Tauri 2 shell + the shared frontend |
| webui | pure-web form, same frontend code's second host |
| frontend | Svelte 5 components + bits-ui behaviour primitives + Tailwind 4 with tailwind-variants |

Tradeoffs:

- **One frontend, two hosts** — window management and IPC differ per form; the frontend code does not. The bridge layer (bridge.ts / effects) is the seam; hosts implement it, the UI stays host-agnostic.
- **Svelte 5 for the UI layer** — the display logic is data-driven (a Component registry, a schema-driven settings form, a message list); a component framework carries that with less hand-written DOM and less manual re-rendering than direct construction. Framework runtime size does not decide this: the app is local, and one window's webview costs megabytes regardless of the bundle.
- **bits-ui as a dependency, widgets as this repository's own code** — bits-ui carries behaviour, accessibility and placement; appearance, variants and tokens stay here (`docs/ui-composition.md`).

## Architecture decisions

1. **One frontend, two forms**: tauri and webui are host layers over the same `src/`; they differ in host layer (window management, IPC transport, packaging).
2. **Forms talk to core only through the established channel** — native IPC in the packaged tauri form; thin HTTP+WS loopback (127.0.0.1) in browser/webui mode. Same frontend code in both modes.

## Fixed constraints

- Svelte 5 is the only UI framework; no second UI framework and no Web Components.
- UI interaction must not use browser-native popups (alert / prompt / confirm): errors and input are expressed with in-app UI elements.
