import assert from "node:assert/strict";
import { test } from "node:test";

test("loadSkills requests discoveryKodyId/list-skills not skills/skill-list", async () => {
  const urls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    urls.push(url);
    return new Response(JSON.stringify({ result: [] }), { status: 200 });
  };

  const { loadSkills } = await import("./kody.ts");
  await loadSkills();

  assert.ok(
    urls.some((url) => url.includes("/raycast/list-skills")),
    `expected raycast/list-skills, got: ${urls.join(", ")}`,
  );
  assert.ok(
    !urls.some((url) => url.includes("/skills/skill-list")),
    `must not call skills/skill-list, got: ${urls.join(", ")}`,
  );
});

test("fetchSkillDocument requests skills/skill-get by id", async () => {
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
    urls.some((url) => url.includes("/skills/skill-get")),
    `expected skills/skill-get, got: ${urls.join(", ")}`,
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
