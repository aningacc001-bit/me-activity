import test from "node:test";
import assert from "node:assert/strict";
import { dailySubscriptionExpiry, reportOrderAmount, verifyPayment } from "../src/payments/verify.mjs";

const order={networkId:"mechain_400-1",recipient:"me1merchant",amountRaw:"1000000",status:"pending",expiresAt:5000};
const payment={networkId:"mechain_400-1",recipient:"ME1MERCHANT",amountRaw:"1000000",code:0,status:"confirmed",confirmations:2,txHash:"tx1",blockHash:"block1"};

test("correct confirmed payment is accepted exactly once", () => {
  assert.deepEqual(verifyPayment({payment,order,now:1000,requiredConfirmations:2}),{ok:true,txHash:"tx1",blockHash:"block1"});
  assert.equal(verifyPayment({payment,order,now:1000,alreadyProcessed:true}).reason,"duplicate_payment");
});

test("wrong amount, recipient, network and failed transfers are rejected", () => {
  assert.equal(verifyPayment({payment:{...payment,amountRaw:"999"},order,now:1000}).reason,"wrong_amount");
  assert.equal(verifyPayment({payment:{...payment,recipient:"me1wrong"},order,now:1000}).reason,"wrong_recipient");
  assert.equal(verifyPayment({payment:{...payment,networkId:"other"},order,now:1000}).reason,"wrong_network");
  assert.equal(verifyPayment({payment:{...payment,code:2},order,now:1000}).reason,"unconfirmed_or_failed");
});

test("expired and incomplete orders cannot grant entitlements", () => {
  assert.equal(verifyPayment({payment,order,now:5000}).reason,"expired_order");
  assert.equal(verifyPayment({payment,order:{...order,recipient:""},now:1000}).reason,"missing_recipient");
  assert.equal(verifyPayment({payment:{...payment,confirmations:0},order,now:1000}).reason,"unconfirmed_or_failed");
});

test("daily entitlement expires 24 hours after chain confirmation", () => {
  assert.equal(dailySubscriptionExpiry("2026-11-09T12:00:00.000Z").toISOString(),"2026-11-10T12:00:00.000Z");
  assert.throws(()=>dailySubscriptionExpiry("invalid"),/Invalid/);
});

test("report price is exactly 0.01 MEC but remains disabled", () => {
  assert.deepEqual(reportOrderAmount(),{display:"0.01 MEC",raw:null,enabled:false,reason:"MEC base-unit precision and payment destination are not yet verified"});
});
