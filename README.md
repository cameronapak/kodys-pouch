# Kody's Pouch

Your Kody Skills and Tools, one command away.

Kody is the source of truth for your Skills and Tools. Coding harnesses do not list them, so the editor has no autocomplete. You talk to an agent, which means you only reach what you already remember to ask for.

The Pouch makes that inventory visible. Open one Raycast command, search, and paste a Mention or Skill Contents into the Active Input. If there is no Active Input, the Mention is copied.

This extension does not read disk skills or write stubs.

![Kody's Pouch](assets/demo.gif)

## Setup

The Pouch calls one inbound webhook on a Discovery Package. Installers own their copy and webhook URL. Treat the URL as a credential.

The Skills list loads from a published `skills` Package in your account: fork https://kody.codes/@kentcdodds/skills, then privately publish your copy. Your Discovery Package finds that Package by `kody.id` and loads Skill Contents through `get-skill`. If the `skills` Package is missing, the Pouch still shows Tools.

1. Fork the Listing: [kody.codes/@cameronpak/raycast-kodys-pouch](https://kody.codes/@cameronpak/raycast-kodys-pouch)
2. Review the fork, then publish it. A fork cannot receive webhook calls until it is published.
3. Open your Package settings at `https://kody.codes/@<username>/raycast-kodys-pouch/settings#webhooks`.
4. Mint and copy the `pouch` webhook URL. Do not paste it into chat.
5. `npm install && npm run dev`
6. Open **Kody's Pouch** in Raycast.
7. Set your username, paste the URL into the Pouch Webhook URL password preference, and keep discovery id as `raycast-kodys-pouch`.

If you already use the five legacy URLs, update and publish your Discovery Package fork, mint `pouch`, then replace those preferences with the one Pouch Webhook URL.

`author` in `package.json` is a Raycast Store handle. Change it before you publish. Local `npm run dev` works without that.

## Use

Open **Kody's Pouch**. Type to filter, or narrow the Scope dropdown to Skills, Tools, or one Parent. Pick a row. The Mention pastes at the caret. Use Copy Mention or Copy Contents for the clipboard. Skills also offer Paste Contents (⇧↩).

Pin a row with ⌘⇧P to keep it in a Pinned section above Recent. Refresh Pouch (⌘R) revalidates the inventory.
