/**
 * `GET /vsix` — one-line install endpoint for the SpinShare editor extension.
 *
 * Powers the marketing homepage install command:
 *
 *   curl -L https://spinshare.dev/vsix -o spinshare.vsix \
 *     && code --install-extension spinshare.vsix
 *
 * The packaged `.vsix` lives in `web/public/spinshare.vsix` so it is always
 * served as a static asset by the CDN. This route 308-redirects to that asset
 * (curl's `-L` and browsers both follow it) which keeps the public download URL
 * stable and decoupled from the bundled extension version. After the editor
 * installs and activates the extension, `onStartupFinished` runs
 * `ensureAuthenticated`, prompting the developer to sign up / sign in so
 * impressions are credited to their account.
 */

const VSIX_ASSET_PATH = "/spinshare.vsix";

export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const target = new URL(VSIX_ASSET_PATH, request.url);

  return new Response(null, {
    status: 308,
    headers: {
      Location: target.toString(),
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
