# Kody Pouch

The one Raycast command for the user's Kody Pouch. The Pouch holds Tools and Skills. Selecting one pastes a Mention into the Active Input. Kody is the source of truth.

## Language

**Kody**:
The source of truth for the user's Skills, Tools, MCPs, secrets, and other durable assistant state.
_Avoid_: local config, editor settings, disk folders as source of truth

**Pouch**:
The user's inventory of Tools and Skills from Kody. The only Raycast command. Scope narrows to All, Skills, Tools, or one Parent. Search matches name, description, Parent, and a Skill's id. A successful pick writes one Mention and closes. It does not read disk or write stubs.
_Avoid_: Commands list, Composer, launcher, stub, local SKILL.md

**Skill**:
A named, versioned instruction document stored in the Kody skills registry. Display name and id can differ. In the Pouch only when the skills package exists. Disk copies are stale.
_Avoid_: local SKILL.md as the canonical skill, tool, Author

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

**Mention**:
A one-line Pouch reference written only when a row is picked. Closing the Pouch writes nothing. Skill: `/name (Kody skill_get id: <id>)`. Package Tool: `/name (Kody invoke kodyId: <id> export: <export>)`. Built-in Tool: `/name (Kody <capability>)`. MCP Tool: `/name (Kody mcp <server> <tool>)`. Other Tools: same one-line pattern. Not the body.
_Avoid_: stub, inline skill, bare name, multi-line mention, Prompt

**Active Input**:
The text field that had focus before Raycast opened. The Mention is pasted at the caret (or over the selection), like a normal paste. It does not replace the whole field.
_Avoid_: clipboard as the destination, Raycast search bar, replace-all

**Clipboard Fallback**:
When there is no Active Input, the Mention is copied and the user is told. Clipboard is not the destination.
_Avoid_: silent copy, fake paste
