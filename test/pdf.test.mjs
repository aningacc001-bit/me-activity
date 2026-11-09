import test from "node:test";
import assert from "node:assert/strict";
import { financialReportPdf } from "../src/reports/pdf.mjs";

test("financial PDF includes the metadata and report coverage",()=>{
  const pdf=financialReportPdf({meIdReference:"ME ID masked",verificationDate:"2026-01-01",wallets:["me1abc"],networks:["mechain_400-1"],period:"All time",coverageStatus:"partial",coverageNote:"Incomplete scan",transactionCount:2,generatedAt:"2026-02-01",receivedTotals:[["MEC","12"]],sentTotals:[["MEC","3"]],rewardSummary:"1",stakingSummary:"0"});
  assert.equal(pdf.subarray(0,8).toString("ascii"),"%PDF-1.4");
  assert.match(pdf.toString("ascii"),/%%EOF/);
  assert.match(pdf.toString("ascii"),/Incomplete scan/);
});
