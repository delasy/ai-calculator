import { pathToFileURL } from "node:url";
import { getPreviewEnvironment } from "./preview-environment.mjs";

const CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4";
const ROUTES_PAGE_SIZE = 100;

function getBranchNameFromRuntime() {
  const [branchName] = process.argv.slice(2).filter((argument) => argument !== "--");

  return branchName ?? process.env.PREVIEW_BRANCH ?? process.env.GITHUB_HEAD_REF ?? process.env.GITHUB_REF_NAME ?? "";
}

function requireEnvironmentVariable(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for preview cleanup`);
  }

  return value;
}

function createCloudflareError(message, response, payload) {
  const error = new Error(message);

  error.status = response.status;
  error.payload = payload;

  return error;
}

async function cloudflareFetch(path, { token, ...options }) {
  const response = await fetch(`${CLOUDFLARE_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.success === false) {
    const cloudflareMessage = payload?.errors
      ?.map((entry) => entry.message)
      .filter(Boolean)
      .join("; ");
    const message = cloudflareMessage || `Cloudflare API request failed with ${response.status}`;

    throw createCloudflareError(message, response, payload);
  }

  return payload;
}

async function listWorkerRoutes({ token, zoneId }) {
  const routes = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const payload = await cloudflareFetch(
      `/zones/${zoneId}/workers/routes?page=${page}&per_page=${ROUTES_PAGE_SIZE}`,
      { method: "GET", token },
    );

    routes.push(...(payload?.result ?? []));
    totalPages = payload?.result_info?.total_pages ?? page;
    page += 1;
  }

  return routes;
}

export async function deletePreviewRoute({ token, zoneId, route }) {
  const routes = await listWorkerRoutes({ token, zoneId });
  const matchingRoutes = routes.filter((workerRoute) => workerRoute.pattern === route);

  if (matchingRoutes.length === 0) {
    console.log(`No Cloudflare Workers route found for ${route}; nothing to delete.`);

    return 0;
  }

  for (const workerRoute of matchingRoutes) {
    await cloudflareFetch(`/zones/${zoneId}/workers/routes/${workerRoute.id}`, {
      method: "DELETE",
      token,
    });
    console.log(`Deleted Cloudflare Workers route ${workerRoute.pattern} (${workerRoute.id}).`);
  }

  return matchingRoutes.length;
}

export async function deletePreviewWorker({ token, accountId, worker }) {
  try {
    await cloudflareFetch(`/accounts/${accountId}/workers/scripts/${encodeURIComponent(worker)}`, {
      method: "DELETE",
      token,
    });
    console.log(`Deleted Cloudflare Worker ${worker}.`);

    return true;
  } catch (error) {
    if (error.status === 404) {
      console.log(`Cloudflare Worker ${worker} does not exist; nothing to delete.`);

      return false;
    }

    throw error;
  }
}

export async function cleanupPreviewEnvironment(branchName) {
  const metadata = getPreviewEnvironment(branchName);
  const token = requireEnvironmentVariable("CLOUDFLARE_API_TOKEN");
  const accountId = requireEnvironmentVariable("CLOUDFLARE_ACCOUNT_ID");
  const zoneId = requireEnvironmentVariable("CLOUDFLARE_ZONE_ID");

  console.log(`Cleaning preview URL ${metadata.url}.`);
  console.log(`Expected Cloudflare Worker: ${metadata.worker}.`);
  console.log(`Expected Cloudflare Workers route: ${metadata.route}.`);

  const deletedRoutes = await deletePreviewRoute({ token, zoneId, route: metadata.route });
  const deletedWorker = await deletePreviewWorker({ token, accountId, worker: metadata.worker });

  return {
    ...metadata,
    deletedRoutes,
    deletedWorker,
  };
}

export async function main() {
  try {
    const result = await cleanupPreviewEnvironment(getBranchNameFromRuntime());

    console.log(
      `Preview cleanup complete for ${result.url}; routes deleted: ${result.deletedRoutes}; worker deleted: ${result.deletedWorker}.`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
