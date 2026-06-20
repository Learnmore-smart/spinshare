import { afterEach, describe, expect, it, vi } from "vitest";

const savedNamespace = process.env.SPINSHARE_FIRESTORE_NAMESPACE;

afterEach(() => {
  if (savedNamespace === undefined) {
    delete process.env.SPINSHARE_FIRESTORE_NAMESPACE;
  } else {
    process.env.SPINSHARE_FIRESTORE_NAMESPACE = savedNamespace;
  }
  vi.resetModules();
});

describe("Firestore collection paths", () => {
  it("uses top-level collection names by default", async () => {
    delete process.env.SPINSHARE_FIRESTORE_NAMESPACE;
    vi.resetModules();

    const { COLLECTIONS } = await import("./collections");

    expect(COLLECTIONS).toMatchObject({
      users: "users",
      userIdentities: "userIdentities",
      campaigns: "campaigns",
      ledgerEntries: "ledgerEntries",
      impressionActivities: "impressionActivities",
      impressionProgress: "impressionProgress",
      paymentEvents: "paymentEvents",
      payoutAttempts: "payoutAttempts",
    });
  });

  it("isolates Firestore collections under an explicit namespace", async () => {
    process.env.SPINSHARE_FIRESTORE_NAMESPACE = "test";
    vi.resetModules();

    const { COLLECTIONS } = await import("./collections");

    expect(COLLECTIONS).toMatchObject({
      users: "namespaces/test/users",
      userIdentities: "namespaces/test/userIdentities",
      campaigns: "namespaces/test/campaigns",
      ledgerEntries: "namespaces/test/ledgerEntries",
      impressionActivities: "namespaces/test/impressionActivities",
      impressionProgress: "namespaces/test/impressionProgress",
      paymentEvents: "namespaces/test/paymentEvents",
      payoutAttempts: "namespaces/test/payoutAttempts",
    });
  });
});
