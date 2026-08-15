import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  filterSkills,
  findSlashPartial,
  formatMention,
  isPrompt,
  replacePartial,
  type Skill,
} from "./composer";
import { listSkills } from "./kody";

export default function Composer() {
  const [draft, setDraft] = useState("");
  const { data, isLoading, error } = usePromise(listSkills);
  const skills = data ?? [];
  const partial = findSlashPartial(draft, draft.length);
  const matches = partial ? filterSkills(skills, partial.query) : [];

  function insertMention(skill: Skill) {
    if (!partial) {
      return;
    }
    setDraft(replacePartial(draft, partial, formatMention(skill)));
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={draft}
      onSearchTextChange={setDraft}
      searchBarPlaceholder="Type a Prompt. / to mention a Skill"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not list Skills"
          description={error.message}
        />
      ) : null}
      {!error && partial
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
      {!error && partial && matches.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No matching Skills"
          actions={
            <ActionPanel>
              <PasteAction draft={draft} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && !partial && isPrompt(draft) ? (
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
      ) : null}
      {!error && !partial && !isPrompt(draft) && !isLoading ? (
        <List.EmptyView
          icon={Icon.Pencil}
          title="Type / to mention a Skill"
          description="Words are optional. Paste needs at least one Mention."
        />
      ) : null}
    </List>
  );
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

async function pastePrompt(draft: string) {
  if (!isPrompt(draft)) {
    return;
  }
  await Clipboard.copy(draft);
  await closeMainWindow();
  try {
    await Clipboard.paste(draft);
  } catch {
    await showHUD("Copied to clipboard");
  }
}
