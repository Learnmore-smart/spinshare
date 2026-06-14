import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdResponse, TrackResponse } from "@spinshare/core";

import { AdController, type AdClientLike, type VsCodeLike } from "./ad-controller";

interface ProgressCall {
  title?: string;
  dismissed: boolean;
}

function makeMockVscode(): { vscode: VsCodeLike; progressCalls: ProgressCall[] } {
  const progressCalls: ProgressCall[] = [];
  const vscode: VsCodeLike = {
    ProgressLocation: { Notification: 15 },
    window: {
      withProgress<R>(
        options: { title?: string; location: number | { viewId: string } },
        task: (
          progress: { report: (v: unknown) => void },
          token: { isCancellationRequested: boolean },
        ) => Thenable<R>,
      ): Thenable<R> {
        const call: ProgressCall = { title: options.title, dismissed: false };
        progressCalls.push(call);
        const result = task(
          { report: () => {} },
          { isCancellationRequested: false },
        );
        return Promise.resolve(result).then((value) => {
          call.dismissed = true;
          return value;
        });
      },
    },
  };
  return { vscode, progressCalls };
}

function makeMockClient(ad: AdResponse): {
  client: AdClientLike;
  impressions: string[];
} {
  const impressions: string[] = [];
  const track: TrackResponse = {
    recorded: true,
    developerCreditCents: 18,
    developerCreditUsd: "0.18",
  };
  const client: AdClientLike = {
    getAd: async () => ad,
    reportImpression: async (campaignId: string, viewDurationMs: number) => {
      impressions.push(`${campaignId}:${viewDurationMs}`);
      return track;
    },
  };
  return { client, impressions };
}

const availableAd: AdResponse = {
  adAvailable: true,
  campaignId: "cmp_123",
  adText: "Ship faster with Acme CI",
  cpmCents: 3000,
  cpmUsd: "30.00",
};

describe("AdController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the ad text but does not report before 3 seconds", async () => {
    vi.useFakeTimers();
    const { vscode, progressCalls } = makeMockVscode();
    const { client, impressions } = makeMockClient(availableAd);
    const controller = new AdController({ vscode, client });

    await controller.startGeneration();
    await vi.advanceTimersByTimeAsync(2999);

    expect(progressCalls).toHaveLength(1);
    expect(progressCalls[0].title).toBe(availableAd.adText);
    expect(impressions).toEqual([]);
    expect(controller.isActive).toBe(true);
  });

  it("reports exactly one impression when the generation reaches 3 seconds", async () => {
    vi.useFakeTimers();
    const { vscode } = makeMockVscode();
    const { client, impressions } = makeMockClient(availableAd);
    const controller = new AdController({ vscode, client });

    await controller.startGeneration();
    await vi.advanceTimersByTimeAsync(3000);

    expect(impressions).toEqual(["cmp_123:3000"]);
  });

  it("cancels the pending impression when generation completes before 3 seconds", async () => {
    vi.useFakeTimers();
    const { vscode } = makeMockVscode();
    const { client, impressions } = makeMockClient(availableAd);
    const controller = new AdController({ vscode, client });

    await controller.startGeneration();
    await vi.advanceTimersByTimeAsync(2999);
    controller.completeGeneration();
    await vi.advanceTimersByTimeAsync(1);

    expect(impressions).toEqual([]);
  });

  it("dismisses the notification when the generation completes", async () => {
    const { vscode, progressCalls } = makeMockVscode();
    const { client } = makeMockClient(availableAd);
    const controller = new AdController({ vscode, client });

    await controller.startGeneration();
    expect(progressCalls[0].dismissed).toBe(false);

    controller.completeGeneration();
    await Promise.resolve();

    expect(progressCalls[0].dismissed).toBe(true);
    expect(controller.isActive).toBe(false);
  });

  it("does not show a notification or report an impression when no ad is available", async () => {
    const { vscode, progressCalls } = makeMockVscode();
    const { client, impressions } = makeMockClient({ adAvailable: false });
    const controller = new AdController({ vscode, client });

    await controller.startGeneration();

    expect(progressCalls).toHaveLength(0);
    expect(impressions).toEqual([]);
    expect(controller.isActive).toBe(false);
  });

  it("does not start a second notification or impression while one is active", async () => {
    vi.useFakeTimers();
    const { vscode, progressCalls } = makeMockVscode();
    const { client, impressions } = makeMockClient(availableAd);
    const controller = new AdController({ vscode, client });

    await controller.startGeneration();
    await controller.startGeneration();
    await vi.advanceTimersByTimeAsync(3000);

    expect(progressCalls).toHaveLength(1);
    expect(impressions).toEqual(["cmp_123:3000"]);
  });

  it("reports exactly one impression across many start/complete cycles", async () => {
    vi.useFakeTimers();
    const { vscode } = makeMockVscode();
    const { client, impressions } = makeMockClient(availableAd);
    const controller = new AdController({ vscode, client });

    for (let i = 0; i < 5; i++) {
      await controller.startGeneration();
      await vi.advanceTimersByTimeAsync(3000);
      controller.completeGeneration();
    }

    expect(impressions).toHaveLength(5);
  });

  it("passes the bearer token through to the client", async () => {
    vi.useFakeTimers();
    const { vscode } = makeMockVscode();
    let seenToken: string | undefined;
    const client: AdClientLike = {
      getAd: async () => availableAd,
      reportImpression: async (_campaignId, _viewDurationMs, token) => {
        seenToken = token;
        return null;
      },
    };
    const controller = new AdController({
      vscode,
      client,
      getToken: () => "tok_abc",
    });

    await controller.startGeneration();
    await vi.advanceTimersByTimeAsync(3000);

    expect(seenToken).toBe("tok_abc");
  });
});
