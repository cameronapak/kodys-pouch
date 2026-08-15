import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  displayExportName,
  formatResult,
  invokeKodyExport,
  type InvocationTarget,
} from "./kody";

type ResultViewProps = {
  target: InvocationTarget;
};

export function ResultView({ target }: ResultViewProps) {
  const { data, isLoading, error, revalidate } = usePromise(() =>
    invokeKodyExport<unknown>(target),
  );
  const body = error
    ? error.message
    : data === undefined
      ? ""
      : formatResult(data);
  const title = `${target.kodyId} / ${displayExportName(target.exportName)}`;

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
