import { createServerDatabase } from '../_shared/database.ts';
import { createSessionToken, hmacSha256, verifySessionToken } from '../_shared/crypto.ts';
import { json } from '../_shared/http.ts';

type GameUserRow = { user_id: number; is_new_user?: boolean };

export async function handleMembership(request: Request, path: string): Promise<Response | null> {
  if (request.method === 'POST' && path.endsWith('/api/v1/user-sessions')) return initializeSession(request);
  if (request.method === 'GET' && path.endsWith('/api/v1/users/me')) return getCurrentUser(request);
  if (request.method === 'PATCH' && path.endsWith('/api/v1/users/me')) {
    return json({ code: 'PROFILE_UPDATE_NOT_SUPPORTED' }, 501);
  }
  if (request.method === 'DELETE' && path.endsWith('/api/v1/user-sessions/current')) {
    await requireSessionUser(request);
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
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
  const hashId = await hmacSha256(`toss:${verifiedUserKey}`, pepper);
  const database = createServerDatabase();
  const { data, error } = await database.rpc('initialize_game_user', {
    p_toss_user_digest: hashId,
  });
  if (error) throw new Error('USER_INITIALIZATION_FAILED');
  const user = firstRow(data);
  const accessToken = await createSessionToken(String(user.user_id), readSessionTtl(), pepper);
  return json({
    accessToken,
    user: profile(String(user.user_id)),
    isNewUser: user.is_new_user === true,
  });
}

async function getCurrentUser(request: Request): Promise<Response> {
  const userId = await requireSessionUser(request);
  return json(profile(userId));
}

export async function requireSessionUser(request: Request): Promise<string> {
  const match = /^Bearer (v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(
    request.headers.get('authorization') ?? '',
  );
  if (!match?.[1]) throw new ApiError(401, 'INVALID_AUTHORIZATION_HEADER');
  const session = await verifySessionToken(match[1], requireSecret('SESSION_PEPPER'));
  if (!session) throw new ApiError(401, 'INVALID_OR_EXPIRED_SESSION');
  const database = createServerDatabase();
  const { data, error } = await database.rpc('find_game_user', {
    p_user_id: session.userId,
  });
  if (error) throw new Error('USER_LOOKUP_FAILED');
  if (!optionalFirstRow(data)) throw new ApiError(401, 'INVALID_OR_EXPIRED_SESSION');
  return session.userId;
}

async function verifyTossUserHash(value: string): Promise<string> {
  const url = Deno.env.get('TOSS_USER_VERIFICATION_URL');
  const verificationRequired = Deno.env.get('TOSS_USER_VERIFICATION_REQUIRED') === 'true';
  // getUserKeyForGame()의 식별키만으로도 게임 데이터를 구분할 수 있다.
  // mTLS 검증 URL은 발급 후 설정하며, 설정된 환경에서만 추가 검증한다.
  if (!url) {
    if (verificationRequired) throw new ApiError(503, 'TOSS_VERIFICATION_NOT_CONFIGURED');
    return value;
  }
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
  const value = Number(Deno.env.get('SESSION_TTL_SECONDS') ?? '3600');
  if (!Number.isSafeInteger(value) || value < 300 || value > 86_400) {
    throw new ApiError(503, 'INVALID_SESSION_TTL');
  }
  return value;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch { return null; }
}

function firstRow(value: unknown): GameUserRow {
  const row = optionalFirstRow(value);
  if (!row) throw new Error('INVALID_DATABASE_RESPONSE');
  return row;
}

function optionalFirstRow(value: unknown): GameUserRow | null {
  return Array.isArray(value) && value.length > 0 ? value[0] as GameUserRow : null;
}

function profile(userId: string) {
  const unavailableTimestamp = '1970-01-01T00:00:00.000Z';
  return {
    userId,
    displayName: '모험가',
    accountStatus: 'ACTIVE',
    createdAt: unavailableTimestamp,
    lastSignedInAt: unavailableTimestamp,
  };
}
