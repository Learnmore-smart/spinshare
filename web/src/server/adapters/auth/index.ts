/**
 * NextAuth (Auth.js) production auth adapters for `@spinshare/web`.
 *
 * Selected by `AUTH_MODE=oauth` at the composition root. Exposes the
 * {@link NextAuthDeviceProvider} (device flow + stateless token validation) and
 * the NextAuth browser-session config/handlers (Google + GitHub). See design
 * "Browser-Based Auth".
 */

export {
  NextAuthDeviceProvider,
  type NextAuthDeviceProviderOptions,
  type DeviceApproval,
  type DeviceCodeStore,
} from "./nextauth-device-provider";

export {
  mintDeviceToken,
  verifyDeviceToken,
  type DeviceTokenPayload,
} from "./device-token";

export { authConfig } from "./nextauth-config";
