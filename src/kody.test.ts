import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeInventory, itemKey, pruneKeys, type Item } from "./pouch.ts";

test("loadSkills requests discoveryKodyId/list-skills not skills/skill-list", async () => {
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    urls.push(url);
    return new Response(JSON.stringify({ result: [] }), { status: 200 });
  };

  const { loadSkills, clearCatalogCaches } = await import("./kody.ts");
  clearCatalogCaches();
  await loadSkills();

  assert.ok(
    urls.some((url) => url.includes("/raycast-kodys-pouch/list-skills")),
    `expected raycast-kodys-pouch/list-skills, got: ${urls.join(", ")}`,
  );
  assert.ok(
    !urls.some((url) => url.includes("/skills/skill-list")),
    `must not call skills/skill-list, got: ${urls.join(", ")}`,
  );
});

test("fetchSkillDocument requests discoveryKodyId/get-skill by id", async () => {
  const urls: string[] = [];
  const bodies: unknown[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    urls.push(url);
    bodies.push(JSON.parse(String(init?.body ?? "{}")));
    return new Response(
      JSON.stringify({
        result: `---
name: grill-with-docs
---

Body`,
      }),
      { status: 200 },
    );
  };

  const { fetchSkillDocument } = await import("./kody.ts");
  const result = await fetchSkillDocument("mattpocock-grill-with-docs");

  assert.equal(result.status, "ok");
  if (result.status === "ok") {
    assert.equal(
      result.value,
      `---
name: grill-with-docs
---

Body`,
    );
  }
  assert.ok(
    urls.some((url) => url.includes("/raycast-kodys-pouch/get-skill")),
    `expected raycast-kodys-pouch/get-skill, got: ${urls.join(", ")}`,
  );
  assert.ok(
    !urls.some((url) => url.includes("/skills/skill-get")),
    `must not call skills/skill-get, got: ${urls.join(", ")}`,
  );
  assert.ok(
    bodies.some(
      (body) =>
        typeof body === "object" &&
        body !== null &&
        "params" in body &&
        (body as { params: { id?: string } }).params.id ===
          "mattpocock-grill-with-docs",
    ),
    `expected params.id, got: ${JSON.stringify(bodies)}`,
  );
});

test("fetchSkillDocument extracts SKILL.md from the files array", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        result: {
          id: "x",
          name: "x",
          files: [
            { path: "ATTRIBUTION.md", content: "by someone" },
            { path: "SKILL.md", content: "---\nname: x\n---\n\nBody" },
          ],
        },
      }),
      { status: 200 },
    );
  const { fetchSkillDocument } = await import("./kody.ts");
  const ok = await fetchSkillDocument("x");
  assert.equal(ok.status, "ok");
  if (ok.status === "ok") {
    assert.equal(ok.value, "---\nname: x\n---\n\nBody");
  }
});

test("fetchSkillDocument falls back to the only file when SKILL.md is absent", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        result: {
          id: "x",
          name: "x",
          files: [{ path: "notes.md", content: "Notes" }],
        },
      }),
      { status: 200 },
    );
  const { fetchSkillDocument } = await import("./kody.ts");
  const ok = await fetchSkillDocument("x");
  assert.equal(ok.status, "ok");
  if (ok.status === "ok") {
    assert.equal(ok.value, "Notes");
  }
});

test("fetchSkillDocument normalizes content field and fails on empty", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ result: { content: "---\nname: x\n---\n\nHi" } }),
      { status: 200 },
    );
  const { fetchSkillDocument } = await import("./kody.ts");
  const ok = await fetchSkillDocument("x");
  assert.equal(ok.status, "ok");
  if (ok.status === "ok") {
    assert.equal(ok.value, "---\nname: x\n---\n\nHi");
  }

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ result: { content: "   " } }), {
      status: 200,
    });
  const empty = await fetchSkillDocument("x");
  assert.equal(empty.status, "error");

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "nope" }), { status: 500 });
  const failed = await fetchSkillDocument("x");
  assert.equal(failed.status, "error");
});

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

type RecordedPost = {
  exportName: string;
  params: Record<string, unknown>;
  idempotencyKey: string;
};

function exportNameFromUrl(url: string): string {
  const path = url.split("/package-invocations/")[1] ?? "";
  return path.split("/").slice(1).join("/");
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function stubCatalogFetch() {
  const posts: RecordedPost[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      params?: Record<string, unknown>;
      idempotencyKey?: string;
    };
    const exportName = exportNameFromUrl(url);
    posts.push({
      exportName,
      params: body.params ?? {},
      idempotencyKey: String(body.idempotencyKey ?? ""),
    });
    if (exportName === "list-skills") {
      return jsonResponse({
        result: [
          {
            name: "grill-with-docs",
            id: "mattpocock-grill-with-docs",
            description: "Grill a plan",
          },
        ],
      });
    }
    if (exportName === "list-capabilities") {
      return jsonResponse({
        result: {
          capabilities: [
            {
              name: "package_list",
              description: "List saved packages",
              source: "builtin",
            },
          ],
        },
      });
    }
    if (exportName === "list-packages") {
      return jsonResponse({
        result: { packages: [{ packageId: "pkg-1", kodyId: "skills" }] },
      });
    }
    if (exportName === "get-package") {
      return jsonResponse({
        result: {
          kodyId: "skills",
          exports: [{ exportName: "skill-get", description: "Read a skill" }],
        },
      });
    }
    if (exportName === "get-skill") {
      return jsonResponse({
        result: `---
name: grill-with-docs
---

Body`,
      });
    }
    return jsonResponse({ error: `unexpected ${exportName}` }, 500);
  };
  return posts;
}

