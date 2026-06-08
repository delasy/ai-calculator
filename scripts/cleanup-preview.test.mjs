import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deletePreviewRoute, deletePreviewWorker } from "./cleanup-preview.mjs";

const API_BASE_URL = "https://api.cloudflare.com/client/v4";
const token = "preview-token";
const zoneId = "zone-id";
const accountId = "account-id";
const route = "feature.example.com/*";
const worker = "ai-calculator-preview-feature";

function cloudflareResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn(async () => JSON.stringify(payload)),
  };
}

function mockFetchResponses(...responses) {
  const fetchMock = vi.fn();

  for (const response of responses) {
    fetchMock.mockResolvedValueOnce(response);
  }

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("cleanup-preview Cloudflare API helpers", () => {
  it("deletes matching Workers routes with the preview token", async () => {
    const fetchMock = mockFetchResponses(
      cloudflareResponse({
        success: true,
        result: [
          { id: "route-other", pattern: "other.example.com/*" },
          { id: "route-preview", pattern: route },
        ],
        result_info: { total_pages: 1 },
      }),
      cloudflareResponse({ success: true, result: null }),
    );

    await expect(deletePreviewRoute({ token, zoneId, route })).resolves.toBe(1);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]).toEqual([
      `${API_BASE_URL}/zones/${zoneId}/workers/routes?page=1&per_page=100`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }),
      }),
    ]);
    expect(fetchMock.mock.calls[1]).toEqual([
      `${API_BASE_URL}/zones/${zoneId}/workers/routes/route-preview`,
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
      }),
    ]);
  });

  it("treats a missing route and a missing Worker as no-op cleanup", async () => {
    const fetchMock = mockFetchResponses(
      cloudflareResponse({
        success: true,
        result: [{ id: "route-other", pattern: "other.example.com/*" }],
        result_info: { total_pages: 1 },
      }),
      cloudflareResponse(
        { success: false, errors: [{ message: "script not found" }] },
        404,
      ),
    );

    await expect(deletePreviewRoute({ token, zoneId, route })).resolves.toBe(0);
    await expect(deletePreviewWorker({ token, accountId, worker })).resolves.toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe(
      `${API_BASE_URL}/accounts/${accountId}/workers/scripts/${worker}`,
    );
  });

  it("propagates non-404 Cloudflare API failures", async () => {
    mockFetchResponses(
      cloudflareResponse(
        { success: false, errors: [{ message: "Cloudflare outage" }] },
        500,
      ),
    );

    let thrownError;

    try {
      await deletePreviewWorker({ token, accountId, worker });
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).toBeInstanceOf(Error);
    expect(thrownError).toMatchObject({ status: 500 });
    expect(thrownError).toHaveProperty("message", "Cloudflare outage");
  });

  it("paginates Workers route listings before deleting the matching route", async () => {
    const fetchMock = mockFetchResponses(
      cloudflareResponse({
        success: true,
        result: [{ id: "route-page-1", pattern: "page-1.example.com/*" }],
        result_info: { total_pages: 2 },
      }),
      cloudflareResponse({
        success: true,
        result: [{ id: "route-page-2", pattern: route }],
        result_info: { total_pages: 2 },
      }),
      cloudflareResponse({ success: true, result: null }),
    );

    await expect(deletePreviewRoute({ token, zoneId, route })).resolves.toBe(1);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${API_BASE_URL}/zones/${zoneId}/workers/routes?page=1&per_page=100`,
      `${API_BASE_URL}/zones/${zoneId}/workers/routes?page=2&per_page=100`,
      `${API_BASE_URL}/zones/${zoneId}/workers/routes/route-page-2`,
    ]);
  });
});
