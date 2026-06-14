/**
 * Shared in-process device-code store.
 *
 * In Next.js dev, HMR re-evaluates modules and would wipe a module-level Map,
 * making CLI polls return `expired_token` immediately. Pinning the store on
 * `globalThis` keeps pending device flows alive across reloads.
 */

export interface DeviceRecord {
  userCode: string;
  expiresAtMs: number;
  lastPollMs: number | null;
  state:
    | { kind: "pending" }
    | { kind: "approved"; accessToken: string }
    | { kind: "denied" };
}

export interface DeviceCodeStore {
  get(deviceCode: string): DeviceRecord | undefined;
  set(deviceCode: string, record: DeviceRecord): void;
  delete(deviceCode: string): void;
  findByUserCode(
    userCode: string,
  ): { deviceCode: string; record: DeviceRecord } | undefined;
}

class InMemoryDeviceCodeStore implements DeviceCodeStore {
  private readonly byDeviceCode = new Map<string, DeviceRecord>();

  get(deviceCode: string): DeviceRecord | undefined {
    return this.byDeviceCode.get(deviceCode);
  }

  set(deviceCode: string, record: DeviceRecord): void {
    this.byDeviceCode.set(deviceCode, record);
  }

  delete(deviceCode: string): void {
    this.byDeviceCode.delete(deviceCode);
  }

  findByUserCode(
    userCode: string,
  ): { deviceCode: string; record: DeviceRecord } | undefined {
    for (const [deviceCode, record] of this.byDeviceCode) {
      if (record.userCode === userCode) return { deviceCode, record };
    }
    return undefined;
  }
}

const STORE_KEY = Symbol.for("spinshare.deviceCodeStore");

/** Process-wide device flow store (survives Next.js dev HMR). */
export function getSharedDeviceCodeStore(): DeviceCodeStore {
  const g = globalThis as Record<symbol, DeviceCodeStore | undefined>;
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = new InMemoryDeviceCodeStore();
  }
  return g[STORE_KEY];
}
