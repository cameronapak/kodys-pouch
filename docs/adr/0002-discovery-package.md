# Pouch owns a dedicated Discovery Package listing

The Pouch needs a dedicated Package that loads Tools, Skills, and Skill Contents. Kent's `raycast` listing is a generic launcher kit, so a fork of that listing is the wrong product identity. Publish `@cameronpak/raycast-kodys-pouch` (`kody.id` `raycast-kodys-pouch`) as a Community Listing: a pinned snapshot installers fork and publish. The extension default discovery id matches. After the author migrates, retire the `raycast` fork.

Kody retired package invocation tokens in favor of inbound webhooks. The Discovery Package declares one `sync`, `params` webhook per export the extension calls. Installers mint those five credential URLs on their own published fork and store them in Raycast password preferences. Contents load through the Discovery Package `get-skill` webhook, not directly through `skills/skill-get`.
