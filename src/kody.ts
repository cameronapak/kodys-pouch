import { Result } from "better-result";
import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";
import {
  LoadFailed,
  SkillsMissing,
  isRootExport,
  type PackageTool,
  type SkillItem,
  type ToolItem,
} from "./pouch";

export type Prefs = {
  baseUrl: string;
  username: string;
  token: string;
  discoveryKodyId: string;
};

type InvocationTarget = {
  kodyId: string;
  exportName: string;
  params: Record<string, unknown>;
};

type KodyPackage = {
  packageId: string;
  kodyId: string;
};

type KodyExport = {
  exportName: string;
  description: string;
};

type GetPackageResult = {
  kodyId: string;
  exports: KodyExport[];
};

type CapabilityRecord = {
  name: string;
  description: string;
  source: "builtin" | "remote-connector" | "mcp-server" | "openapi";
  mcpServer?: {
    kodyName?: string;
    serverName?: string;
    toolName?: string;
  };
  openApi?: {
    bindingName?: string;
    operationSlug?: string;
  };
  remoteConnector?: {
    connectorName?: string;
    toolName?: string;
  };
};

function getPrefs(): Prefs {
  const prefs = getPreferenceValues<Prefs & { discoveryKodyId?: string }>();
  return {
    ...prefs,
    discoveryKodyId: prefs.discoveryKodyId?.trim() || "raycast",
  };
}

function toRouteExportName(exportName: string): string {
  const trimmed = exportName.replace(/^\.\//, "");
  if (trimmed === "" || trimmed === "." || trimmed === "__root__") {
    return "__root__";
  }
  return trimmed;
}

function displayExportName(exportName: string): string {
  const route = toRouteExportName(exportName);
  return route === "__root__" ? "." : route;
}

async function invokeKodyExport<T>({
  kodyId,
  exportName,
  params = {},
}: InvocationTarget): Promise<T> {
  const prefs = getPrefs();
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

const fetchPackageTools = withCache(
  async (): Promise<PackageTool[]> => {
    const packages = await invokeKodyExport<{ packages: KodyPackage[] }>({
      kodyId: getPrefs().discoveryKodyId,
      exportName: "list-packages",
      params: {},
    });
    const details = await Promise.all(
      packages.packages.map((pkg) =>
        invokeKodyExport<GetPackageResult>({
          kodyId: getPrefs().discoveryKodyId,
          exportName: "get-package",
          params: { packageId: pkg.packageId },
        }),
      ),
    );
    return details.flatMap((pkg) =>
      pkg.exports
        .filter((exp) => !isRootExport(exp.exportName))
        .map((exp) => ({
          kind: "tool",
          parentKind: "package",
          name: displayExportName(exp.exportName),
          description: exp.description ?? "",
          kodyId: pkg.kodyId,
          exportName: exp.exportName,
        })),
    );
  },
  { maxAge: 5 * 60 * 1000, validate: Array.isArray },
);

export function clearPackageToolsCache() {
  fetchPackageTools.clearCache();
}

export async function loadTools() {
  try {
    const packageTools = await fetchPackageTools();
    const extra = await loadCapabilities();
    return Result.ok([...packageTools, ...extra]);
  } catch (error) {
    return Result.err(new LoadFailed({ message: publicMessage(error) }));
  }
}

export async function loadSkills() {
  try {
    const result = await invokeKodyExport<SkillItem[]>({
      kodyId: getPrefs().discoveryKodyId,
      exportName: "list-skills",
      params: {},
    });
    if (!Array.isArray(result)) {
      return Result.err(
        new LoadFailed({ message: "Skill list was not an array" }),
      );
    }
    return Result.ok(
      result.map((skill) => ({
        kind: "skill" as const,
        name: skill.name,
        id: skill.id,
        description: skill.description ?? "",
      })),
    );
  } catch (error) {
    if (isMissingPackage(error)) {
      return Result.err(new SkillsMissing({ message: publicMessage(error) }));
    }
    return Result.err(new LoadFailed({ message: publicMessage(error) }));
  }
}

async function loadCapabilities(): Promise<ToolItem[]> {
  try {
    const result = await invokeKodyExport<{
      capabilities?: CapabilityRecord[];
    }>({
      kodyId: getPrefs().discoveryKodyId,
      exportName: "list-capabilities",
      params: {},
    });
    return (result.capabilities ?? []).map(capabilityToItem);
  } catch {
    return [];
  }
}

function capabilityToItem(cap: CapabilityRecord): ToolItem {
  switch (cap.source) {
    case "builtin":
      return {
        kind: "tool",
        parentKind: "kody",
        name: cap.name,
        description: cap.description,
        capability: cap.name,
      };
    case "mcp-server":
      return {
        kind: "tool",
        parentKind: "mcp",
        name: cap.mcpServer?.toolName ?? cap.name,
        description: cap.description,
        server: cap.mcpServer?.kodyName ?? cap.mcpServer?.serverName ?? "mcp",
        tool: cap.mcpServer?.toolName ?? cap.name,
      };
    case "openapi":
      return {
        kind: "tool",
        parentKind: "other",
        name: cap.openApi?.operationSlug ?? cap.name,
        description: cap.description,
        provider: "openapi",
        ref: [cap.openApi?.bindingName, cap.openApi?.operationSlug]
          .filter(Boolean)
          .join(" "),
      };
    case "remote-connector":
      return {
        kind: "tool",
        parentKind: "other",
        name: cap.remoteConnector?.toolName ?? cap.name,
        description: cap.description,
        provider: "remote",
        ref: [cap.remoteConnector?.connectorName, cap.remoteConnector?.toolName]
          .filter(Boolean)
          .join(" "),
      };
    default: {
      const _never: never = cap.source;
      return _never;
    }
  }
}

function isMissingPackage(error: unknown): boolean {
  const text = publicMessage(error);
  return /not found|unknown package|no such package|failed \(404\)/i.test(text);
}

function publicMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
