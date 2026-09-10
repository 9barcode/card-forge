import { createServerDatabase } from '../_shared/database.ts';
import { createAccessToken, digestAccessToken, hmacSha256 } from '../_shared/crypto.ts';
import { json } from '../_shared/http.ts';

type UserRow = {
  user_id: number;
  display_name: string;
  account_status: string;
  created_at: string;
  last_signed_in_at: string;
  is_new_user?: boolean;
};

export async function handleMembership(request: Request, path: string): Promise<Response | null> {
  if (request.method === 'POST' && path.endsWith('/api/v1/user-sessions')) {
    return initializeSession(request);
  }
  if (request.method === 'GET' && path.endsWith('/api/v1/users/me')) {
    return getCurrentUser(request);
  }
  if (request.method === 'PATCH' && path.endsWith('/api/v1/users/me')) {
    return updateCurrentUser(request);
  }
  if (request.method === 'DELETE' && path.endsWith('/api/v1/user-sessions/current')) {
    return revokeCurrentSession(request);
  }
  return null;
}

async function initializeSession(request: Request): Promise<Response> {
  const body = await readJson(request);
  const tossGameUserHash = body?.tossGameUserHash;
  if (typeof tossGameUserHash !== 'string' || tossGameUserHash.length < 16 || tossGameUserHash.length > 4096) {
    return json({ code: 'INVALID_USER_HASH' }, 400);
  }

  const verifiedUserKey = await verifyTossUserHash(tossGameUserHash);
  const pepper = requireSecret('SESSION_PEPPER');
  const accessToken = createAccessToken();
  const tossDigest = await hmacSha256(`toss:${verifiedUserKey}`, pepper);
  const tokenDigest = await digestAccessToken(accessToken, pepper);
  const ttlSeconds = readSessionTtl();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const database = createServerDatabase();
  const { data, error } = await database.rpc('initialize_user_session', {
    p_toss_user_digest: tossDigest,
    p_token_digest: tokenDigest,
    p_expires_at: expiresAt,
  });
  if (error) throw new Error('SESSION_INITIALIZATION_FAILED');
  const user = firstRow(data);
  return json({ accessToken, user: profile(user), isNewUser: user.is_new_user === true });
}

async function getCurrentUser(request: Request): Promise<Response> {
  const user = await findUserByRequest(request);
  return user ? json(profile(user)) : json({ code: 'INVALID_OR_EXPIRED_SESSION' }, 401);
}

async function updateCurrentUser(request: Request): Promise<Response> {
  const displayName = (await readJson(request))?.displayName;
  if (typeof displayName !== 'string') return json({ code: 'INVALID_DISPLAY_NAME' }, 400);
  const normalized = displayName.normalize('NFC').trim();
  if (!isValidDisplayName(normalized)) return json({ code: 'INVALID_DISPLAY_NAME' }, 400);
  const tokenDigest = await tokenDigestFromRequest(request);
  const database = createServerDatabase();
  const { data, error } = await database.rpc('update_user_display_name', {
    p_token_digest: tokenDigest,
    p_display_name: normalized,
  });
  if (error) throw new Error('USER_UPDATE_FAILED');
  const user = optionalFirstRow(data);
  return user ? json(profile(user)) : json({ code: 'INVALID_OR_EXPIRED_SESSION' }, 401);
}

async function revokeCurrentSession(request: Request): Promise<Response> {
  const tokenDigest = await tokenDigestFromRequest(request);
  const database = createServerDatabase();
  const { data, error } = await database.rpc('revoke_user_session', {
    p_token_digest: tokenDigest,
  });
  if (error) throw new Error('SESSION_REVOCATION_FAILED');
  return data === true
    ? new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
    : json({ code: 'INVALID_OR_EXPIRED_SESSION' }, 401);
}

async function findUserByRequest(request: Request): Promise<UserRow | null> {
  const database = createServerDatabase();
  const { data, error } = await database.rpc('find_user_by_session', {
    p_token_digest: await tokenDigestFromRequest(request),
  });
  if (error) throw new Error('SESSION_LOOKUP_FAILED');
  return optionalFirstRow(data);
}

async function tokenDigestFromRequest(request: Request): Promise<string> {
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(request.headers.get('authorization') ?? '');
  if (!match?.[1]) throw new ApiError(401, 'INVALID_AUTHORIZATION_HEADER');
  return digestAccessToken(match[1], requireSecret('SESSION_PEPPER'));
}

async function verifyTossUserHash(value: string): Promise<string> {
  const url = Deno.env.get('TOSS_USER_VERIFICATION_URL');
  if (!url) throw new ApiError(503, 'TOSS_VERIFICATION_NOT_CONFIGURED');
  const response = await fetch(url, { method: 'POST', headers: { 'x-anon-key': value } });
  if (!response.ok) throw new ApiError(401, 'TOSS_USER_VERIFICATION_FAILED');
  const result = await response.json() as { resultType?: unknown; success?: unknown };
  if (result.resultType !== 'SUCCESS' || (result.success !== true && result.success !== 'true')) {
    throw new ApiError(401, 'TOSS_USER_VERIFICATION_FAILED');
  }
  return value;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) return json({ code: error.code }, error.status);
  return json({ code: 'INTERNAL_SERVER_ERROR' }, 500);
}

class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

function requireSecret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new ApiError(503, `${name}_NOT_CONFIGURED`);
  return value;
}

function readSessionTtl(): number {
  const value = Number(Deno.env.get('SESSION_TTL_SECONDS') ?? '86400');
  if (!Number.isSafeInteger(value) || value < 300 || value > 2_592_000) {
    throw new ApiError(503, 'INVALID_SESSION_TTL');
  }
  return value;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}

function firstRow(value: unknown): UserRow {
  const row = optionalFirstRow(value);
  if (!row) throw new Error('INVALID_DATABASE_RESPONSE');
  return row;
}

function optionalFirstRow(value: unknown): UserRow | null {
  return Array.isArray(value) && value.length > 0 ? value[0] as UserRow : null;
}

function profile(user: UserRow) {
  return {
    userId: String(user.user_id),
    displayName: user.display_name,
    accountStatus: user.account_status,
    createdAt: user.created_at,
    lastSignedInAt: user.last_signed_in_at,
  };
}

function isValidDisplayName(value: string): boolean {
  return value.length >= 2 && value.length <= 12 && !/[\u200B\u200C\u200D\uFEFF]/u.test(value);
}
