import { Action, ActionPanel, Cache, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { loadSkills, loadTools } from "./kody";
import {
  emptyState,
  formatMention,
  itemKey,
  mergeInventory,
  presentPouch,
  scopeOptions,
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
  const sections = presentPouch(pouch.items, query, scope);
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
      {sections.map((section) => (
        <PouchSectionRows key={section.title ?? "flat"} section={section} />
      ))}
      {empty ? <PouchEmpty state={empty} /> : null}
    </List>
  );
}

function PouchSectionRows({ section }: { section: PouchSection }) {
  const rows = section.rows.map((row) => (
    <PouchItem key={itemKey(row.item)} row={row} />
  ));
  if (section.title === null) {
    return <>{rows}</>;
  }
  return <List.Section title={section.title}>{rows}</List.Section>;
}

function PouchItem({ row }: { row: PouchRow }) {
  const mention = formatMention(row.item);
  return (
    <List.Item
      icon={row.item.kind === "skill" ? Icon.Document : Icon.WrenchScrewdriver}
      title={row.item.name}
      subtitle={row.subtitle}
      actions={
        <ActionPanel>
          <Action.Paste title="Paste Mention" content={mention} />
          <Action.CopyToClipboard title="Copy Mention" content={mention} />
        </ActionPanel>
      }
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
      return <List.EmptyView icon={Icon.MagnifyingGlass} title={state.title} />;
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
