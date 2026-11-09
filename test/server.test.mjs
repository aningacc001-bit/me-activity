import test from "node:test";
import assert from "node:assert/strict";
import { createAppServer } from "../src/server.mjs";

async function withServer(appConfig, run){
  const server=createAppServer({appConfig});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();
  try{return await run(`http://127.0.0.1:${address.port}`);}
  finally{await new Promise(resolve=>server.close(resolve));}
}
const config={nodeEnv:"development",demoMode:true,databaseUrl:"",paymentEnabled:false,reportPrice:"0.01",dailySubscriptionPrice:null};

test("health and demo overview are explicitly labelled",async()=>withServer(config,async base=>{
  const health=await fetch(`${base}/api/v1/health`).then(r=>r.json());
  assert.equal(health.demoMode,true);assert.equal(health.mePass,"unavailable");
  const overview=await fetch(`${base}/api/v1/me/overview`).then(r=>r.json());
  assert.equal(overview.demo,true);assert.equal(overview.data.profile.identityStatus,"demo");
}));

test("production-style routes fail closed when demo mode is off",async()=>withServer({...config,demoMode:false},async base=>{
  const profile=await fetch(`${base}/api/v1/me/profile`);
  assert.equal(profile.status,401);
  const connect=await fetch(`${base}/api/v1/me/identity/connect`,{method:"POST"});
  assert.equal(connect.status,503);
  const fixtures=await fetch(`${base}/demo-data.js`);
  assert.equal(fixtures.status,404);
}));

test("report preview is downloadable and pricing remains disabled",async()=>withServer(config,async base=>{
  const pricing=await fetch(`${base}/api/v1/me/pricing`).then(r=>r.json());
  assert.equal(pricing.report.amount,"0.01");assert.equal(pricing.report.enabled,false);
  const created=await fetch(`${base}/api/v1/me/reports`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({format:"csv"})});
  assert.equal(created.status,201);
  const report=await created.json();assert.equal(report.demo,true);
  const download=await fetch(`${base}${report.downloadUrl}`);
  assert.equal(download.status,200);assert.match(await download.text(),/sample_display_amount/);
}));

test("demo PDF report returns a valid PDF document",async()=>withServer(config,async base=>{
  const created=await fetch(`${base}/api/v1/me/reports`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({format:"pdf"})}).then(r=>r.json());
  const response=await fetch(`${base}${created.downloadUrl}`);
  assert.equal(response.headers.get("content-type"),"application/pdf");
  assert.equal((await response.arrayBuffer().then(buffer=>Buffer.from(buffer).toString("ascii",0,8))),"%PDF-1.4");
}));

test("static UI sets browser security headers",async()=>withServer(config,async base=>{
  const response=await fetch(base);
  assert.equal(response.status,200);
  assert.equal(response.headers.get("x-frame-options"),"DENY");
  assert.match(response.headers.get("content-security-policy"),/frame-ancestors 'none'/);
}));
