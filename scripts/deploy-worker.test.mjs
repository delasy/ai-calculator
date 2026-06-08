import { describe, expect, it } from "vitest";
import { assertWorkflowDeployment } from "./deploy-worker.mjs";

describe("assertWorkflowDeployment", () => {
  it("allows real deploy commands in GitHub Actions", () => {
    expect(() => assertWorkflowDeployment([], { GITHUB_ACTIONS: "true" })).not.toThrow();
  });

  it("allows local dry-run validation", () => {
    expect(() => assertWorkflowDeployment(["--dry-run"], {})).not.toThrow();
  });

  it("blocks local real deploy commands", () => {
    expect(() => assertWorkflowDeployment([], {})).toThrow(/GitHub Actions/);
  });
});
