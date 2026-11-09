import test from "node:test";
import assert from "node:assert/strict";
import { transactionsCsv } from "../src/reports/csv.mjs";

test("CSV quotes values and neutralizes spreadsheet formulas", () => {
  const csv=transactionsCsv([{timestamp:"2026-01-01",network:"test",wallet:"=1+1",category:"sent",asset:"MEC",amountRaw:"12",txHash:'a"b',status:"Success"}]);
  assert.match(csv,/'=1\+1/);
  assert.match(csv,/"a""b"/);
  assert.match(csv,/"amount_raw"/);
});
