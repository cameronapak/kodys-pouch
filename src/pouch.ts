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

  const items = [...tools, ...skills];
  if (
    items.length === 0 &&
    errors.length > 0 &&
    input.lastGood &&
    input.lastGood.length > 0
  ) {
    return { items: input.lastGood, errors };
  }

  return { items, errors };
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

export function filterItems(items: Item[], query: string): Item[] {
  const trimmed = query.trim();
  const needle = trimmed.toLowerCase();
  const matched =
    trimmed === ""
      ? items
      : trimmed.length < 3
        ? items.filter(
            (item) =>
              item.name.toLowerCase().includes(needle) ||
              item.description.toLowerCase().includes(needle) ||
              parentLabel(item).toLowerCase().includes(needle),
          )
        : new Fuse(
            items.map((item) => ({
              item,
              name: item.name,
              description: item.description,
              parent: parentLabel(item),
            })),
            {
              keys: ["name", "description", "parent"],
              threshold: 0.3,
            },
          )
            .search(trimmed)
            .map((result) => result.item.item);
  return [...matched].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
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

export function rowSubtitle(item: Item): string {
  const parent = parentLabel(item);
  const line = item.description.split("\n")[0] ?? "";
  if (parent === "") {
    return line;
  }
  if (line === "") {
    return parent;
  }
  return `${parent} · ${line}`;
}

function formatToolMention(item: ToolItem): string {
  switch (item.parentKind) {
    case "package":
      return `/${item.name} (Kody invoke kodyId: ${item.kodyId} export: ${item.exportName})`;
    case "kody":
      return `/${item.name} (Kody ${item.capability})`;
    case "mcp":
      return `/${item.name} (Kody mcp ${item.server} ${item.tool})`;
    case "other":
      return `/${item.name} (Kody ${item.provider} ${item.ref})`;
    default: {
      const _never: never = item;
      return _never;
    }
  }
}
