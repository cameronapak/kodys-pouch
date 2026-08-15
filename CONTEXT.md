# Kody Raycast

A Raycast surface for the user's Kody account. Commands run Package Exports. The Composer is a separate command where a Prompt (words plus Mentions) is written and pasted into the Active Input. Kody is the source of truth for Skills, MCPs, secrets, and other durable assistant state.

## Language

**Kody**:
The source of truth for the user's Skills, MCPs, secrets, and other durable assistant state.
_Avoid_: local config, editor settings, disk folders as source of truth

**Skill**:
A named, versioned instruction document stored in the Kody skills registry. Disk copies of a Skill are stale.
_Avoid_: local SKILL.md as the canonical skill

**Command**:
A named, saved invocation of a Kody Package Export, run from Raycast.
_Avoid_: shortcut, alias, skill

**Package**:
A Kody package the user can browse and invoke.
_Avoid_: app, plugin

**Export**:
A callable entry on a Package.
_Avoid_: function, endpoint, command

**Composer**:
The Raycast command where the user writes a Prompt and `/`-completes Mentions. Separate from the Command launcher. `/` starts a Mention; picking a Skill replaces the `/partial` in place.
_Avoid_: launcher, Commands list, search, separate skill picker

**Prompt**:
The text the user composes in the Composer: 0+ words and 1+ Mentions. Words are optional. A Prompt with no Mentions is not a Prompt and does not paste. It is not a Command.
_Avoid_: Command, query, message

**Mention**:
A one-line Skill reference in a Prompt: `/name (Kody skill_get id: <id>)`. Not the Skill body. It replaces the `/partial` in place.
_Avoid_: stub, inline skill, bare name, multi-line mention

**Active Input**:
The text field that had focus before Raycast opened. The Prompt is pasted at the caret (or over the selection), like a normal paste. It does not replace the whole field.
_Avoid_: clipboard as the destination, Raycast search bar, replace-all

**Clipboard Fallback**:
When there is no Active Input, the Prompt is copied and the user is told. Clipboard is not the destination.
_Avoid_: silent copy, fake paste
