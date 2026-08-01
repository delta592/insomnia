import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

export interface AsapAuthHeaderConfig {
  privateKey: string;
  issuer: string;
  keyId: string;
  audience: string;
  subject?: string;
  additionalClaims?: Record<string, unknown>;
  tokenExpiryMs?: number;
  tokenMaxAgeMs?: number;
}

function assertDefined(value: unknown, message: string): asserts value {
  if (value === undefined || value === null || value === '') {
    throw new Error(message);
  }
}

export function createAsapAuthHeaderGenerator(jwtConfig: AsapAuthHeaderConfig) {
  assertDefined(jwtConfig.privateKey, 'jwtConfig.privateKey must be set');
  assertDefined(jwtConfig.keyId, 'jwtConfig.keyId must be set');
  assertDefined(jwtConfig.issuer, 'jwtConfig.issuer must be set');
  assertDefined(jwtConfig.audience, 'jwtConfig.audience must be set');

  const privateKey = jwtConfig.privateKey.replace(/\\n/g, '\n').replace(/"/g, '');

  // The max age is less than the expiry so that we don't ever reuse a nearly expired token
  const tokenExpiryMs = jwtConfig.tokenExpiryMs ?? 10 * 60 * 1000;
  const tokenMaxAgeMs = jwtConfig.tokenMaxAgeMs ?? 9 * 60 * 1000;
  const additionalClaims = jwtConfig.additionalClaims ?? {};

  let lastUpdated = 0;
  let authHeader: string;

  const isExpired = (now: number) => now - lastUpdated > tokenMaxAgeMs;

  const generateStandardClaims = (now: number) => ({
    aud: jwtConfig.audience,
    iss: jwtConfig.issuer,
    sub: jwtConfig.subject || jwtConfig.issuer,
    iat: Math.floor(now / 1000),
    nbf: Math.floor(now / 1000),
    exp: Math.floor((now + tokenExpiryMs) / 1000),
    jti: crypto.randomBytes(20).toString('hex'),
  });

  const getOrGenerateAuthHeader = () => {
    const now = Date.now();
    if (!isExpired(now)) {
      return authHeader;
    }

    const claims = { ...generateStandardClaims(now), ...additionalClaims };
    authHeader = `Bearer ${jwt.sign(claims, privateKey, {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        kid: jwtConfig.keyId,
      },
    })}`;
    lastUpdated = now;
    return authHeader;
  };

  // Fail if we cannot generate an auth header
  getOrGenerateAuthHeader();

  return getOrGenerateAuthHeader;
}
