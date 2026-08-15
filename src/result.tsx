import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { displayExportName, formatResult, invokeKodyExport } from "./kody";

type ResultViewProps = {
  kodyId: string;
  exportName: string;
  params: Record<string, unknown>;
};

export function ResultView({ kodyId, exportName, params }: ResultViewProps) {
  const { data, isLoading, error, revalidate } = usePromise(() =>
    invokeKodyExport<unknown>(kodyId, exportName, params),
  );
  const body = error
    ? error.message
    : data === undefined
      ? ""
      : formatResult(data);
  const title = `${kodyId} / ${displayExportName(exportName)}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={isLoading ? "Running…" : `\`\`\`json\n${body}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={body} />
          <Action
            title="Run Again"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
