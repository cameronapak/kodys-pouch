## Learned User Preferences

- One Raycast command: Kody's Pouch. Search Tools and Skills, pick to paste a Mention. No compose field, no Add Commands, no Commands launcher.
- Mentions are one line, never the Skill or Tool body. Skill: `/name (Kody skill_get id: <id>)`. Package Tool: `$name (Kody invoke kodyId: <id> export: <export>)`. Built-in: `$name (Kody <capability>)`. MCP: `$name (Kody mcp <server> <tool>)`.
- Paste the Mention into the previously focused Active Input at the caret (or over the selection). Do not replace the whole field. Use Raycast `Action.Paste` (not AppleScript focus checks). Copy Mention is the clipboard fallback.
- Pick is the only write: closing Pouch without a pick is a no-op; a successful pick closes the Pouch.
- Never paste Kody invocation tokens or secrets into chat.
- Search with fuse.js over name, description, Parent, and a Skill's id. Use better-result v3 for errors-as-values. Do not add TanStack Query; use Raycast `useCachedPromise` + `Cache`.
- List titles: Skills `/name`, Tools `$name`. Skill icon Document, Tool icon WrenchScrewdriver, both secondary/muted — not primary.
- Manual refetch is a pouch-wide Action (⌘R / `Keyboard.Shortcut.Common.Refresh`) on every row and the empty view — not a second command.

## Learned Workspace Facts

- This repo is the Kody's Pouch Raycast extension: a window into Kody inventory. It does not read disk skills or write stubs.
- Kody is the source of truth for Skills, Tools, MCPs, and secrets. Disk `SKILL.md` copies are stale.
- Domain language lives in `CONTEXT.md`: Pouch, Tool, Skill, Origin, Parent, Package, Scope, Mention, Active Input, Clipboard Fallback. Command, Export, Composer, and Prompt are retired.
- A Tool is anything Kody can call. Parents: Package, Kody (built-in), MCP server, or another connected provider. Skills are documents, not Tools, and appear only if the skills package exists.
- Missing skills package is not an error (Tools only). A failed fetch keeps what loaded (or last-good) and shows a visible error. Last-good inventory shows immediately, then refreshes in the background.
- Discovery uses the `@cameronpak/raycast` package (kody id `raycast`) over HTTP with `source: "raycast"`: `list-packages`/`get-package` for packages, `list-capabilities` for built-ins, MCP, OpenAPI, and remote connectors. The discovery kody id preference is optional and defaults to `raycast`.
- MCP servers appear as Parents like packages; tools come from `list-capabilities` (`source: "mcp-server"`). Disabled or auth-pending servers stay out.
- Omit each package's root export (`.`, `__root__`, `./`) from the Pouch. Live Kody names it `__root__`, not `.`. Named package exports remain; Mentions still include `export:` for named tools.
- Skill display `name` and registry `id` differ (e.g. `grill-with-docs` vs `mattpocock-grill-with-docs`).
- Package tools use `withCache` with a 5-minute maxAge. Opening can still show stale package tools; the Refresh Action clears that cache then revalidates. Last-good stays on screen during the Action; Cache rewrites only after a clean successful merge.
