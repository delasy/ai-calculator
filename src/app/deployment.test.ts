import { describe, expect, it } from "vitest";
import { getDeploymentMetadata } from "./deployment";

describe("getDeploymentMetadata", () => {
  it("omits deployment metadata when no build-time values are configured", () => {
    expect(getDeploymentMetadata({})).toBeNull();
  });

  it("normalizes production deployment metadata for static rendering", () => {
    expect(
      getDeploymentMetadata({
        NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "production",
        NEXT_PUBLIC_DEPLOYMENT_REF: "main",
        NEXT_PUBLIC_DEPLOYMENT_SHA: "abcdef1234567890",
        NEXT_PUBLIC_DEPLOYMENT_TARGET: "production",
        NEXT_PUBLIC_DEPLOYMENT_URL: "https://calc.delasy.com",
      }),
    ).toEqual({
      environment: "production",
      ref: "main",
      sha: "abcdef1234567890",
      shortSha: "abcdef1",
      target: "production",
      targetLabel: "Production",
      url: "https://calc.delasy.com",
    });
  });

  it("infers preview deployments from preview environment names", () => {
    expect(
      getDeploymentMetadata({
        NEXT_PUBLIC_DEPLOYMENT_ENVIRONMENT: "preview/feature-cloudflare-workers-1234abcd",
        NEXT_PUBLIC_DEPLOYMENT_URL:
          "https://feature-cloudflare-workers-1234abcd.git-ref.calc.delasy.com",
      }),
    ).toMatchObject({
      environment: "preview/feature-cloudflare-workers-1234abcd",
      target: "preview",
      targetLabel: "Preview",
      url: "https://feature-cloudflare-workers-1234abcd.git-ref.calc.delasy.com",
    });
  });
});
