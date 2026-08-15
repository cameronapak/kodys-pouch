import { getPreferenceValues, LocalStorage } from "@raycast/api";

export type Prefs = {
  baseUrl: string;
  username: string;
  token: string;
  discoveryKodyId: string;
};

export type InvocationTarget = {
  kodyId: string;
  exportName: string;
  params: Record<string, unknown>;
};

export type SavedCommand = InvocationTarget & {
  id: string;
  title: string;
  createdAt: string;
};

export type KodyPackage = {
  packageId: string;
  kodyId: string;
  name: string;
  description: string;
  tags: string[];
  hasApp: boolean;
  updatedAt?: string;
};

export type KodyExport = {
  subpath: string;
  exportName: string;
  importSpecifier: string;
  runtimeTarget: string;
  typesPath: string | null;
  description: string;
  typeDefinition: string | null;
};

export type GetPackageResult = {
  packageId: string;
  kodyId: string;
  name: string;
  description: string;
  tags: string[];
  hasApp: boolean;
  exports: KodyExport[];
};

const STORAGE_KEY = "saved-commands";

export function getPrefs(): Prefs {
  const prefs = getPreferenceValues<Prefs & { discoveryKodyId?: string }>();
  return {
    ...prefs,
    discoveryKodyId: prefs.discoveryKodyId?.trim() || "raycast",
  };
}

export function toRouteExportName(exportName: string): string {
  const trimmed = exportName.replace(/^\.\//, "");
  if (trimmed === "" || trimmed === "." || trimmed === "__root__") {
    return "__root__";
  }
  return trimmed;
}

export function displayExportName(exportName: string): string {
  const route = toRouteExportName(exportName);
  return route === "__root__" ? "." : route;
}

export async function invokeKodyExport<T>({
  kodyId,
  exportName,
  params = {},
}: InvocationTarget): Promise<T> {
  const prefs = getPrefs();
  // Live Kody routes the root export as __root__, not "."
  const route = toRouteExportName(exportName);
  const path = [kodyId, ...route.split("/").filter(Boolean)]
    .map(encodeURIComponent)
    .join("/");
  const base = prefs.baseUrl.replace(/\/$/, "");
  const url = `${base}/@${encodeURIComponent(prefs.username)}/api/package-invocations/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${prefs.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      params,
      source: "raycast",
      idempotencyKey: `raycast:${kodyId}:${route}:${crypto.randomUUID()}`,
    }),
  });

  const body = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(
      `Kody invocation failed (${response.status}): ${JSON.stringify(body)}`,
    );
  }

  return (body.result ?? body.data ?? body.output ?? body) as T;
}

export async function listPackages(): Promise<KodyPackage[]> {
  const result = await invokeKodyExport<{ packages: KodyPackage[] }>({
    kodyId: getPrefs().discoveryKodyId,
    exportName: "list-packages",
    params: {},
  });
  return result.packages;
}

export async function getPackageDetail(input: {
  packageId?: string;
  kodyId?: string;
}): Promise<GetPackageResult> {
  return invokeKodyExport<GetPackageResult>({
    kodyId: getPrefs().discoveryKodyId,
    exportName: "get-package",
    params: input,
  });
}

export async function listSavedCommands(): Promise<SavedCommand[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw) as SavedCommand[];
}

export async function saveCommand(command: SavedCommand): Promise<void> {
  const commands = await listSavedCommands();
  const next = [command, ...commands.filter((item) => item.id !== command.id)];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function deleteCommand(id: string): Promise<void> {
  const commands = await listSavedCommands();
  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(commands.filter((item) => item.id !== id)),
  );
}

export function parseParamsJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim() === "" ? "{}" : raw;
  const parsed: unknown = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Params must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function formatResult(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}
