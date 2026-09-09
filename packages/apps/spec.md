# Spec — packages/apps

English | [中文](spec.zh.md)

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

1. **Each form is one package over the same frontend core**: tauri and webui both embed/serve the same src; they differ in host layer (window management, IPC transport, packaging).
2. **Forms talk to core only through the established channel** — native IPC in the packaged tauri form; thin HTTP+WS loopback (127.0.0.1) in browser/webui mode. Same frontend code in both modes.

## Fixed constraints

- Svelte 5 is the only UI framework; no second UI framework and no Web Components.
- UI interaction must not use browser-native popups (alert / prompt / confirm): errors and input are expressed with in-app UI elements.