function catalogExports(posts: RecordedPost[]): string[] {
  return posts.map((post) => post.exportName);
}

function hasCatalogLists(posts: RecordedPost[]) {
  const names = new Set(catalogExports(posts));
  return (
    names.has("list-skills") &&
    names.has("list-capabilities") &&
    names.has("list-packages")
  );
}

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

test("warm catalog does not POST skills, capabilities, or package-tools", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  await Promise.all([loadTools(), loadSkills()]);
  assert.equal(hasCatalogLists(posts), true);
  assert.equal(
    posts.some(
      (post) =>
        "query" in post.params || "search" in post.params || "q" in post.params,
    ),
    false,
    `search text is not a fetch argument, got: ${JSON.stringify(posts)}`,
  );
  posts.length = 0;
  await Promise.all([loadTools(), loadSkills()]);
  assert.deepEqual(catalogExports(posts), []);
});

test("expiry or miss POSTs skills, capabilities, and package-tools again", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  const origin = 1_700_000_000_000;
  const realNow = Date.now;
  Date.now = () => origin;
  try {
    await Promise.all([loadTools(), loadSkills()]);
    assert.equal(hasCatalogLists(posts), true);

    posts.length = 0;
    Date.now = () => origin + SEVEN_DAYS_MS - 1;
    await Promise.all([loadTools(), loadSkills()]);
    assert.deepEqual(catalogExports(posts), []);

    posts.length = 0;
    Date.now = () => origin + SEVEN_DAYS_MS + 1;
    await Promise.all([loadTools(), loadSkills()]);
    assert.equal(hasCatalogLists(posts), true);

    posts.length = 0;
    clearCatalogCaches();
    Date.now = () => origin + SEVEN_DAYS_MS + 1;
    await Promise.all([loadTools(), loadSkills()]);
    assert.equal(hasCatalogLists(posts), true);
  } finally {
    Date.now = realNow;
  }
});

test("Refresh POSTs the three lists again and leaves last-good, pins, and recents", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const lastGood = mergeInventory({ tools, skills }).items;
  const pinned = [itemKey(grill)];
  const recent = [itemKey(skillGet)];
  const firstKeys = posts
    .filter((post) => post.exportName === "list-skills")
    .map((post) => post.idempotencyKey);

  posts.length = 0;
  clearCatalogCaches();
  const [refreshedTools, refreshedSkills] = await Promise.all([
    loadTools(),
    loadSkills(),
  ]);
  assert.equal(hasCatalogLists(posts), true);
  const refreshKeys = posts
    .filter((post) => post.exportName === "list-skills")
    .map((post) => post.idempotencyKey);
  assert.notEqual(refreshKeys[0], firstKeys[0]);

  const refreshed = mergeInventory({
    tools: refreshedTools,
    skills: refreshedSkills,
    lastGood,
  });
  assert.deepEqual(pruneKeys(pinned, refreshed.items), pinned);
  assert.deepEqual(pruneKeys(recent, refreshed.items), recent);
});

test("failed fetch after Refresh keeps last-good catalog", async () => {
  const { loadSkills, loadTools, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  stubCatalogFetch();
  const [tools, skills] = await Promise.all([loadTools(), loadSkills()]);
  const lastGood = mergeInventory({ tools, skills }).items;
  assert.ok(lastGood.length > 0);

  clearCatalogCaches();
  globalThis.fetch = async () => jsonResponse({ error: "down" }, 500);
  const [failedTools, failedSkills] = await Promise.all([
    loadTools(),
    loadSkills(),
  ]);
  const merged = mergeInventory({
    tools: failedTools,
    skills: failedSkills,
    lastGood,
  });
  assert.deepEqual(merged.items, lastGood);
  assert.ok(merged.errors.length > 0);
});

test("catalog load does not POST skill contents; copy still does", async () => {
  const { loadSkills, loadTools, fetchSkillDocument, clearCatalogCaches } =
    await import("./kody.ts");
  clearCatalogCaches();
  const posts = stubCatalogFetch();
  await Promise.all([loadTools(), loadSkills()]);
  assert.equal(
    posts.some((post) => post.exportName === "get-skill"),
    false,
  );

  const loaded = await fetchSkillDocument("mattpocock-grill-with-docs");
  assert.equal(loaded.status, "ok");
  assert.equal(
    posts.some((post) => post.exportName === "get-skill"),
    true,
  );
  assert.ok(
    posts.some(
      (post) =>
        post.exportName === "get-skill" &&
        post.params.id === "mattpocock-grill-with-docs",
    ),
  );
});
