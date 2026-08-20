# Kody's Pouch

Raycast window into Kody inventory. Search Tools and Skills, pick to paste a Mention. Kody is the source of truth; this extension does not read disk skills or write stubs.

Keep this file brief. Put task-specific guidance behind a pointer.

## Gotchas

- Last-good: missing skills package is Tools-only, not an error. A failed fetch keeps last-good and shows a visible error. Last-good paints immediately, then refreshes. Cache rewrites only after a clean merge.
- Package tools stay behind a 5-minute `withCache`. Refresh Pouch (⌘R) clears it then revalidates; last-good stays on screen.
- Pins and Recents live in LocalStorage, not last-good Cache. Refresh Pouch revalidates inventory only.
- Root exports (`.`, `__root__`, `./`) stay out of the Pouch. Live Kody names the root `__root__`.
- Discovery invokes the `raycast` package over HTTP with `source: "raycast"`.
- Data: Raycast `useCachedPromise` + `Cache`, not TanStack Query.

## Guardrails

- Keep invocation tokens in Raycast preferences. Secrets stay out of chat.

## Language

Domain terms or Mention shape: read `CONTEXT.md`.
Recent, Pin, or empty-query layout: read `docs/recent-and-pin.md`.
