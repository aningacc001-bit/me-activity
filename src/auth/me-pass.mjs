import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export function createAuthorizationTransaction() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return {
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    verifier,
    challenge,
  };
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Claims must come from a signature-verified OIDC validator, never an untrusted decoded JWT.
export function validateVerifiedClaims(claims, expected, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!claims || claims.iss !== expected.issuer) throw new Error("Invalid identity issuer");
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expected.audience)) throw new Error("Invalid identity audience");
  if (!Number.isInteger(claims.exp) || claims.exp <= nowSeconds) throw new Error("Expired identity token");
  if (!constantTimeEqual(claims.nonce, expected.nonce)) throw new Error("Invalid identity nonce");
  return claims;
}

export class MePassAdapter {
  async begin() {
    const error = new Error("ME PASS partner authorization is unavailable until its API origin, app registration, authorization handoff, and security contract are verified and implemented");
    error.statusCode = 503;
    throw error;
  }
}

export class SessionRegistry {
  #sessions = new Map();

  create(session) {
    this.#sessions.set(session.id, { ...session, revokedAt: null });
  }

  get(id, now = Date.now()) {
    const session = this.#sessions.get(id);
    if (!session || session.revokedAt || session.expiresAt <= now) return null;
    return session;
  }

  revoke(id, now = Date.now()) {
    const session = this.#sessions.get(id);
    if (session) session.revokedAt = now;
  }
}

export function isOwnershipVerified(proof) {
  return Boolean(proof && proof.verified === true && ["me_pass", "signature", "on_chain_binding"].includes(proof.method));
}
