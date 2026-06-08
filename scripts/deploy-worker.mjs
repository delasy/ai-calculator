import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const WRANGLER_DEPLOY_ARGS = ["exec", "wrangler", "deploy", "--config", "wrangler.jsonc"];

function isDryRun(args) {
  return args.includes("--dry-run");
}

export function assertWorkflowDeployment(args, env = process.env) {
  if (env.GITHUB_ACTIONS === "true" || isDryRun(args)) {
    return;
  }

  throw new Error(
    "Cloudflare deployments are only allowed from GitHub Actions. Use --dry-run for local Wrangler validation.",
  );
}

export async function runWranglerDeploy(args, env = process.env) {
  const wranglerArgs = args.filter((argument) => argument !== "--");

  assertWorkflowDeployment(wranglerArgs, env);

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(pnpmCommand, [...WRANGLER_DEPLOY_ARGS, ...wranglerArgs], {
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });

  process.exitCode = exitCode;
}

export async function main() {
  try {
    await runWranglerDeploy(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
