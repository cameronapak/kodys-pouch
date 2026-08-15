## Learned User Preferences

- Treat Prompt composition as a new surface, not `/`-complete Commands. Commands run Package Exports; Skills are documents.
- Mentions in a pasted Prompt must include the `/name` token, the Skill `id`, and an instruction to load via Kody `skill_get`. Do not inline the Skill body.
- Paste the Prompt into the previously focused Active Input at the caret (or over the selection). Do not replace the whole field.
- Never paste Kody invocation tokens or secrets into chat.

## Learned Workspace Facts

- This repo is a local Raycast extension: a saved-command launcher plus a planned Prompt composer (`/` Skill autocomplete, then paste into the Active Input).
- Kody is the source of truth for Skills, MCPs, and secrets. Disk `SKILL.md` copies are stale.
- Domain language lives in `CONTEXT.md`: Command, Package, Export, Prompt, Mention, Active Input.
- Discovery uses the `@cameronpak/raycast` package (kody id `raycast`) over HTTP with `source: "raycast"`. The discovery kody id preference is optional and defaults to `raycast`.
- Live Kody routes the root export as `__root__`, not `.`.
- Skill display `name` and registry `id` differ (e.g. `grill-with-docs` vs `mattpocock-grill-with-docs`).
