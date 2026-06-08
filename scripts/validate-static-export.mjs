import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REQUIRED_STATIC_FILES = ["index.html", "404.html"];

function assertValid(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function cleanValue(value) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function includesHtmlSnippet(html, snippet) {
  return html.includes(snippet) || html.includes(escapeHtml(snippet));
}

function getExpectedDeploymentSnippets(env) {
  const environment = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT);
  const url = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_URL);
  const ref = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_REF);
  const sha = cleanValue(env.NEXT_PUBLIC_DEPLOYMENT_SHA);
  const shortSha = sha ? sha.slice(0, 7) : null;

  return [environment, url, ref, shortSha].filter(Boolean);
}

export function validateStaticExport(outputDirectory = "out", env = process.env) {
  const outputPath = resolve(outputDirectory);

  assertValid(
    isDirectory(outputPath),
    `Static export directory not found at ${outputPath}. Run pnpm run build first.`,
  );

  const missingFiles = REQUIRED_STATIC_FILES.filter(
    (fileName) => !isFile(join(outputPath, fileName)),
  );

  assertValid(
    missingFiles.length === 0,
    `Static export is missing required file(s): ${missingFiles.join(", ")}`,
  );

  const nextStaticPath = join(outputPath, "_next", "static");

  assertValid(
    isDirectory(nextStaticPath) && readdirSync(nextStaticPath).length > 0,
    "Static export is missing compiled Next.js assets in out/_next/static.",
  );

  const indexHtml = readFileSync(join(outputPath, "index.html"), "utf8");

  assertValid(
    indexHtml.includes("Web Calculator"),
    "Static export index.html does not contain the calculator application shell.",
  );
  assertValid(
    !indexHtml.includes("/_next/image"),
    "Static export references the Next.js image optimizer, which is unavailable for output: export.",
  );

  const missingDeploymentSnippets = getExpectedDeploymentSnippets(env).filter(
    (snippet) => !includesHtmlSnippet(indexHtml, snippet),
  );

  assertValid(
    missingDeploymentSnippets.length === 0,
    `Static export is missing deployment metadata snippet(s): ${missingDeploymentSnippets.join(", ")}`,
  );

  return {
    checkedFiles: REQUIRED_STATIC_FILES,
    checkedMetadataSnippets: getExpectedDeploymentSnippets(env),
    outputPath,
  };
}

export function main() {
  try {
    const result = validateStaticExport(process.argv[2] ?? "out");

    console.log(`Validated static export at ${result.outputPath}.`);
    console.log(`Required files: ${result.checkedFiles.join(", ")}.`);

    if (result.checkedMetadataSnippets.length > 0) {
      console.log(
        `Deployment metadata snippets: ${result.checkedMetadataSnippets.join(", ")}.`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
