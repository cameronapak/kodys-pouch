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
