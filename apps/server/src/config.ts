export interface ServerConfig {
  port: number;
  databaseUrl: string;
  sessionPepper: string;
  sessionTtlSeconds: number;
  tossVerifyUrl: string;
  tossApiBaseUrl?: string;
  tossMtlsCertPath: string;
  tossMtlsKeyPath: string;
  tossMtlsCaPath?: string;
  tossRequestTimeoutMs?: number;
  tossRequestMaxRetries?: number;
  /**
   * CLIENT_TEST trusts the client-side userEarnedReward event and must never be
   * used as proof for production point rewards. The safe default is DISABLED.
   */
  adRewardMode?: 'DISABLED' | 'CLIENT_TEST';
  adAttemptTtlSeconds?: number;
  adAttemptMinimumSeconds?: number;
}

export const SERVER_CONFIG = Symbol('SERVER_CONFIG');

export function loadServerConfig(environment = process.env): ServerConfig {
  const sessionPepper = requireValue(environment, 'SESSION_PEPPER');
  if (sessionPepper.length < 32) {
    throw new Error('SESSION_PEPPER must be at least 32 characters.');
  }

  const sessionTtlSeconds = Number(environment.SESSION_TTL_SECONDS ?? '3600');
  if (!Number.isInteger(sessionTtlSeconds) || sessionTtlSeconds < 60) {
    throw new Error('SESSION_TTL_SECONDS must be an integer of at least 60.');
  }

  return {
    port: Number(environment.PORT ?? '3000'),
    databaseUrl: requireValue(environment, 'DATABASE_URL'),
    sessionPepper,
    sessionTtlSeconds,
    tossApiBaseUrl: optionalHttpsUrl(
      environment,
      'TOSS_API_BASE_URL',
      'https://apps-in-toss-api.toss.im',
    ),
    tossVerifyUrl: optionalHttpsUrl(
      environment,
      'TOSS_GAME_VERIFY_URL',
      'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/users/anon-key/verify',
    ),
    tossMtlsCertPath: requireValue(environment, 'TOSS_MTLS_CERT_PATH'),
    tossMtlsKeyPath: requireValue(environment, 'TOSS_MTLS_KEY_PATH'),
    tossMtlsCaPath: optionalValue(environment, 'TOSS_MTLS_CA_PATH'),
    tossRequestTimeoutMs: requireInteger(
      environment,
      'TOSS_REQUEST_TIMEOUT_MS',
      5_000,
      100,
      30_000,
    ),
    tossRequestMaxRetries: requireInteger(
      environment,
      'TOSS_REQUEST_MAX_RETRIES',
      1,
      0,
      3,
    ),
    adRewardMode: parseAdRewardMode(
      environment.AD_REWARD_MODE,
      environment.NODE_ENV,
    ),
    adAttemptTtlSeconds: requireInteger(
      environment,
      'AD_ATTEMPT_TTL_SECONDS',
      600,
      30,
      3600,
    ),
    adAttemptMinimumSeconds: requireInteger(
      environment,
      'AD_ATTEMPT_MINIMUM_SECONDS',
      5,
      0,
      300,
    ),
  };
}

function parseAdRewardMode(
  value: string | undefined,
  nodeEnvironment: string | undefined,
): 'DISABLED' | 'CLIENT_TEST' {
  const mode = value?.trim() || 'DISABLED';
  if (mode !== 'DISABLED' && mode !== 'CLIENT_TEST') {
    throw new Error('AD_REWARD_MODE must be DISABLED or CLIENT_TEST.');
  }
  if (mode === 'CLIENT_TEST' && nodeEnvironment === 'production') {
    throw new Error('AD_REWARD_MODE=CLIENT_TEST is forbidden in production.');
  }
  return mode;
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function optionalValue(
  environment: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  return environment[name]?.trim() || undefined;
}

function optionalHttpsUrl(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: string,
): string {
  const value = optionalValue(environment, name) ?? fallback;
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new Error(`${name} must use HTTPS.`);
  return parsed.toString();
}

function requireInteger(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = Number(environment[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(
      `${name} must be an integer from ${minimum} to ${maximum}.`,
    );
  }
  return value;
}
