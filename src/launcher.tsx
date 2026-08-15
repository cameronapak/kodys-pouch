import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { PackagePicker, SaveCommandForm } from "./add-command";
import {
  deleteCommand,
  displayExportName,
  listSavedCommands,
  type SavedCommand,
} from "./kody";
import { ResultView } from "./result";

export default function Launcher() {
  const { data, isLoading, revalidate } = usePromise(listSavedCommands);
  const commands = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search saved commands">
      {commands.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No saved commands"
          description="Add a Kody package export to run it from this list."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Command"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<PackagePicker onSaved={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {commands.map((command) => (
        <List.Item
          key={command.id}
          icon={Icon.Terminal}
          title={command.title}
          subtitle={`${command.kodyId} / ${displayExportName(command.exportName)}`}
          accessories={paramAccessories(command.params)}
          actions={<CommandActions command={command} onChange={revalidate} />}
        />
      ))}
    </List>
  );
}

type CommandActionsProps = {
  command: SavedCommand;
  onChange: () => void;
};

function CommandActions({ command, onChange }: CommandActionsProps) {
  return (
    <ActionPanel>
      <Action.Push
        title="Run Command"
        icon={Icon.Play}
        target={<ResultView target={command} />}
      />
      <Action.Push
        title="Add Command"
        icon={Icon.Plus}
        shortcut={Keyboard.Shortcut.Common.New}
        target={<PackagePicker onSaved={onChange} />}
      />
      <Action.Push
        title="Edit Command"
        icon={Icon.Pencil}
        shortcut={Keyboard.Shortcut.Common.Edit}
        target={
          <SaveCommandForm
            kodyId={command.kodyId}
            exportName={command.exportName}
            command={command}
            onSaved={onChange}
          />
        }
      />
      <Action
        title="Delete Command"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={() => void removeCommand(command, onChange)}
      />
    </ActionPanel>
  );
}

async function removeCommand(command: SavedCommand, onChange: () => void) {
  const confirmed = await confirmAlert({
    title: "Delete command?",
    message: command.title,
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) {
    return;
  }
  try {
    await deleteCommand(command.id);
    onChange();
  } catch (error) {
    await showFailureToast(error, { title: "Could not delete command" });
  }
}

function paramAccessories(
  params: Record<string, unknown>,
): List.Item.Accessory[] {
  const keys = Object.keys(params);
  if (keys.length === 0) {
    return [];
  }
  return [{ text: `${keys.length} param${keys.length === 1 ? "" : "s"}` }];
}
