import { describe, expect, it } from "vitest";
import { getPreviewEnvironment, slugifyBranchName } from "./preview-environment.mjs";

describe("slugifyBranchName", () => {
  it("creates deterministic DNS-safe slugs from branch names", () => {
    const slug = slugifyBranchName("Feature/Add Cloudflare Workers!");

    expect(slug).toMatch(/^feature-add-cloudflare-workers-[a-f0-9]{8}$/);
    expect(slug).toBe(slugifyBranchName("Feature/Add Cloudflare Workers!"));
  });

  it("adds a hash so similarly normalized branch names do not collide", () => {
    expect(slugifyBranchName("feature/add-workers")).not.toBe(
      slugifyBranchName("feature_add-workers"),
    );
  });

  it("keeps preview slugs within the configured DNS label limit", () => {
    const slug = slugifyBranchName("feature/".repeat(20), { maxLength: 40 });

    expect(slug).toHaveLength(40);
    expect(slug).toMatch(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])$/);
  });
});

describe("getPreviewEnvironment", () => {
  it("derives stable preview deployment metadata under the preview domain", () => {
    const metadata = getPreviewEnvironment("feature/cloudflare-workers");

    expect(metadata.slug).toMatch(/^feature-cloudflare-workers-[a-f0-9]{8}$/);
    expect(metadata.host).toBe(`${metadata.slug}.git-ref.calc.delasy.com`);
    expect(metadata.url).toBe(`https://${metadata.host}`);
    expect(metadata.worker).toBe(`ai-calculator-preview-${metadata.slug}`);
    expect(metadata.route).toBe(`${metadata.host}/*`);
    expect(metadata.environment).toBe(`preview/${metadata.slug}`);
  });
});
