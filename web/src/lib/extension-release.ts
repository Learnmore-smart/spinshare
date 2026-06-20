/**
 * Single source of truth for the latest published SpinShare editor extension.
 *
 * The SpinShare VSCode extension is distributed as a sideloaded `.vsix`, not
 * through the Marketplace, so the editor never auto-updates it. Instead the
 * extension's own self-updater polls `GET /api/extension/version` (which serves
 * the values below) and reinstalls the VSIX when a newer version is published.
 *
 * INVARIANT: `LATEST_EXTENSION_VERSION` MUST equal the `version` of the VSIX
 * currently served at {@link EXTENSION_VSIX_PATH} (`web/public/spinshare.vsix`).
 * The `publish-prod` script in the `vscode-extension` package rewrites this
 * constant whenever it copies a freshly packaged VSIX into `web/public`, so the
 * advertised version can never get ahead of the downloadable artifact.
 */

/** Semantic version of the VSIX currently served at {@link EXTENSION_VSIX_PATH}. */
export const LATEST_EXTENSION_VERSION = "0.2.2";

/** Stable, same-origin path of the VSIX download endpoint. */
export const EXTENSION_VSIX_PATH = "/vsix";
