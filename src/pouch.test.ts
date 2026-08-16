import assert from "node:assert/strict";
import { test } from "node:test";
import { Result } from "better-result";
import {
  LoadFailed,
  SkillsMissing,
  emptyState,
  filterItems,
  formatMention,
  isRootExport,
  mergeInventory,
  presentPouch,
  rowTitle,
  scopeOptions,
  type Item,
  type Scope,
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

const packageList: Item = {
  kind: "tool",
  parentKind: "kody",
  name: "package_list",
  description: "List saved packages",
  capability: "package_list",
};

const canvaExport: Item = {
  kind: "tool",
  parentKind: "other",
  name: "createdesignexportjob",
  description: "Export a Canva design",
  provider: "openapi",
  ref: "canva createdesignexportjob",
};

const tdd: Item = {
  kind: "skill",
  name: "tdd",
  id: "mattpocock-tdd",
  description: "Test first",
};

const showMe: Item = {
  kind: "skill",
  name: "show-me",
  id: "show-me",
  description: "Draw it",
};

const recap: Item = {
  kind: "skill",
  name: "visual-recap",
  id: "kentcdodds-visual-recap",
  description: "PR recap",
};

const inventory: Item[] = [listSkills, grill, skillGet];

const groupedInventory: Item[] = [
  listSkills,
  grill,
  tdd,
  showMe,
  recap,
  skillGet,
  packageList,
];

function presented(items: Item[], query = "", scope: Scope = { type: "all" }) {
  return presentPouch(items, query, scope).map((section) => ({
    title: section.title,
    names: section.rows.map((row) => row.item.name),
    subtitles: section.rows.map((row) => row.subtitle),
  }));
}

test("row titles prefix Skills with / and Tools with $", () => {
  assert.equal(rowTitle(grill), "/grill-with-docs");
  assert.equal(rowTitle(skillGet), "$skill-get");
});

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

test("root package export names are recognized", () => {
  assert.equal(isRootExport("."), true);
  assert.equal(isRootExport("__root__"), true);
  assert.equal(isRootExport("./"), true);
  assert.equal(isRootExport("./."), true);
  assert.equal(isRootExport(""), true);
  assert.equal(isRootExport("skill-get"), false);
  assert.equal(isRootExport("./skill-get"), false);
});

test("root package export is omitted from inventory", () => {
  const root: Item = {
    kind: "tool",
    parentKind: "package",
    name: ".",
    description: "Describe the skills package",
    kodyId: "skills",
    exportName: ".",
  };
  const merged = mergeInventory({
    tools: Result.ok([root, skillGet]),
    skills: Result.ok([]),
  });
  assert.deepEqual(merged.items, [skillGet]);
});

test("last-good inventory drops a cached root package export", () => {
  const root: Item = {
    kind: "tool",
    parentKind: "package",
    name: ".",
    description: "Describe the skills package",
    kodyId: "skills",
    exportName: "__root__",
  };
  const merged = mergeInventory({
    tools: Result.err(new LoadFailed({ message: "tools down" })),
    skills: Result.err(new SkillsMissing({ message: "no skills package" })),
    lastGood: [root, skillGet],
  });
  assert.deepEqual(merged.items, [skillGet]);
  assert.deepEqual(merged.errors, ["tools down"]);
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

test("Skills Scope lists Skill documents only", () => {
  assert.deepEqual(filterItems(inventory, "", { type: "skills" }), [grill]);
});

test("Tools Scope lists every Tool and no Skills", () => {
  assert.deepEqual(
    filterItems(inventory, "", { type: "tools" }).map((item) => item.name),
    ["ListSkills", "skill-get"],
  );
});

test("Parent skills lists that Package's Tools only", () => {
  assert.deepEqual(
    filterItems(inventory, "", { type: "parent", parent: "skills" }),
    [skillGet],
  );
});

test("Parent macro lists that MCP server's Tools only", () => {
  assert.deepEqual(
    filterItems(inventory, "", { type: "parent", parent: "macro" }),
    [listSkills],
  );
});

test("Search grill in Tools Scope matches nothing", () => {
  assert.deepEqual(filterItems(inventory, "grill", { type: "tools" }), []);
});

test("Search macro in Skills Scope matches nothing", () => {
  assert.deepEqual(filterItems(inventory, "macro", { type: "skills" }), []);
});

test("empty query in a Parent lists that Parent A-Z by name", () => {
  const skillList: Item = {
    kind: "tool",
    parentKind: "package",
    name: "skill-list",
    description: "List skills",
    kodyId: "skills",
    exportName: "skill-list",
  };
  assert.deepEqual(
    filterItems([skillGet, skillList], "", {
      type: "parent",
      parent: "skills",
    }).map((item) => item.name),
    ["skill-get", "skill-list"],
  );
});

test("same name Skill and Tool stay split by Kind", () => {
  const namedSkill: Item = {
    kind: "skill",
    name: "skill-get",
    id: "skill-get-doc",
    description: "How to load a skill",
  };
  const items = [namedSkill, skillGet];
  assert.deepEqual(filterItems(items, "", { type: "all" }), [
    namedSkill,
    skillGet,
  ]);
  assert.deepEqual(filterItems(items, "", { type: "skills" }), [namedSkill]);
  assert.deepEqual(filterItems(items, "", { type: "tools" }), [skillGet]);
  assert.deepEqual(
    filterItems(items, "", { type: "parent", parent: "skills" }),
    [skillGet],
  );
});

test("Parent Kody lists built-in Tools only", () => {
  assert.deepEqual(
    filterItems([packageList, skillGet, grill], "", {
      type: "parent",
      parent: "Kody",
    }),
    [packageList],
  );
});

test("Scope options list All, Skills, Tools, then Parents with Tools", () => {
  assert.deepEqual(scopeOptions(inventory), [
    { scope: { type: "all" }, title: "All", count: 3 },
    { scope: { type: "skills" }, title: "Skills", count: 1 },
    { scope: { type: "tools" }, title: "Tools", count: 2 },
    { scope: { type: "parent", parent: "macro" }, title: "macro", count: 1 },
    { scope: { type: "parent", parent: "skills" }, title: "skills", count: 1 },
  ]);
});

test("missing skills package yields Skills (0) and no error", () => {
  const merged = mergeInventory({
    tools: Result.ok([skillGet]),
    skills: Result.err(new SkillsMissing({ message: "no skills package" })),
  });
  assert.deepEqual(merged.errors, []);
  assert.deepEqual(scopeOptions(merged.items), [
    { scope: { type: "all" }, title: "All", count: 1 },
    { scope: { type: "skills" }, title: "Skills", count: 0 },
    { scope: { type: "tools" }, title: "Tools", count: 1 },
    { scope: { type: "parent", parent: "skills" }, title: "skills", count: 1 },
  ]);
});

test("empty Pouch still offers All, Skills, and Tools", () => {
  assert.deepEqual(scopeOptions([]), [
    { scope: { type: "all" }, title: "All", count: 0 },
    { scope: { type: "skills" }, title: "Skills", count: 0 },
    { scope: { type: "tools" }, title: "Tools", count: 0 },
  ]);
});

test("a Parent with no Tools is not a Scope option", () => {
  const titles = scopeOptions([grill]).map((option) => option.title);
  assert.deepEqual(titles, ["All", "Skills", "Tools"]);
});

test("a Parent with an empty label is not a Scope option", () => {
  const unnamed: Item = {
    kind: "tool",
    parentKind: "package",
    name: "anon",
    description: "",
    kodyId: "",
    exportName: "anon",
  };
  const titles = scopeOptions([unnamed]).map((option) => option.title);
  assert.deepEqual(titles, ["All", "Skills", "Tools"]);
});

test("Parent count is Tools with that Parent", () => {
  const macroReply: Item = {
    kind: "tool",
    parentKind: "mcp",
    name: "Reply",
    description: "Reply in Macro",
    server: "macro",
    tool: "Reply",
  };
  const option = scopeOptions([listSkills, macroReply]).find(
    (entry) => entry.title === "macro",
  );
  assert.deepEqual(option, {
    scope: { type: "parent", parent: "macro" },
    title: "macro",
    count: 2,
  });
});

test("Parent openapi lists that provider's Tools only", () => {
  assert.deepEqual(
    filterItems([canvaExport, skillGet, grill], "", {
      type: "parent",
      parent: "openapi",
    }),
    [canvaExport],
  );
});

test("grill matches a Skill by name", () => {
  assert.deepEqual(filterItems(inventory, "grill"), [grill]);
});

test("matt matches a Skill by id when name and description do not", () => {
  assert.deepEqual(filterItems(inventory, "matt"), [grill]);
});

test("Tools Scope ignores Skill id", () => {
  assert.deepEqual(filterItems(inventory, "matt", { type: "tools" }), []);
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

test("Skills with no rows and no Search says there are no Skills", () => {
  assert.deepEqual(
    emptyState({
      items: [skillGet],
      query: "",
      scope: { type: "skills" },
      errors: [],
      isLoading: false,
    }),
    {
      kind: "empty",
      title: "There are no Skills",
      description: "Skills appear when the skills package exists.",
    },
  );
});

test("Tools with no rows and no Search says there are no Tools", () => {
  assert.deepEqual(
    emptyState({
      items: [grill],
      query: "",
      scope: { type: "tools" },
      errors: [],
      isLoading: false,
    }),
    { kind: "empty", title: "There are no Tools" },
  );
});

test("All plus a Search miss says no matching Tools or Skills", () => {
  assert.deepEqual(
    emptyState({
      items: inventory,
      query: "xyzzy-no-such-item",
      scope: { type: "all" },
      errors: [],
      isLoading: false,
    }),
    { kind: "no-match", title: "No matching Tools or Skills" },
  );
});

test("Skills plus a Search miss says no matching Skills", () => {
  assert.deepEqual(
    emptyState({
      items: inventory,
      query: "xyzzy-no-such-item",
      scope: { type: "skills" },
      errors: [],
      isLoading: false,
    }),
    { kind: "no-match", title: "No matching Skills" },
  );
});

test("Tools plus a Search miss says no matching Tools", () => {
  assert.deepEqual(
    emptyState({
      items: inventory,
      query: "grill",
      scope: { type: "tools" },
      errors: [],
      isLoading: false,
    }),
    { kind: "no-match", title: "No matching Tools" },
  );
});

test("Parent plus a Search miss names that Parent", () => {
  assert.deepEqual(
    emptyState({
      items: inventory,
      query: "grill",
      scope: { type: "parent", parent: "macro" },
      errors: [],
      isLoading: false,
    }),
    { kind: "no-match", title: "No matching Tools in macro" },
  );
});

test("All with no items and no error says the Pouch is empty", () => {
  assert.deepEqual(
    emptyState({
      items: [],
      query: "",
      scope: { type: "all" },
      errors: [],
      isLoading: false,
    }),
    {
      kind: "empty",
      title: "Pouch is empty",
      description: "No Tools or Skills from Kody yet.",
    },
  );
});

test("loading with no items does not claim a Kind is empty", () => {
  assert.equal(
    emptyState({
      items: [],
      query: "",
      scope: { type: "skills" },
      errors: [],
      isLoading: true,
    }),
    null,
  );
});

test("refresh with Tools still says there are no Skills", () => {
  assert.deepEqual(
    emptyState({
      items: [skillGet],
      query: "",
      scope: { type: "skills" },
      errors: [],
      isLoading: true,
    }),
    {
      kind: "empty",
      title: "There are no Skills",
      description: "Skills appear when the skills package exists.",
    },
  );
});

test("failed fetch with no items keeps the error empty state", () => {
  assert.deepEqual(
    emptyState({
      items: [],
      query: "",
      scope: { type: "all" },
      errors: ["tools down"],
      isLoading: false,
    }),
    { kind: "error", message: "tools down" },
  );
});

test("last-good inventory still offers Scope options", () => {
  const merged = mergeInventory({
    tools: Result.err(new LoadFailed({ message: "tools down" })),
    skills: Result.err(new LoadFailed({ message: "skills down" })),
    lastGood: [grill, skillGet],
  });
  assert.deepEqual(merged.items, [grill, skillGet]);
  assert.deepEqual(merged.errors, ["tools down", "skills down"]);
  assert.deepEqual(scopeOptions(merged.items), [
    { scope: { type: "all" }, title: "All", count: 2 },
    { scope: { type: "skills" }, title: "Skills", count: 1 },
    { scope: { type: "tools" }, title: "Tools", count: 1 },
    { scope: { type: "parent", parent: "skills" }, title: "skills", count: 1 },
  ]);
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

test("All groups Origins then Other Skills then Parents", () => {
  assert.deepEqual(presented(groupedInventory), [
    {
      title: "mattpocock",
      names: ["grill-with-docs", "tdd"],
      subtitles: ["Grill a plan", "Test first"],
    },
    {
      title: "Other Skills",
      names: ["show-me", "visual-recap"],
      subtitles: ["Draw it", "PR recap"],
    },
    {
      title: "Kody",
      names: ["package_list"],
      subtitles: ["List saved packages"],
    },
    {
      title: "macro",
      names: ["ListSkills"],
      subtitles: ["List Macro skills"],
    },
    {
      title: "skills",
      names: ["skill-get"],
      subtitles: ["Read a skill"],
    },
  ]);
});

test("Tools Scope groups by Parent only", () => {
  assert.deepEqual(presented(groupedInventory, "", { type: "tools" }), [
    {
      title: "Kody",
      names: ["package_list"],
      subtitles: ["List saved packages"],
    },
    {
      title: "macro",
      names: ["ListSkills"],
      subtitles: ["List Macro skills"],
    },
    {
      title: "skills",
      names: ["skill-get"],
      subtitles: ["Read a skill"],
    },
  ]);
});

test("Skills Scope groups by Origin then Other Skills", () => {
  assert.deepEqual(presented(groupedInventory, "", { type: "skills" }), [
    {
      title: "mattpocock",
      names: ["grill-with-docs", "tdd"],
      subtitles: ["Grill a plan", "Test first"],
    },
    {
      title: "Other Skills",
      names: ["show-me", "visual-recap"],
      subtitles: ["Draw it", "PR recap"],
    },
  ]);
});

test("one-Parent Scope is a flat list with Parent in the subtitle", () => {
  assert.deepEqual(
    presented(groupedInventory, "", { type: "parent", parent: "skills" }),
    [
      {
        title: null,
        names: ["skill-get"],
        subtitles: ["skills · Read a skill"],
      },
    ],
  );
});

test("one group on screen is a flat list", () => {
  assert.deepEqual(presented([grill, tdd], "", { type: "skills" }), [
    {
      title: null,
      names: ["grill-with-docs", "tdd"],
      subtitles: ["mattpocock · Grill a plan", "mattpocock · Test first"],
    },
  ]);
});

test("Search keeps sections among matches", () => {
  assert.deepEqual(presented(groupedInventory, "list"), [
    {
      title: "Kody",
      names: ["package_list"],
      subtitles: ["List saved packages"],
    },
    {
      title: "macro",
      names: ["ListSkills"],
      subtitles: ["List Macro skills"],
    },
  ]);
});

test("Origin comes from the full inventory not the matches", () => {
  assert.deepEqual(presented(groupedInventory, "grill"), [
    {
      title: null,
      names: ["grill-with-docs"],
      subtitles: ["mattpocock · Grill a plan"],
    },
  ]);
});

test("a singleton prefixed Skill sits in Other Skills", () => {
  const sections = presented(groupedInventory, "", { type: "skills" });
  const other = sections.find((section) => section.title === "Other Skills");
  assert.deepEqual(other?.names, ["show-me", "visual-recap"]);
});

test("a Parent section lists that Parent's Tools A-Z", () => {
  const skillList: Item = {
    kind: "tool",
    parentKind: "package",
    name: "skill-list",
    description: "List skills",
    kodyId: "skills",
    exportName: "skill-list",
  };
  assert.deepEqual(presented([skillGet, skillList, grill, tdd]), [
    {
      title: "mattpocock",
      names: ["grill-with-docs", "tdd"],
      subtitles: ["Grill a plan", "Test first"],
    },
    {
      title: "skills",
      names: ["skill-get", "skill-list"],
      subtitles: ["Read a skill", "List skills"],
    },
  ]);
});

test("empty Other Skills is omitted", () => {
  assert.deepEqual(presented([grill, tdd, skillGet, listSkills]), [
    {
      title: "mattpocock",
      names: ["grill-with-docs", "tdd"],
      subtitles: ["Grill a plan", "Test first"],
    },
    {
      title: "macro",
      names: ["ListSkills"],
      subtitles: ["List Macro skills"],
    },
    {
      title: "skills",
      names: ["skill-get"],
      subtitles: ["Read a skill"],
    },
  ]);
});

test("Scope options still omit Origin", () => {
  const titles = scopeOptions(groupedInventory).map((option) => option.title);
  assert.deepEqual(titles, [
    "All",
    "Skills",
    "Tools",
    "Kody",
    "macro",
    "skills",
  ]);
});
