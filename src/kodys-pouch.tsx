import { Action, ActionPanel, Cache, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { clearPackageToolsCache, loadSkills, loadTools } from "./kody";
import {
  emptyState,
  formatMention,
  itemKey,
  rowTitle,
  mergeInventory,
  presentPouch,
  scopeOptions,
  withoutRootExports,
  type Item,
  type MergedPouch,
  type PouchEmpty,
  type PouchRow,
  type PouchSection,
  type Scope,
  type ScopeOption,
} from "./pouch";

const inventoryCache = new Cache();
const INVENTORY_CACHE_KEY = "pouch-inventory";

function readCachedPouch(): MergedPouch {
  const raw = inventoryCache.get(INVENTORY_CACHE_KEY);
  if (!raw) {
    return { items: [], errors: [] };
  }
  try {
    return { items: withoutRootExports(JSON.parse(raw) as Item[]), errors: [] };
  } catch {
    return { items: [], errors: [] };
  }
}

const initialPouch = readCachedPouch();

export default function KodyPouch() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>({ type: "all" });
  const { data, isLoading, revalidate } = useCachedPromise(loadPouch, [], {
    initialData: initialPouch,
    keepPreviousData: true,
  });
  const pouch = data ?? { items: [], errors: [] };
  const options = scopeOptions(pouch.items);
  const sections = presentPouch(pouch.items, query, scope);
  const empty = emptyState({
    items: pouch.items,
    query,
    scope,
    errors: pouch.errors,
    isLoading,
  });
  const onRefresh = () => {
    clearPackageToolsCache();
    revalidate();
  };

  return (
    <List
      isLoading={isLoading}
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
      {sections.map((section) => (
        <PouchSectionRows
          key={section.title ?? "flat"}
          section={section}
          onRefresh={onRefresh}
        />
      ))}
      {empty ? <PouchEmpty state={empty} onRefresh={onRefresh} /> : null}
    </List>
  );
}

function PouchSectionRows({
  section,
  onRefresh,
}: {
  section: PouchSection;
  onRefresh: () => void;
}) {
  const rows = section.rows.map((row) => (
    <PouchItem key={itemKey(row.item)} row={row} onRefresh={onRefresh} />
  ));
  if (section.title === null) {
    return <>{rows}</>;
  }
  return <List.Section title={section.title}>{rows}</List.Section>;
}

function PouchItem({
  row,
  onRefresh,
}: {
  row: PouchRow;
  onRefresh: () => void;
}) {
  const mention = formatMention(row.item);
  return (
    <List.Item
      icon={{
        source: row.item.kind === "skill" ? Icon.Document : Icon.WrenchScrewdriver,
        tintColor: Color.SecondaryText,
      }}
      title={rowTitle(row.item)}
      subtitle={row.subtitle}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Mention" content={mention} />
          <Action.CopyToClipboard title="Copy Mention" content={mention} />
          <RefreshPouchAction onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function RefreshPouchAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh Pouch"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
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

function PouchEmpty({
  state,
  onRefresh,
}: {
  state: PouchEmpty;
  onRefresh: () => void;
}) {
  const actions = (
    <ActionPanel>
      <RefreshPouchAction onRefresh={onRefresh} />
    </ActionPanel>
  );
  switch (state.kind) {
    case "error":
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not refresh Pouch"
          description={state.message}
          actions={actions}
        />
      );
    case "no-match":
      return (
        <List.EmptyView
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          title={state.title}
          actions={actions}
        />
      );
    case "empty":
      return (
        <List.EmptyView
          icon={{ source: Icon.Tray, tintColor: Color.SecondaryText }}
          title={state.title}
          description={state.description}
          actions={actions}
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
