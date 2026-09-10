const encoder = new TextEncoder();

export async function hmacSha256(value: string, pepper: string): Promise<string> {
  return toHex(await sign(value, pepper));
}

export async function createSessionToken(
  userId: string,
  ttlSeconds: number,
  pepper: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = toBase64Url(
    encoder.encode(JSON.stringify({ sub: userId, iat: now, exp: now + ttlSeconds })),
  );
  const signature = toBase64Url(await sign(`v1.${payload}`, pepper));
  return `v1.${payload}.${signature}`;
}

export async function verifySessionToken(
  token: string,
  pepper: string,
): Promise<{ userId: string; issuedAt: number } | null> {
  const match = /^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(token);
  if (!match?.[1] || !match[2]) return null;
  const key = await importKey(pepper, ['verify']);
  const valid = await crypto.subtle.verify(
    'HMAC', key, fromBase64Url(match[2]), encoder.encode(`v1.${match[1]}`),
  );
  if (!valid) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(match[1]))) as {
      sub?: unknown; iat?: unknown; exp?: unknown;
    };
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== 'string' || !/^\d+$/.test(payload.sub) ||
      typeof payload.iat !== 'number' || typeof payload.exp !== 'number' ||
      !Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) ||
      payload.iat > now + 60 || payload.exp <= now
    ) return null;
    return { userId: payload.sub, issuedAt: payload.iat };
  } catch { return null; }
}

async function sign(value: string, pepper: string): Promise<Uint8Array> {
  const key = await importKey(pepper, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function importKey(pepper: string, usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw', encoder.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, usages,
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
