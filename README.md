# Kody Raycast

Local picker for your Kody packages. Browse exports, save commands, run them from Raycast.

Uses your `@cameronpak/raycast` discovery package over HTTP. Personal automations stay in your other packages.

## Setup

1. Create a token: [Personal Raycast token](https://kody.codes/account/package-invocation-tokens/new?name=Personal%20Raycast&packageKodyIds=*&exportNames=*&sources=raycast)
2. `npm install && npm run dev`
3. Open **Kody Commands** in Raycast
4. Set preferences: base URL (`https://kody.codes`), username, token, discovery id (`raycast`)

Do not paste the token into chat.

`author` in `package.json` is a Raycast Store handle. Change it before you publish. Local `npm run dev` works without that.

## Use

- **Kody Commands** — run, edit, or delete saved commands
- **Add Kody Command** — pick a package, pick an export, save params
- Run Once — invoke without saving
- `⌘N` add, `⌘E` edit, `⌃X` delete
