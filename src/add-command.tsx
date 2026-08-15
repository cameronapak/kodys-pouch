import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import {
  displayExportName,
  getPackageDetail,
  listPackages,
  parseParamsJson,
  saveCommand,
  type KodyExport,
  type KodyPackage,
  type SavedCommand,
} from "./kody";
import { ResultView } from "./result";

type PackagePickerProps = {
  onSaved?: () => void;
};

export default function AddCommand() {
  return <PackagePicker />;
}

export function PackagePicker({ onSaved }: PackagePickerProps) {
  const { data, isLoading, error } = usePromise(listPackages);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search packages"
      navigationTitle="Add Kody Command"
    >
      {error ? (
        <ErrorView title="Could not list packages" message={error.message} />
      ) : null}
      {(data ?? []).map((pkg) => (
        <List.Item
          key={pkg.packageId}
          icon={Icon.Box}
          title={pkg.name}
          subtitle={pkg.kodyId}
          accessories={pkg.tags.slice(0, 3).map((tag) => ({ tag }))}
          actions={
            <ActionPanel>
              <Action.Push
                title="Choose Export"
                icon={Icon.ChevronRight}
                target={<ExportPicker pkg={pkg} onSaved={onSaved} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

type ExportPickerProps = {
  pkg: KodyPackage;
  onSaved?: () => void;
};

function ExportPicker({ pkg, onSaved }: ExportPickerProps) {
  const { data, isLoading, error } = usePromise(() =>
    getPackageDetail({ packageId: pkg.packageId }),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search exports"
      navigationTitle={pkg.name}
      isShowingDetail
    >
      {error ? (
        <ErrorView title="Could not load exports" message={error.message} />
      ) : null}
      {(data?.exports ?? []).map((exp) => {
        const exportName = exp.exportName || exp.subpath;
        const form = {
          kodyId: pkg.kodyId,
          label: pkg.name,
          exportName,
          typeDefinition: exp.typeDefinition,
        };
        return (
          <List.Item
            key={exp.subpath}
            icon={Icon.Code}
            title={displayExportName(exportName)}
            subtitle={exp.description?.split("\n")[0]}
            detail={
              <List.Item.Detail
                markdown={exportMarkdown(exp)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Package"
                      text={pkg.kodyId}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Export"
                      text={displayExportName(exportName)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="Save Command"
                  icon={Icon.Plus}
                  target={<SaveCommandForm {...form} onSaved={onSaved} />}
                />
                <Action.Push
                  title="Run Once"
                  icon={Icon.Play}
                  target={<SaveCommandForm {...form} runOnce />}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

type SaveCommandFormProps = {
  kodyId: string;
  exportName: string;
  label?: string;
  typeDefinition?: string | null;
  command?: SavedCommand;
  runOnce?: boolean;
  onSaved?: () => void;
};

export function SaveCommandForm({
  kodyId,
  exportName,
  label,
  typeDefinition,
  command,
  runOnce = false,
  onSaved,
}: SaveCommandFormProps) {
  const { push, pop } = useNavigation();
  const [titleError, setTitleError] = useState<string | undefined>();
  const [paramsError, setParamsError] = useState<string | undefined>();
  const defaultTitle =
    command?.title ?? `${label ?? kodyId} / ${displayExportName(exportName)}`;
  const defaultParams = command
    ? JSON.stringify(command.params, null, 2)
    : "{}";

  async function handleSubmit(values: { title: string; params: string }) {
    const title = values.title.trim();
    if (!runOnce && title === "") {
      setTitleError("Title is required");
      return;
    }

    let params: Record<string, unknown>;
    try {
      params = parseParamsJson(values.params);
      setParamsError(undefined);
    } catch (error) {
      setParamsError(error instanceof Error ? error.message : "Invalid JSON");
      return;
    }

    const target = { kodyId, exportName, params };

    if (runOnce) {
      push(<ResultView target={target} />);
      return;
    }

    try {
      await saveCommand({
        ...target,
        id: command?.id ?? crypto.randomUUID(),
        title,
        createdAt: command?.createdAt ?? new Date().toISOString(),
      });
      onSaved?.();
      pop();
    } catch (error) {
      await showFailureToast(error, { title: "Could not save command" });
    }
  }

  return (
    <Form
      navigationTitle={
        runOnce ? "Run Once" : command ? "Edit Command" : "Save Command"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={runOnce ? "Run" : command ? "Save Changes" : "Save Command"}
            icon={runOnce ? Icon.Play : Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {runOnce ? null : (
        <Form.TextField
          id="title"
          title="Title"
          defaultValue={defaultTitle}
          error={titleError}
          onChange={() => setTitleError(undefined)}
        />
      )}
      <Form.TextArea
        id="params"
        title="Params JSON"
        defaultValue={defaultParams}
        error={paramsError}
        onChange={() => setParamsError(undefined)}
        info={typeDefinition ?? "JSON object passed as params"}
      />
      <Form.Description
        title="Target"
        text={`${kodyId} / ${displayExportName(exportName)}`}
      />
    </Form>
  );
}

function ErrorView({ title, message }: { title: string; message: string }) {
  return (
    <List.EmptyView icon={Icon.Warning} title={title} description={message} />
  );
}

function exportMarkdown(exp: KodyExport): string {
  const parts = [
    exp.description?.trim(),
    exp.typeDefinition ? `\`\`\`ts\n${exp.typeDefinition}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return parts || "_No export docs_";
}
