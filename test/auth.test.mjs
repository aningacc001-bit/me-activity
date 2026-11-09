import test from "node:test";
import assert from "node:assert/strict";
import { createAuthorizationTransaction, isOwnershipVerified, MePassAdapter, SessionRegistry, validateVerifiedClaims } from "../src/auth/me-pass.mjs";

const claims = { iss:"https://identity.example", aud:"me-activity", exp:2000, nonce:"nonce-1", sub:"user-1" };
const expected = { issuer:claims.iss, audience:claims.aud, nonce:claims.nonce };

test("authorization transaction has independent state, nonce and PKCE values", () => {
  const a=createAuthorizationTransaction(); const b=createAuthorizationTransaction();
  assert.notEqual(a.state,b.state); assert.notEqual(a.nonce,b.nonce); assert.notEqual(a.verifier,b.verifier);
  assert.equal(a.challenge.length,43);
});

test("verified identity claims validate issuer, audience, expiry and nonce", () => {
  assert.equal(validateVerifiedClaims(claims,expected,1000).sub,"user-1");
  assert.throws(()=>validateVerifiedClaims({...claims,iss:"https://wrong"},expected,1000),/issuer/);
  assert.throws(()=>validateVerifiedClaims({...claims,aud:"other"},expected,1000),/audience/);
  assert.throws(()=>validateVerifiedClaims({...claims,exp:999},expected,1000),/Expired/);
  assert.throws(()=>validateVerifiedClaims({...claims,nonce:"wrong"},expected,1000),/nonce/);
});

test("adapter stays unavailable until the partner API contract is implemented", async () => {
  const adapter=new MePassAdapter({issuer:"https://identity.example",clientId:"me-activity",redirectUri:"https://app.example/callback",jwksUri:"https://identity.example/keys"});
  await assert.rejects(adapter.begin(), error=>error.statusCode===503 && /partner authorization/.test(error.message));
});

test("expired and revoked sessions are rejected", () => {
  const sessions=new SessionRegistry();
  sessions.create({id:"live",expiresAt:2000});
  sessions.create({id:"expired",expiresAt:500});
  assert.ok(sessions.get("live",1000));
  assert.equal(sessions.get("expired",1000),null);
  sessions.revoke("live",1200);
  assert.equal(sessions.get("live",1300),null);
});

test("wallet totals only accept explicit supported ownership proof", () => {
  assert.equal(isOwnershipVerified({verified:true,method:"me_pass"}),true);
  assert.equal(isOwnershipVerified({verified:true,method:"signature"}),true);
  assert.equal(isOwnershipVerified({verified:false,method:"signature"}),false);
  assert.equal(isOwnershipVerified({verified:true,method:"self_reported"}),false);
});
