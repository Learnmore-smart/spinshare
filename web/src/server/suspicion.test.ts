import { describe, expect, it } from "vitest";

import { DEFAULT_SUSPICION_CONFIG, scoreImpression } from "./suspicion";

describe("scoreImpression", () => {
  it("scores nothing for absent or benign signals", () => {
    expect(scoreImpression({})).toMatchObject({ score: 0, band: "ok" });
    expect(scoreImpression({ ipFanout: 1, ipVelocity: 1 })).toMatchObject({
      band: "ok",
    });
    // Fan-out at the threshold contributes nothing (only strictly above counts).
    expect(scoreImpression({ ipFanout: 3 }).band).toBe("ok");
  });

  it("does NOT suppress on shared-egress-plausible fan-out alone", () => {
    // A handful of accounts on one IP (office NAT / VPN) must not be suppressed.
    const result = scoreImpression({ ipFanout: 6 });
    expect(result.band).not.toBe("suppress");
  });

  it("flags moderate fan-out for review without suppressing", () => {
    const result = scoreImpression({ ipFanout: 7 }); // (7-3)*1 = 4 >= reviewAt(3)
    expect(result.band).toBe("review");
  });

  it("suppresses a clear single-IP farm (many accounts)", () => {
    const result = scoreImpression({ ipFanout: 12 }); // (12-3)*1 = 9 >= suppressAt(8)
    expect(result.band).toBe("suppress");
    expect(result.reasons.join(" ")).toContain("ip_fanout=12");
  });

  it("suppresses a datacenter IP corroborated by fan-out", () => {
    // datacenter(4) + (8-3)*1 = 9 >= 8
    const result = scoreImpression({ datacenterHit: true, ipFanout: 8 });
    expect(result.band).toBe("suppress");
  });

  it("treats a lone datacenter hit as review, not suppress", () => {
    const result = scoreImpression({ datacenterHit: true }); // 4 → review band
    expect(result.band).toBe("review");
  });

  it("adds per-IP velocity points only above the threshold", () => {
    const below = scoreImpression({ ipVelocity: DEFAULT_SUSPICION_CONFIG.velocityThreshold });
    expect(below.score).toBe(0);
    const above = scoreImpression({ ipVelocity: DEFAULT_SUSPICION_CONFIG.velocityThreshold + 100 });
    expect(above.score).toBeCloseTo(100 * DEFAULT_SUSPICION_CONFIG.velocityWeight);
  });

  it("honors injected (rotated) config", () => {
    const strict = scoreImpression(
      { ipFanout: 4 },
      { ...DEFAULT_SUSPICION_CONFIG, suppressAt: 1 },
    );
    expect(strict.band).toBe("suppress");
  });
});
