/**
 * `POST /api/auth/device/approve` — browser-side approval of a device flow.
 *
 * After a developer signs in (Google/GitHub in production, a local test account
 * via credentials in local/mock mode), the `/activate` page calls this endpoint
 * to approve (or deny) the pending Device Authorization Grant identified by its
 * short `userCode`. The approver identity is resolved **server-side** from the
 * NextAuth session — never trusted from the request body — and handed to the
 * composition-root {@link AuthProvider.approveDeviceByUserCode}, which mints the
 * `Device_Auth_Token` the CLI/extension is polling for.
 *
 * Responses:
 *   - `401 { error: "not_authenticated" }` — no browser session (R4: the user
 *     must authenticate before approving a device).
 *   - `400 { error: "invalid_request" }` — malformed body / missing `userCode`
 *     / unrecognized `decision`.
 *   - `404 { error: "unknown_user_code" }` — the code is unknown or expired.
 *   - `200 { approved: true }` — device approved, token minted.
 *   - `200 { approved: false }` — device denied by the user.
 */

import { getContainer } from "@/server/container";
import { grantSignupBonus } from "@/server/signup-bonus-service";
import { auth } from "@/server/adapters/auth/nextauth-config";

/** Always evaluate at request time; approval mutates in-flight device state. */
export const dynamic = "force-dynamic";

/** Minimal shape we read from the JSON body. */
interface ApproveRequestBody {
  userCode?: unknown;
  decision?: unknown;
}

export async function POST(request: Request): Promise<Response> {
  // 1. Require an authenticated browser session; derive the approver identity
  //    from it so a client can never approve as someone else.
  const session = await auth();
  const userId =
    session?.user && typeof (session.user as { id?: unknown }).id === "string"
      ? (session.user as { id: string }).id
      : null;
  if (userId === null) {
    return Response.json({ error: "not_authenticated" }, { status: 401 });
  }

  // 2. Parse + validate the body.
  let body: ApproveRequestBody;
  try {
    body = (await request.json()) as ApproveRequestBody;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const userCode = body?.userCode;
  const decision = body?.decision;
  if (
    typeof userCode !== "string" ||
    userCode.trim().length === 0 ||
    (decision !== "approve" && decision !== "deny")
  ) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  // 3. Delegate to the composition-root auth provider.
  const container = getContainer();
  const { auth: authProvider } = container;
  const email =
    typeof session?.user?.email === "string" ? session.user.email : undefined;

  try {
    if (decision === "deny") {
      await authProvider.denyDeviceByUserCode(userCode.trim());
      return Response.json({ approved: false }, { status: 200 });
    }
    await grantSignupBonus(
      { ledger: container.ledger, users: container.users },
      userId,
    );
    await authProvider.approveDeviceByUserCode(userCode.trim(), {
      userId,
      email,
    });
    return Response.json({ approved: true }, { status: 200 });
  } catch {
    // The provider throws for an unknown/expired user code.
    return Response.json({ error: "unknown_user_code" }, { status: 404 });
  }
}
