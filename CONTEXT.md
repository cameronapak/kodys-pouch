# Kody's Pouch

The one Raycast command for Kody's Pouch. The Pouch holds Tools and Skills. Selecting one pastes a Mention into the Active Input. Kody is the source of truth.

## Language

**Kody**:
The source of truth for the user's Skills, Tools, MCPs, secrets, and other durable assistant state.
_Avoid_: local config, editor settings, disk folders as source of truth

**Pouch**:
The user's inventory of Tools and Skills from Kody. The only Raycast command. Scope narrows to All, Skills, Tools, or one Parent. Search matches name, description, Parent, and a Skill's id. A successful pick pastes a Mention or Contents and closes. It does not read disk or write stubs.
_Avoid_: Commands list, Composer, launcher, stub, local SKILL.md

**Skill**:
A named, versioned instruction document stored in the Kody skills registry. Display name and id can differ. In the Pouch only when the skills package exists. Disk copies are stale. Grouped by Origin. Not a Tool and has no Parent.
_Avoid_: local SKILL.md as the canonical skill, tool, Author

**Origin**:
The inferred group for a Skill: the first kebab segment of its id, only when two or more Skills in the inventory share that segment. Skills that do not share a prefix sit in Other Skills. Not a Parent. Not the retriever `source` on skill-search (always "skills registry").
_Avoid_: source, author, Parent, skill-search source

**Tool**:
Anything Kody can call. Parent is a Package, Kody, an MCP server, or another connected provider.
_Avoid_: command, export, function, endpoint, skill

**Parent**:
Where a Tool lives: a Package, Kody, an MCP server, or another connected provider. A Skill is not a Tool and has no Parent.
_Avoid_: owner, source, namespace

**Package**:
A Kody package the user can browse and invoke. A Package is one kind of Parent.
_Avoid_: app, plugin

**Scope**:
Which slice of the Pouch is visible: All, Skills, Tools, or one Parent that has Tools. Skills and Tools are always options. Search matches inside the current Scope. Opening the Pouch starts at All.
_Avoid_: Filter, Agent, category, a saved preference

**Recent**:
A pick that is not a Pin, shown in a Recent section when the query is empty. The section holds up to 5. Honors Scope. Unpinning restores the item here if it is still Recent. A pick is a successful Paste Mention or Paste Contents.
_Avoid_: favorite, history, selected item, last used, Copy Mention, Copy Contents

**Pin**:
A user-marked item that stays in a Pinned section above Recent until unpinned. At most 5 across the Pouch, not per Scope. Newest pin first. Pinning is not a pick.
_Avoid_: favorite, bookmark, star

**Mention**:
A one-line Pouch reference written by Paste Mention (or Copy Mention). Closing the Pouch writes nothing. Skill: `/name (Kody skill_get id: <id>)`. Package Tool: `$name (Kody invoke kodyId: <id> export: <export>)`. Built-in Tool: `$name (Kody <capability>)`. MCP Tool: `$name (Kody mcp <server> <tool>)`. Other Tools: same one-line pattern. Not the Contents.
_Avoid_: stub, inline skill, bare name, multi-line mention, Prompt, Contents

**Contents**:
The Skill instruction document pasted into the Active Input instead of a Mention. Skills only. Tool rows have no Contents action. Shape: one lead-in line (`Follow this Skill:`), then a four-backtick fenced block tagged `md title="{name}.md"` whose body is the full Skill markdown including YAML frontmatter. `{name}` is the Skill display name.
_Avoid_: Mention, body, stub, inline skill, Tool payload, three-backtick outer fence, Kody id in the title, bare SKILL.md title

**Active Input**:
The text field that had focus before Raycast opened. A pick pastes the Mention or Contents at the caret (or over the selection), like a normal paste. It does not replace the whole field.
_Avoid_: clipboard as the destination, Raycast search bar, replace-all

**Clipboard Fallback**:
Copy Mention and Copy Contents are the fallback actions when paste into the Active Input is not available. A pick always pastes via Raycast into the previously focused app. Clipboard is not the destination. Copy does not record a Recent.
_Avoid_: AppleScript focus checks, silent copy, fake paste
