import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Icon,
  List,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { loadSkills, loadTools } from "./kody";
import {
  filterItems,
  formatMention,
  itemKey,
  mergeInventory,
  rowSubtitle,
  type Item,
  type MergedPouch,
} from "./pouch";

const inventoryCache = new Cache();
const INVENTORY_CACHE_KEY = "pouch-inventory";

const TEXT_ROLES = new Set([
  "AXTextField",
  "AXTextArea",
  "AXSearchField",
  "AXComboBox",
  "AXText",
]);

export default function KodyPouch() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useCachedPromise(loadPouch, [], {
    initialData: readCachedPouch(),
    keepPreviousData: true,
  });
  const pouch = data ?? { items: [], errors: [] };
  const rows = filterItems(pouch.items, query);
  const empty = emptyState({
    query,
    rowCount: rows.length,
    itemCount: pouch.items.length,
    errors: pouch.errors,
    isLoading,
  });

  return (
    <List
      isLoading={isLoading && pouch.items.length === 0}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Kody Pouch"
      navigationTitle={
        pouch.errors.length > 0 ? pouch.errors.join(" · ") : "Kody Pouch"
      }
    >
      {rows.map((item) => (
        <List.Item
          key={itemKey(item)}
          icon={item.kind === "skill" ? Icon.Book : Icon.Hammer}
          title={item.name}
          subtitle={rowSubtitle(item)}
          accessories={[{ tag: item.kind === "skill" ? "Skill" : "Tool" }]}
          actions={
            <ActionPanel>
              <Action
                title="Paste Mention"
                icon={Icon.Clipboard}
                onAction={() => void pickItem(item)}
              />
            </ActionPanel>
          }
        />
      ))}
      {empty ? <PouchEmpty state={empty} /> : null}
    </List>
  );
}

type EmptyState =
  { kind: "error"; message: string } | { kind: "no-match" } | { kind: "empty" };

function emptyState({
  query,
  rowCount,
  itemCount,
  errors,
  isLoading,
}: {
  query: string;
  rowCount: number;
  itemCount: number;
  errors: string[];
  isLoading: boolean;
}): EmptyState | null {
  if (rowCount > 0) {
    return null;
  }
  if (errors.length > 0 && itemCount === 0) {
    return { kind: "error", message: errors.join(" · ") };
  }
  if (query.trim() !== "") {
    return { kind: "no-match" };
  }
  if (isLoading) {
    return null;
  }
  return { kind: "empty" };
}

function PouchEmpty({ state }: { state: EmptyState }) {
  switch (state.kind) {
    case "error":
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not refresh Pouch"
          description={state.message}
        />
      );
    case "no-match":
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching Tools or Skills"
        />
      );
    case "empty":
      return (
        <List.EmptyView
          icon={Icon.Tray}
          title="Pouch is empty"
          description="No Tools or Skills from Kody yet."
        />
      );
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

async function loadPouch(): Promise<MergedPouch> {
  const lastGood = readCachedPouch().items;
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const merged = mergeInventory({ tools, skills, lastGood });
  if (merged.errors.length === 0 && merged.items.length > 0) {
    inventoryCache.set(INVENTORY_CACHE_KEY, JSON.stringify(merged.items));
  }
  return merged;
}

function readCachedPouch(): MergedPouch {
  const raw = inventoryCache.get(INVENTORY_CACHE_KEY);
  if (!raw) {
    return { items: [], errors: [] };
  }
  try {
    return { items: JSON.parse(raw) as Item[], errors: [] };
  } catch {
    return { items: [], errors: [] };
  }
}

async function pickItem(item: Item) {
  const mention = formatMention(item);
  await closeMainWindow();
  if (await hasActiveInput()) {
    try {
      await Clipboard.paste(mention);
      return;
    } catch {
      await Clipboard.copy(mention);
      await showHUD("Copied to clipboard");
      return;
    }
  }
  await Clipboard.copy(mention);
  await showHUD("Copied to clipboard");
}

async function hasActiveInput(): Promise<boolean> {
  try {
    const role = await runAppleScript(`
      tell application "System Events"
        repeat 20 times
          set proc to first application process whose frontmost is true
          if name of proc is not "Raycast" then
            return role of (value of attribute "AXFocusedUIElement" of proc)
          end if
          delay 0.05
        end repeat
        return "no"
      end tell
    `);
    return TEXT_ROLES.has(role.trim());
  } catch {
    return false;
  }
}
