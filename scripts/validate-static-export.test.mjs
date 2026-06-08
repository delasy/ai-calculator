import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateStaticExport } from "./validate-static-export.mjs";

let temporaryDirectories = [];

function createStaticExport({ indexHtml = "<h1>Web Calculator</h1>", includeNextStatic = true } = {}) {
  const directory = mkdtempSync(join(tmpdir(), "ai-calculator-static-"));

  temporaryDirectories.push(directory);
  writeFileSync(join(directory, "index.html"), indexHtml);
  writeFileSync(join(directory, "404.html"), "<h1>Not found</h1>");

  if (includeNextStatic) {
    const staticDirectory = join(directory, "_next", "static");

    mkdirSync(staticDirectory, { recursive: true });
    writeFileSync(join(staticDirectory, "app.js"), "console.log('ok');");
  }

  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { force: true, recursive: true });
  }

  temporaryDirectories = [];
});

describe("validateStaticExport", () => {
  it("accepts a static Next.js export with the calculator shell", () => {
    const directory = createStaticExport();

    expect(validateStaticExport(directory, {})).toMatchObject({
      checkedFiles: ["index.html", "404.html"],
      outputPath: directory,
    });
  });

  it("rejects exports that still reference the Next.js image optimizer", () => {
    const directory = createStaticExport({
      indexHtml: '<h1>Web Calculator</h1><img src="/_next/image?url=%2Flogo.png" />',
    });

    expect(() => validateStaticExport(directory, {})).toThrow(/image optimizer/);
  });

  it("checks deployment metadata when build-time metadata values are provided", () => {
    const directory = createStaticExport({
      indexHtml:
        "<h1>Web Calculator</h1><p>preview/test</p><a>https://test.git-ref.calc.delasy.com</a><p>feature/test @ abcdef1</p>",
    });

    expect(
      validateStaticExport(directory, {
        NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "preview/test",
        NEXT_PUBLIC_DEPLOYMENT_REF: "feature/test",
        NEXT_PUBLIC_DEPLOYMENT_SHA: "abcdef1234567890",
        NEXT_PUBLIC_DEPLOYMENT_URL: "https://test.git-ref.calc.delasy.com",
      }),
    ).toMatchObject({
      checkedMetadataSnippets: [
        "preview/test",
        "https://test.git-ref.calc.delasy.com",
        "feature/test",
        "abcdef1",
      ],
    });
  });

  it("matches deployment metadata that React escaped in static HTML", () => {
    const directory = createStaticExport({
      indexHtml:
        "<h1>Web Calculator</h1><p>feature/&amp;docs @ abcdef1</p>",
    });

    expect(
      validateStaticExport(directory, {
        NEXT_PUBLIC_DEPLOYMENT_REF: "feature/&docs",
        NEXT_PUBLIC_DEPLOYMENT_SHA: "abcdef1234567890",
      }),
    ).toMatchObject({
      checkedMetadataSnippets: ["feature/&docs", "abcdef1"],
    });
  });

  it("rejects exports missing configured deployment metadata", () => {
    const directory = createStaticExport();

    expect(() =>
      validateStaticExport(directory, {
        NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "production",
      }),
    ).toThrow(/deployment metadata/);
  });
});
