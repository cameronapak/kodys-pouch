import { TaggedError } from "better-result";
import Fuse from "fuse.js";

export type SkillItem = {
  kind: "skill";
  name: string;
  id: string;
  description: string;
};

export type PackageTool = {
  kind: "tool";
  parentKind: "package";
  name: string;
  description: string;
  kodyId: string;
  exportName: string;
};

export type BuiltinTool = {
  kind: "tool";
  parentKind: "kody";
  name: string;
  description: string;
  capability: string;
};

export type McpTool = {
  kind: "tool";
  parentKind: "mcp";
  name: string;
  description: string;
  server: string;
  tool: string;
};

export type OtherTool = {
  kind: "tool";
  parentKind: "other";
  name: string;
  description: string;
  provider: string;
  ref: string;
};

export type ToolItem = PackageTool | BuiltinTool | McpTool | OtherTool;
export type Item = SkillItem | ToolItem;

export type Scope =
  | { type: "all" }
  | { type: "skills" }
  | { type: "tools" }
  | { type: "parent"; parent: string };

export type ScopeOption = {
  scope: Scope;
  title: string;
  count: number;
};

export type PouchRow = {
  item: Item;
  subtitle: string;
};

export type PouchSection = {
  title: string | null;
  rows: PouchRow[];
};

export type PouchEmpty =
  | { kind: "error"; message: string }
  | { kind: "no-match"; title: string }
  | { kind: "empty"; title: string; description?: string };

export class SkillsMissing extends TaggedError("SkillsMissing")<{
  message: string;
}> {}

export class LoadFailed extends TaggedError("LoadFailed")<{
  message: string;
}> {}

export type MergedPouch = {
  items: Item[];
  errors: string[];
};

export type ToolsLoad =
  { status: "ok"; value: ToolItem[] } | { status: "error"; error: LoadFailed };

export type SkillsLoad =
  | { status: "ok"; value: SkillItem[] }
  | { status: "error"; error: SkillsMissing | LoadFailed };

export function mergeInventory(input: {
  tools: ToolsLoad;
  skills: SkillsLoad;
  lastGood?: Item[];
}): MergedPouch {
  const errors: string[] = [];
  let tools: ToolItem[] = [];
  let skills: SkillItem[] = [];

  if (input.tools.status === "ok") {
    tools = input.tools.value;
  } else {
    errors.push(input.tools.error.message);
  }

  if (input.skills.status === "ok") {
    skills = input.skills.value;
  } else if (input.skills.error._tag === "SkillsMissing") {
    skills = [];
  } else {
    errors.push(input.skills.error.message);
  }

  const items = withoutRootExports([...tools, ...skills]);
  if (
    items.length === 0 &&
    errors.length > 0 &&
    input.lastGood &&
    input.lastGood.length > 0
  ) {
    return { items: withoutRootExports(input.lastGood), errors };
  }

  return { items, errors };
}

