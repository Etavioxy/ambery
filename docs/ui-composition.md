# UI Composition

English | [中文](ui-composition.zh.md)

> What each Surface is belongs to concepts.md §Surface and `docs/multi-window.md`; window creation, placement and coordinate units to `docs/window-follow.md`; Card size derivation to `docs/card-window-size.md`; theme values to `docs/theme.md`; module layering and data flow to `docs/module-storage-flow.md`.

## Principles

> **Scope of this document** — this document defines how UI code is layered and composed: the window component, the widget tiers, style composition, and the rules a component follows; it does not define what a Surface is, how windows are created or placed, how a Card's size is derived, or which theme values exist.

> **A component carries rendering only** — data logic stays out of it, and complex logic is extracted into a pure module or function that the component consumes. §Component principles states what this means for UI code.

## Layers

```
OS window          host        the shell creates, sizes, places, shows, hides and destroys it
Window component   component   one per window — its frame and mount convention; the entry of the component world
Surface content    component   the business component tree rendered inside it
widget tiers       component   atoms, composites and business components
DOM                rendering   what the user sees
```

- A window is a host object. A component never creates, sizes, moves or shows a window; that belongs to the window layer (`docs/module-storage-flow.md`).
- The window component is the window's frame and mount convention: it renders the chrome, declares the window's sizing model (`fill` or `intrinsic`), and renders exactly one Surface's content. It is the entry of the component world; window management stays outside it.
- One Card component serves every container: the same Card renders inside its own window and inside a container surface.

## Widget tiers

| Tier | Owner | Examples | Rule |
|---|---|---|---|
| 0 behaviour primitive | bits-ui (dependency) | Select, Checkbox, Dialog, Tooltip | behaviour, accessibility, placement; no styling |
| 1 widget | this project | Button, Input, Panel, Field | variants are defined here; widgets may compose each other |
| 2 business component | this project | ChatPanel, CardBox | composition and business semantics only |

- A tier-1 widget either wraps a tier-0 primitive with this project's variants, or is written here when bits-ui has no counterpart.
- Dependency is one-way: 2 → 1 → 0; a tier-2 component does not use a tier-0 primitive directly.
- Variants belong to tier 1. A tier-2 component composes and places; it defines no appearance rule of its own.
- A widget's height is a declared layout constant, never content-driven (`docs/card-window-size.md` §Content blocks).
- Something becomes a widget when it appears in more than one place or carries a behaviour or accessibility contract; a one-off layout stays inline.

## Style composition

| Layer | Source | Produces |
|---|---|---|
| token | the `--ov-*` table (the theme's landing point) | CSS custom properties |
| semantic utility | the Tailwind theme mapped from the tokens | utility classes |
| primitive state | bits-ui data attributes | state selectors |
| variant | tailwind-variants | class functions and slots |
| motion | Svelte transitions | `transition:`, `animate:flip` |
| instance override | the caller's `class` | a local adjustment |

Discipline: a utility reads tokens and never a literal value; a variant uses utilities and primitive state; an instance override adjusts and never redefines; the theme layer carries no size (`docs/card-window-size.md` §Recompute triggers).

## Component principles

A component carries rendering only; the rules below are that principle applied to UI code:

- A component does not call IPC, the positioning engine, storage or the Harness; data arrives through props and leaves through callbacks.
- Inputs are props (data) and snippets (structure); outputs are DOM and events.
- A component never derives size; size comes from the size model (`docs/card-window-size.md`).

## Naming and files

- File names are semantic and multi-word; one widget per file, with its variants beside it.
- A component file carries the component; shared pure logic lives in a `.ts` module.
- A widget's public surface is its props and snippets; callers do not address its internal elements by class name.
