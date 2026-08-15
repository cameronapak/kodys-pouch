import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterSkills,
  findSlashPartial,
  formatMention,
  isPrompt,
  replacePartial,
} from "./mention.ts";

const skills = [
  {
    id: "mattpocock-grill-with-docs",
    name: "grill-with-docs",
    description: "Grill a plan",
  },
  {
    id: "simple-english",
    name: "simple-english",
    description: "Plain language",
  },
];

test("Mention keeps name and id distinct", () => {
  assert.equal(
    formatMention({
      name: "grill-with-docs",
      id: "mattpocock-grill-with-docs",
    }),
    "/grill-with-docs (Kody skill_get id: mattpocock-grill-with-docs)",
  );
});

test("words-only text is not a Prompt", () => {
  assert.equal(isPrompt("rewrite this email"), false);
});

test("one completed Mention is a Prompt", () => {
  assert.equal(
    isPrompt(
      "/grill-with-docs (Kody skill_get id: mattpocock-grill-with-docs)",
    ),
    true,
  );
});

test("unfinished /partial is not a Prompt", () => {
  assert.equal(isPrompt("rewrite this /gri"), false);
});

test("whitespace-only text is not a Prompt", () => {
  assert.equal(isPrompt("   \n"), false);
});

test("finds /gri at the caret as a slash partial", () => {
  const text = "rewrite this /gri";
  assert.deepEqual(findSlashPartial(text, text.length), {
    start: 13,
    query: "gri",
  });
});

test("bare / at the caret is a slash partial with empty query", () => {
  const text = "rewrite this /";
  assert.deepEqual(findSlashPartial(text, text.length), {
    start: 13,
    query: "",
  });
});

test("finds /gri mid-sentence when caret is after the partial", () => {
  const text = "rewrite this /gri please";
  assert.deepEqual(findSlashPartial(text, 17), {
    start: 13,
    query: "gri",
  });
});

test("finds unfinished /gri after later words", () => {
  assert.deepEqual(findSlashPartial("rewrite this /gri please", 24), {
    start: 13,
    query: "gri",
  });
});

test("no slash partial at the end of a completed Mention", () => {
  const text =
    "/grill-with-docs (Kody skill_get id: mattpocock-grill-with-docs)";
  assert.equal(findSlashPartial(text, text.length), null);
});

test("no slash partial after a completed Mention plus words", () => {
  const text =
    "/grill-with-docs (Kody skill_get id: mattpocock-grill-with-docs) please";
  assert.equal(findSlashPartial(text, text.length), null);
});

test("finds a new /partial after a completed Mention", () => {
  const mention = formatMention(skills[0]);
  const text = `rewrite this ${mention} /sim`;
  assert.deepEqual(findSlashPartial(text, text.length), {
    start: text.lastIndexOf("/"),
    query: "sim",
  });
});

test("/gri matches grill-with-docs by name", () => {
  assert.deepEqual(filterSkills(skills, "gri"), [skills[0]]);
});

test("empty query lists all Skills", () => {
  assert.deepEqual(filterSkills(skills, ""), skills);
});

test("no matching name yields no Skills", () => {
  assert.deepEqual(filterSkills(skills, "xyz"), []);
});

test("replacePartial leaves surrounding words", () => {
  const mention = formatMention(skills[0]);
  assert.equal(
    replacePartial(
      "rewrite this /gri please",
      { start: 13, query: "gri" },
      mention,
    ),
    `rewrite this ${mention} please`,
  );
});

test("two Mentions stay a Prompt after a second replace", () => {
  const first = formatMention(skills[0]);
  const second = formatMention(skills[1]);
  const afterFirst = `rewrite this ${first} /sim`;
  const partial = findSlashPartial(afterFirst, afterFirst.length);
  assert.ok(partial);
  const afterSecond = replacePartial(afterFirst, partial, second);
  assert.equal(afterSecond, `rewrite this ${first} ${second}`);
  assert.equal(isPrompt(afterSecond), true);
});
