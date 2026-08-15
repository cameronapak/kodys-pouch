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
  emptyState,
  filterItems,
  formatMention,
  itemKey,
  mergeInventory,
  rowSubtitle,
  scopeOptions,
  type Item,
  type MergedPouch,
  type PouchEmpty,
  type Scope,
  type ScopeOption,
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

const initialPouch = readCachedPouch();

export default function KodyPouch() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const { data, isLoading } = useCachedPromise(loadPouch, [], {
    initialData: initialPouch,
    keepPreviousData: true,
  });
  const pouch = data ?? { items: [], errors: [] };
  const options = scopeOptions(pouch.items);
  const rows = filterItems(pouch.items, query, scope);
  const empty = emptyState({
    items: pouch.items,
    query,
    scope,
    errors: pouch.errors,
    isLoading,
  });

  return (
    <List
      isLoading={isLoading && pouch.items.length === 0}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Kody's Pouch"
      searchBarAccessory={
        <ScopeDropdown options={options} scope={scope} onChange={setScope} />
      }
      navigationTitle={
        pouch.errors.length > 0 ? pouch.errors.join(" · ") : "Kody's Pouch"
      }
    >
      {rows.map((item) => (
        <List.Item
          key={itemKey(item)}
          icon={item.kind === "skill" ? Icon.Document : Icon.WrenchScrewdriver}
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
              <Action.CopyToClipboard
                title="Copy Mention"
                content={formatMention(item)}
              />
            </ActionPanel>
          }
        />
      ))}
      {empty ? <PouchEmpty state={empty} /> : null}
    </List>
  );
}

function ScopeDropdown({
  options,
  scope,
  onChange,
}: {
  options: ScopeOption[];
  scope: Scope;
  onChange: (scope: Scope) => void;
}) {
  const kinds = options.filter((option) => option.scope.type !== "parent");
  const parents = options.filter((option) => option.scope.type === "parent");
  return (
    <List.Dropdown
      tooltip="Scope"
      value={scopeValue(scope)}
      onChange={(value) => onChange(scopeFromValue(value))}
    >
      <List.Dropdown.Section title="Kind">
        {kinds.map((option) => (
          <List.Dropdown.Item
            key={scopeValue(option.scope)}
            title={`${option.title} (${option.count})`}
            value={scopeValue(option.scope)}
          />
        ))}
      </List.Dropdown.Section>
      {parents.length > 0 ? (
        <List.Dropdown.Section title="Parents">
          {parents.map((option) => (
            <List.Dropdown.Item
              key={scopeValue(option.scope)}
              title={`${option.title} (${option.count})`}
              value={scopeValue(option.scope)}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}

function scopeValue(scope: Scope): string {
  switch (scope.type) {
    case "all":
      return "all";
    case "skills":
      return "skills";
    case "tools":
      return "tools";
    case "parent":
      return `parent:${scope.parent}`;
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

function scopeFromValue(value: string): Scope {
  switch (value) {
    case "all":
      return { type: "all" };
    case "skills":
      return { type: "skills" };
    case "tools":
      return { type: "tools" };
    default:
      if (value.startsWith("parent:")) {
        return { type: "parent", parent: value.slice("parent:".length) };
      }
      return { type: "all" };
  }
}

function PouchEmpty({ state }: { state: PouchEmpty }) {
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
        <List.EmptyView icon={Icon.MagnifyingGlass} title={state.title} />
      );
    case "empty":
      return (
        <List.EmptyView
          icon={Icon.Tray}
          title={state.title}
          description={state.description}
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
