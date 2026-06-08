export interface DeploymentMetadata {
  environment: string;
  ref: string | null;
  sha: string | null;
  shortSha: string | null;
  target: string;
  targetLabel: string;
  url: string | null;
}

interface DeploymentEnvironment {
  [key: string]: string | undefined;
  NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT?: string;
  NEXT_PUBLIC_DEPLOYMENT_REF?: string;
  NEXT_PUBLIC_DEPLOYMENT_SHA?: string;
  NEXT_PUBLIC_DEPLOYMENT_TARGET?: string;
  NEXT_PUBLIC_DEPLOYMENT_URL?: string;
}

const TARGET_LABELS: Record<string, string> = {
  preview: "Preview",
  production: "Production",
};

function cleanValue(value: string | undefined): string | null {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function normalizeTarget(target: string | null, environment: string | null): string {
  const normalizedTarget = target?.toLowerCase().replace(/[^a-z0-9-]+/g, "-") ?? null;

  if (normalizedTarget) {
    return normalizedTarget;
  }

  if (environment?.startsWith("preview/")) {
    return "preview";
  }

  if (environment === "production") {
    return "production";
  }

  return "deployment";
}

function getTargetLabel(target: string): string {
  return TARGET_LABELS[target] ?? "Deployment";
}

function getShortSha(sha: string | null): string | null {
  return sha ? sha.slice(0, 7) : null;
}

export function getDeploymentMetadata(
  env: DeploymentEnvironment = process.env,
): DeploymentMetadata | null {
  const environment = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT);
  const url = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_URL);
  const ref = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_REF);
  const sha = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_SHA);
  const target = normalizeTarget(cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_TARGET), environment);

  if (!environment && !url && !ref && !sha) {
    return null;
  }

  return {
    environment: environment ?? getTargetLabel(target),
    ref,
    sha,
    shortSha: getShortSha(sha),
    target,
    targetLabel: getTargetLabel(target),
    url,
  };
}
