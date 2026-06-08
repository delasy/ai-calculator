import { createHash } from "node:crypto";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_PREVIEW_DOMAIN = "git-ref.calc.delasy.com";
const DEFAULT_WORKER_PREFIX = "ai-calculator-preview";
const DEFAULT_SLUG_MAX_LENGTH = 40;
const DNS_LABEL_MAX_LENGTH = 63;
const WORKER_NAME_MAX_LENGTH = 63;
const HASH_LENGTH = 8;

function trimHyphens(value) {
  return value.replace(/^-+|-+$/g, "");
}

function normalizeDnsLabel(value, fallback) {
  const normalized = trimHyphens(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-{2,}/g, "-"),
  );

  return normalized || fallback;
}

function assertDnsLabel(value, labelName) {
  if (value.length > DNS_LABEL_MAX_LENGTH) {
    throw new Error(
      `${labelName} must be ${DNS_LABEL_MAX_LENGTH} characters or fewer; received ${value.length}`,
    );
  }

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)) {
    throw new Error(`${labelName} must be a DNS-safe label; received "${value}"`);
  }
}

function normalizePreviewDomain(value) {
  const previewDomain = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (previewDomain.length === 0) {
    throw new Error("Preview domain is required");
  }

  for (const label of previewDomain.split(".")) {
    assertDnsLabel(label, "Preview domain label");
  }

  return previewDomain;
}

function getHash(value, hashLength = HASH_LENGTH) {
  return createHash("sha256").update(value).digest("hex").slice(0, hashLength);
}

export function slugifyBranchName(branchName, options = {}) {
  const trimmedBranchName = branchName.trim();

  if (trimmedBranchName.length === 0) {
    throw new Error("A branch name is required to derive a preview environment");
  }

  const maxLength = options.maxLength ?? DEFAULT_SLUG_MAX_LENGTH;

  if (maxLength > DNS_LABEL_MAX_LENGTH) {
    throw new Error(`Preview slug maxLength cannot exceed ${DNS_LABEL_MAX_LENGTH}`);
  }

  const hashLength = options.hashLength ?? HASH_LENGTH;
  const suffix = `-${getHash(trimmedBranchName, hashLength)}`;
  const maxBaseLength = maxLength - suffix.length;

  if (maxBaseLength < 1) {
    throw new Error("Preview slug maxLength is too short for the configured hash suffix");
  }

  const base = normalizeDnsLabel(trimmedBranchName, "branch");
  const clippedBase = trimHyphens(base.slice(0, maxBaseLength)) || "branch";
  const slug = `${clippedBase}${suffix}`;

  assertDnsLabel(slug, "Preview slug");

  return slug;
}

function configuredValue(value, fallback) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : fallback;
}

export function getPreviewEnvironment(branchName, options = {}) {
  const workerPrefix = normalizeDnsLabel(
    configuredValue(options.workerPrefix ?? process.env.CLOUDFLARE_PREVIEW_WORKER_PREFIX, DEFAULT_WORKER_PREFIX),
    "preview",
  );
  const maxSlugLength = Math.min(
    options.maxSlugLength ?? DEFAULT_SLUG_MAX_LENGTH,
    DNS_LABEL_MAX_LENGTH,
    WORKER_NAME_MAX_LENGTH - workerPrefix.length - 1,
  );

  if (maxSlugLength < HASH_LENGTH + 2) {
    throw new Error(
      `Preview worker prefix "${workerPrefix}" leaves too little room for a branch slug`,
    );
  }

  const previewDomain = normalizePreviewDomain(
    configuredValue(options.previewDomain ?? process.env.CLOUDFLARE_PREVIEW_DOMAIN, DEFAULT_PREVIEW_DOMAIN),
  );
  const slug = slugifyBranchName(branchName, { maxLength: maxSlugLength });
  const host = `${slug}.${previewDomain}`;
  const worker = `${workerPrefix}-${slug}`;

  assertDnsLabel(slug, "Preview slug");
  assertDnsLabel(worker, "Preview worker name");

  return {
    slug,
    host,
    url: `https://${host}`,
    worker,
    route: `${host}/*`,
    environment: `preview/${slug}`,
  };
}

function getBranchNameFromRuntime() {
  const [branchName] = process.argv.slice(2).filter((argument) => argument !== "--");

  return branchName ?? process.env.PREVIEW_BRANCH ?? process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? "";
}

function writeGitHubOutput(metadata) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  const output = Object.entries(metadata)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  appendFileSync(process.env.GITHUB_OUTPUT, `${output}\n`);
}

function printMetadata(metadata) {
  console.log(`Preview slug: ${metadata.slug}`);
  console.log(`Preview URL: ${metadata.url}`);
  console.log(`Preview worker: ${metadata.worker}`);
  console.log(`Preview route: ${metadata.route}`);
  console.log(`GitHub environment: ${metadata.environment}`);
}

export function main() {
  try {
    const metadata = getPreviewEnvironment(getBranchNameFromRuntime());

    writeGitHubOutput(metadata);
    printMetadata(metadata);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
