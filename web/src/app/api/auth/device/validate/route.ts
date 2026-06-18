import { getContainer } from "@/server/container";

/** Always evaluate at request time; token validity is dynamic. */
export const dynamic = "force-dynamic";

const BEARER_PREFIX = "Bearer ";

function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

export async function GET(request: Request): Promise<Response> {
  const token = extractBearerToken(request);
  if (token === null) {
    return Response.json({ valid: false }, { status: 401 });
  }

  const claims = await getContainer().auth.validateToken(token).catch(() => null);
  if (claims === null) {
    return Response.json({ valid: false }, { status: 401 });
  }

  return Response.json({ valid: true }, { status: 200 });
}
