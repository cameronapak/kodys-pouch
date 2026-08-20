# Kody's Pouch

Your Kody Skills and Tools, one command away.

Kody is the source of truth for your Skills and Tools. Coding harnesses do not list them, so the editor has no autocomplete. You talk to an agent, which means you only reach what you already remember to ask for.

The Pouch makes that inventory visible. Open one Raycast command, search, and paste a Mention or Skill Contents into the Active Input. If there is no Active Input, the Mention is copied.

This extension does not read disk skills or write stubs.

![Kody's Pouch](assets/demo.gif)

## Setup

The Pouch calls a Discovery Package with one invocation token. Installers own their copy. Do not use someone else's token.

1. Fork the Listing: [kody.codes/@cameronpak/raycast-kodys-pouch](https://kody.codes/@cameronpak/raycast-kodys-pouch)
2. Review the fork, then publish it. A fork cannot be invoked until it is published.
3. On **your** published copy, create a token (any export on that Package). Do not paste the token into chat.
4. `npm install && npm run dev`
5. Open **Kody's Pouch** in Raycast
6. Set preferences: base URL (`https://kody.codes`), your Kody username, your token, discovery id (`raycast-kodys-pouch`)

If you already forked Kent's `raycast` listing for the Pouch, fork this Listing instead and mint a new token on that copy. A token belongs to one Package.

`author` in `package.json` is a Raycast Store handle. Change it before you publish. Local `npm run dev` works without that.

## Use

Open **Kody's Pouch**. Type to filter. Pick a row. The Mention pastes at the caret. Use Copy Mention for the clipboard. Skills also offer Paste Contents.
