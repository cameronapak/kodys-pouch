import assert from "node:assert/strict";
import { test } from "node:test";
import { Result } from "better-result";
import {
  LoadFailed,
  SkillsMissing,
  filterItems,
  formatMention,
  mergeInventory,
  type Item,
} from "./pouch.ts";

const grill: Item = {
  kind: "skill",
  name: "grill-with-docs",
  id: "mattpocock-grill-with-docs",
  description: "Grill a plan",
};

const skillGet: Item = {
  kind: "tool",
  parentKind: "package",
  name: "skill-get",
  description: "Read a skill",
  kodyId: "skills",
  exportName: "skill-get",
};

const listSkills: Item = {
  kind: "tool",
  parentKind: "mcp",
  name: "ListSkills",
  description: "List Macro skills",
  server: "macro",
  tool: "ListSkills",
};

const inventory: Item[] = [listSkills, grill, skillGet];

test("Skill Mention keeps name and id distinct", () => {
  assert.equal(
    formatMention({
      kind: "skill",
      name: "grill-with-docs",
      id: "mattpocock-grill-with-docs",
      description: "Grill a plan",
    }),
    "/grill-with-docs (Kody skill_get id: mattpocock-grill-with-docs)",
  );
});

test("Package Tool Mention names invoke kodyId and export", () => {
  assert.equal(
    formatMention({
      kind: "tool",
      parentKind: "package",
      name: "skill-get",
      description: "Read a skill",
      kodyId: "skills",
      exportName: "skill-get",
    }),
    "/skill-get (Kody invoke kodyId: skills export: skill-get)",
  );
});

test("Built-in Tool Mention names the capability", () => {
  assert.equal(
    formatMention({
      kind: "tool",
      parentKind: "kody",
      name: "package_list",
      description: "List saved packages",
      capability: "package_list",
    }),
    "/package_list (Kody package_list)",
  );
});

test("MCP Tool Mention names server and tool", () => {
  assert.equal(
    formatMention({
      kind: "tool",
      parentKind: "mcp",
      name: "ListSkills",
      description: "List Macro skills",
      server: "macro",
      tool: "ListSkills",
    }),
    "/ListSkills (Kody mcp macro ListSkills)",
  );
});

test("Other Tool Mention follows the same one-line pattern", () => {
  assert.equal(
    formatMention({
      kind: "tool",
      parentKind: "other",
      name: "createdesignexportjob",
      description: "Export a Canva design",
      provider: "openapi",
      ref: "canva createdesignexportjob",
    }),
    "/createdesignexportjob (Kody openapi canva createdesignexportjob)",
  );
});

test("Mention is one line and contains no token", () => {
  const mention = formatMention({
    kind: "skill",
    name: "grill-with-docs",
    id: "mattpocock-grill-with-docs",
    description: "Grill a plan",
  });
  assert.equal(mention.includes("\n"), false);
  assert.equal(/token|bearer|secret/i.test(mention), false);
});

test("empty query lists all items A-Z by name", () => {
  assert.deepEqual(
    filterItems(inventory, "").map((item) => item.name),
    ["grill-with-docs", "ListSkills", "skill-get"],
  );
});

test("grill matches a Skill by name", () => {
  assert.deepEqual(filterItems(inventory, "grill"), [grill]);
});

test("macro matches an MCP Tool by Parent", () => {
  assert.deepEqual(filterItems(inventory, "macro"), [listSkills]);
});

test("Read a skill matches a Tool by description", () => {
  assert.deepEqual(filterItems(inventory, "Read a skill"), [skillGet]);
});

test("no match yields no items", () => {
  assert.deepEqual(filterItems(inventory, "xyzzy-no-such-item"), []);
});

test("Skill and Tool both appear when names overlap", () => {
  const namedSkill: Item = {
    kind: "skill",
    name: "skill-get",
    id: "skill-get-doc",
    description: "How to load a skill",
  };
  const rows = filterItems([namedSkill, skillGet], "");
  assert.equal(rows.length, 2);
  assert.equal(
    rows.some((item) => item.kind === "skill" && item.id === "skill-get-doc"),
    true,
  );
  assert.equal(
    rows.some((item) => item.kind === "tool" && item.parentKind === "package"),
    true,
  );
});

test("missing skills package omits Skills with no error", () => {
  const merged = mergeInventory({
    tools: Result.ok([skillGet]),
    skills: Result.err(new SkillsMissing({ message: "no skills package" })),
  });
  assert.deepEqual(merged.items, [skillGet]);
  assert.deepEqual(merged.errors, []);
});

test("Skills fetch fail keeps Tools and flags an error", () => {
  const merged = mergeInventory({
    tools: Result.ok([skillGet]),
    skills: Result.err(new LoadFailed({ message: "skills down" })),
  });
  assert.deepEqual(merged.items, [skillGet]);
  assert.deepEqual(merged.errors, ["skills down"]);
});

test("Tools fetch fail keeps Skills and flags an error", () => {
  const merged = mergeInventory({
    tools: Result.err(new LoadFailed({ message: "tools down" })),
    skills: Result.ok([grill]),
  });
  assert.deepEqual(merged.items, [grill]);
  assert.deepEqual(merged.errors, ["tools down"]);
});

test("Tools fail and Skills missing with last-good keeps last-good", () => {
  const merged = mergeInventory({
    tools: Result.err(new LoadFailed({ message: "tools down" })),
    skills: Result.err(new SkillsMissing({ message: "no skills package" })),
    lastGood: [grill, skillGet],
  });
  assert.deepEqual(merged.items, [grill, skillGet]);
  assert.deepEqual(merged.errors, ["tools down"]);
});

test("both fetches fail with last-good keeps last-good and flags errors", () => {
  const merged = mergeInventory({
    tools: Result.err(new LoadFailed({ message: "tools down" })),
    skills: Result.err(new LoadFailed({ message: "skills down" })),
    lastGood: [grill, skillGet],
  });
  assert.deepEqual(merged.items, [grill, skillGet]);
  assert.deepEqual(merged.errors, ["tools down", "skills down"]);
});
