/**
 * Firebase Realtime Database (RTDB) adapters barrel.
 *
 * The Google-native production hot path: a `CounterStore` backed by RTDB,
 * replacing the former Redis/Upstash adapter. Wired at the composition root
 * (`container.ts`) for `SPINSHARE_MODE=production`. See design "Provider
 * Abstraction Layer (Ports)".
 */

export { getRealtimeDb } from "./client";
export {
  RealtimeDbCounterStore,
  type RealtimeDbCounterStoreOptions,
} from "./realtime-db-counter-store";
