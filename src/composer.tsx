import {
  Action,
  ActionPanel,
  Cache,
  Clipboard,
  Icon,
  List,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { runAppleScript, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import {
  filterSkills,
  findSlashPartial,
  formatMention,
  isPrompt,
  replacePartial,
  type Skill,
} from "./mention";
import { listSkills } from "./kody";

const skillsCache = new Cache();
const SKILLS_CACHE_KEY = "skills";

const TEXT_ROLES = new Set([
  "AXTextField",
  "AXTextArea",
  "AXSearchField",
  "AXComboBox",
  "AXText",
  "AXWebArea",
]);

type EmptyState =
  | { kind: "error"; message: string }
  | { kind: "no-match" }
  | { kind: "paste" }
  | { kind: "hint" };

export default function Composer() {
  const [draft, setDraft] = useState("");
  const { data, isLoading, error } = useCachedPromise(loadSkills, [], {
    initialData: readCachedSkills(),
    keepPreviousData: true,
  });
  const skills = data ?? [];
  const partial = findSlashPartial(draft, draft.length);
  const matches = partial ? filterSkills(skills, partial.query) : [];
  const empty = emptyState({
    error,
    partial,
    matchCount: matches.length,
    skillCount: skills.length,
    draft,
  });

  function insertMention(skill: Skill) {
    if (!partial) {
      return;
    }
    setDraft(replacePartial(draft, partial, formatMention(skill)));
  }

  return (
    <List
      isLoading={isLoading && skills.length === 0}
      filtering={false}
      searchText={draft}
      onSearchTextChange={setDraft}
      searchBarPlaceholder="Type a Prompt. / to mention a Skill"
    >
      {partial
        ? matches.map((skill) => (
            <List.Item
              key={skill.id}
              icon={Icon.Book}
              title={skill.name}
              subtitle={skill.description?.split("\n")[0]}
              actions={
                <ActionPanel>
                  <Action
                    title="Insert Mention"
                    icon={Icon.Plus}
                    onAction={() => insertMention(skill)}
                  />
                  <PasteAction draft={draft} />
                </ActionPanel>
              }
            />
          ))
        : null}
      {empty ? <ComposerEmpty state={empty} draft={draft} /> : null}
    </List>
  );
}

function emptyState({
  error,
  partial,
  matchCount,
  skillCount,
  draft,
}: {
  error: Error | undefined;
  partial: ReturnType<typeof findSlashPartial>;
  matchCount: number;
  skillCount: number;
  draft: string;
}): EmptyState | null {
  if (error && skillCount === 0) {
    return { kind: "error", message: error.message };
  }
  if (partial) {
    return matchCount === 0 ? { kind: "no-match" } : null;
  }
  if (isPrompt(draft)) {
    return { kind: "paste" };
  }
  return { kind: "hint" };
}

function ComposerEmpty({
  state,
  draft,
}: {
  state: EmptyState;
  draft: string;
}) {
  switch (state.kind) {
    case "error":
      return (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not list Skills"
          description={state.message}
        />
      );
    case "no-match":
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching Skills"
          actions={
            <ActionPanel>
              <PasteAction draft={draft} />
            </ActionPanel>
          }
        />
      );
    case "paste":
      return (
        <List.EmptyView
          icon={Icon.Clipboard}
          title="Paste Prompt"
          description="Into the Active Input"
          actions={
            <ActionPanel>
              <PasteAction draft={draft} />
            </ActionPanel>
          }
        />
      );
    case "hint":
      return (
        <List.EmptyView
          icon={Icon.Pencil}
          title="Type / to mention a Skill"
          description="Words are optional. Type in the search bar. Paste needs at least one Mention."
        />
      );
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

function PasteAction({ draft }: { draft: string }) {
  return (
    <Action
      title="Paste Prompt"
      icon={Icon.Clipboard}
      shortcut={{ modifiers: ["cmd"], key: "return" }}
      onAction={() => void pastePrompt(draft)}
    />
  );
}

async function loadSkills(): Promise<Skill[]> {
  const skills = await listSkills();
  skillsCache.set(SKILLS_CACHE_KEY, JSON.stringify(skills));
  return skills;
}

function readCachedSkills(): Skill[] {
  const raw = skillsCache.get(SKILLS_CACHE_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as Skill[];
  } catch {
    return [];
  }
}

async function pastePrompt(draft: string) {
  if (!isPrompt(draft)) {
    return;
  }
  await Clipboard.copy(draft);
  await closeMainWindow();
  if (await hasActiveInput()) {
    try {
      await Clipboard.paste(draft);
      return;
    } catch {
      // Clipboard already has the Prompt.
    }
  }
  await showHUD("Copied to clipboard");
}

async function hasActiveInput(): Promise<boolean> {
  try {
    const role = await runAppleScript(`
      tell application "System Events"
        repeat 20 times
          set proc to first application process whose frontmost is true
          if name of proc is not "Raycast" then
            return role of (value of attribute "AXFocusedUIElement" of proc)
          end if
          delay 0.05
        end repeat
        return "no"
      end tell
    `);
    return TEXT_ROLES.has(role.trim());
  } catch {
    return false;
  }
}