export function isRootExport(exportName: string): boolean {
  const trimmed = exportName.replace(/^\.\//, "");
  return trimmed === "" || trimmed === "." || trimmed === "__root__";
}

export function withoutRootExports(items: Item[]): Item[] {
  return items.filter(
    (item) =>
      !(
        item.kind === "tool" &&
        item.parentKind === "package" &&
        isRootExport(item.exportName)
      ),
  );
}

export function rowTitle(item: Item): string {
  switch (item.kind) {
    case "skill":
      return `/${item.name}`;
    case "tool":
      return `$${item.name}`;
    default: {
      const _never: never = item;
      return _never;
    }
  }
}

export function formatMention(item: Item): string {
  switch (item.kind) {
    case "skill":
      return `/${item.name} (Kody skill_get id: ${item.id})`;
    case "tool":
      return formatToolMention(item);
    default: {
      const _never: never = item;
      return _never;
    }
  }
}

export function parentLabel(item: Item): string {
  if (item.kind === "skill") {
    return "";
  }
  switch (item.parentKind) {
    case "package":
      return item.kodyId;
    case "kody":
      return "Kody";
    case "mcp":
      return item.server;
    case "other":
      return item.provider;
    default: {
      const _never: never = item;
      return _never;
    }
  }
}

export function filterItems(
  items: Item[],
  query: string,
  scope: Scope = { type: "all" },
): Item[] {
  const scoped = itemsInScope(items, scope);
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();
  const matched =
    trimmed === ""
      ? scoped
      : trimmed.length < 3
        ? scoped.filter(
            (item) =>
              item.name.toLowerCase().includes(needle) ||
              item.description.toLowerCase().includes(needle) ||
              parentLabel(item).toLowerCase().includes(needle) ||
              skillId(item).toLowerCase().includes(needle),
          )
        : new Fuse(
            scoped.map((item) => ({
              item,
              name: item.name,
              description: item.description,
              parent: parentLabel(item),
              id: skillId(item),
            })),
            {
              keys: ["name", "description", "parent", "id"],
              threshold: 0.3,
            },
          )
            .search(trimmed)
            .map((result) => result.item.item);
  return [...matched].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function emptyState(input: {
  items: Item[];
  query: string;
  scope: Scope;
  errors: string[];
  isLoading: boolean;
}): PouchEmpty | null {
  const rows = filterItems(input.items, input.query, input.scope);
  if (rows.length > 0) {
    return null;
  }
  if (input.errors.length > 0 && input.items.length === 0) {
    return { kind: "error", message: input.errors.join(" · ") };
  }
  if (input.query.trim() !== "") {
    return { kind: "no-match", title: noMatchTitle(input.scope) };
  }
  if (input.isLoading && input.items.length === 0) {
    return null;
  }
  return emptyCopy(input.scope);
}

function noMatchTitle(scope: Scope): string {
  switch (scope.type) {
    case "all":
      return "No matching Tools or Skills";
    case "skills":
      return "No matching Skills";
    case "tools":
      return "No matching Tools";
    case "parent":
      return `No matching Tools in ${scope.parent}`;
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

function emptyCopy(scope: Scope): PouchEmpty {
  switch (scope.type) {
    case "all":
      return {
        kind: "empty",
        title: "Pouch is empty",
        description: "No Tools or Skills from Kody yet.",
      };
    case "skills":
      return {
        kind: "empty",
        title: "There are no Skills",
        description: "Skills appear when the skills package exists.",
      };
    case "tools":
      return { kind: "empty", title: "There are no Tools" };
    case "parent":
      return { kind: "empty", title: `There are no Tools in ${scope.parent}` };
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

export function scopeOptions(items: Item[]): ScopeOption[] {
  const parentCounts = new Map<string, number>();
  let skillCount = 0;
  let toolCount = 0;
  for (const item of items) {
    if (item.kind === "skill") {
      skillCount += 1;
      continue;
    }
    toolCount += 1;
    const parent = parentLabel(item);
    if (parent === "") {
      continue;
    }
    parentCounts.set(parent, (parentCounts.get(parent) ?? 0) + 1);
  }
  const parents = [...parentCounts.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  return [
    { scope: { type: "all" }, title: "All", count: items.length },
    { scope: { type: "skills" }, title: "Skills", count: skillCount },
    { scope: { type: "tools" }, title: "Tools", count: toolCount },
    ...parents.map((parent) => ({
      scope: { type: "parent" as const, parent },
      title: parent,
      count: parentCounts.get(parent) ?? 0,
    })),
  ];
}

function skillId(item: Item): string {
  return item.kind === "skill" ? item.id : "";
}

function itemsInScope(items: Item[], scope: Scope): Item[] {
  switch (scope.type) {
    case "all":
      return items;
    case "skills":
      return items.filter((item) => item.kind === "skill");
    case "tools":
      return items.filter((item) => item.kind === "tool");
    case "parent":
      return items.filter(
        (item) => item.kind === "tool" && parentLabel(item) === scope.parent,
      );
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

export function itemKey(item: Item): string {
  if (item.kind === "skill") {
    return `skill:${item.id}`;
  }
  switch (item.parentKind) {
    case "package":
      return `package:${item.kodyId}:${item.exportName}`;
    case "kody":
      return `kody:${item.capability}`;
    case "mcp":
      return `mcp:${item.server}:${item.tool}`;
    case "other":
      return `other:${item.provider}:${item.ref}`;
    default: {
      const _never: never = item;
      return _never;
    }
  }
}

const OTHER_SKILLS = "Other Skills";

export function presentPouch(
  items: Item[],
  query: string,
  scope: Scope = { type: "all" },
): PouchSection[] {
  const matched = filterItems(items, query, scope);
  if (matched.length === 0) {
    return [];
  }
  const origins = skillOrigins(items);
  switch (scope.type) {
    case "parent":
      return [flatSection(matched, origins)];
    case "all":
    case "skills":
    case "tools": {
      const titles = sectionTitles(matched, origins, scope);
      if (titles.length < 2) {
        return [flatSection(matched, origins)];
      }
      const buckets = new Map<string, Item[]>();
      for (const item of matched) {
        const title = groupTitle(item, origins);
        if (title === "") {
          continue;
        }
        const rows = buckets.get(title) ?? [];
        rows.push(item);
        buckets.set(title, rows);
      }
      return titles.map((title) => ({
        title,
        rows: (buckets.get(title) ?? []).map((item) => ({
          item,
          subtitle: descriptionLine(item),
        })),
      }));
    }
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

function rowSubtitle(item: Item): string {
  const parent = parentLabel(item);
  const line = descriptionLine(item);
  if (parent === "") {
    return line;
  }
  if (line === "") {
    return parent;
  }
  return `${parent} · ${line}`;
}

function skillOrigins(items: Item[]): Map<string, string> {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== "skill") {
      continue;
    }
    const prefix = idPrefix(item.id);
    if (prefix === "") {
      continue;
    }
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  }
  const origins = new Map<string, string>();
  for (const item of items) {
    if (item.kind !== "skill") {
      continue;
    }
    const prefix = idPrefix(item.id);
    if (prefix !== "" && (counts.get(prefix) ?? 0) >= 2) {
      origins.set(item.id, prefix);
    }
  }
  return origins;
}

function idPrefix(id: string): string {
  const dash = id.indexOf("-");
  return dash === -1 ? "" : id.slice(0, dash);
}

function groupTitle(item: Item, origins: Map<string, string>): string {
  if (item.kind === "skill") {
    return origins.get(item.id) ?? OTHER_SKILLS;
  }
  return parentLabel(item);
}

function sectionTitles(
  matched: Item[],
  origins: Map<string, string>,
  scope: Scope,
): string[] {
  const originTitles = new Set<string>();
  let otherSkills = false;
  const parentTitles = new Set<string>();
  for (const item of matched) {
    if (item.kind === "skill") {
      const origin = origins.get(item.id);
      if (origin) {
        originTitles.add(origin);
      } else {
        otherSkills = true;
      }
      continue;
    }
    const parent = parentLabel(item);
    if (parent !== "") {
      parentTitles.add(parent);
    }
  }
  const originsSorted = [...originTitles].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  const parentsSorted = [...parentTitles].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
  switch (scope.type) {
    case "all":
      return [
        ...originsSorted,
        ...(otherSkills ? [OTHER_SKILLS] : []),
        ...parentsSorted,
      ];
    case "skills":
      return [...originsSorted, ...(otherSkills ? [OTHER_SKILLS] : [])];
    case "tools":
      return parentsSorted;
    case "parent":
      return [];
    default: {
      const _never: never = scope;
      return _never;
    }
  }
}

function flatSection(
  items: Item[],
  origins: Map<string, string>,
): PouchSection {
  return {
    title: null,
    rows: items.map((item) => ({
      item,
      subtitle: flatSubtitle(item, origins),
    })),
  };
}

function flatSubtitle(item: Item, origins: Map<string, string>): string {
  if (item.kind === "skill") {
    const origin = origins.get(item.id) ?? "";
    const line = descriptionLine(item);
    if (origin === "") {
      return line;
    }
    if (line === "") {
      return origin;
    }
    return `${origin} · ${line}`;
  }
  return rowSubtitle(item);
}

function descriptionLine(item: Item): string {
  return item.description.split("\n")[0] ?? "";
}

function formatToolMention(item: ToolItem): string {
  switch (item.parentKind) {
    case "package":
      return `$${item.name} (Kody invoke kodyId: ${item.kodyId} export: ${item.exportName})`;
    case "kody":
      return `$${item.name} (Kody ${item.capability})`;
    case "mcp":
      return `$${item.name} (Kody mcp ${item.server} ${item.tool})`;
    case "other":
      return `$${item.name} (Kody ${item.provider} ${item.ref})`;
    default: {
      const _never: never = item;
      return _never;
    }
  }
}
