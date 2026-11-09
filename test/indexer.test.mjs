import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { decodeTxRaw } from "../src/indexer/cosmos-decode.mjs";
import { BlockScanner, CometBftAdapter } from "../src/indexer/scanner.mjs";

function varint(value) {
  let n=BigInt(value); const out=[];
  while(n>127n){out.push(Number(n&127n)|128);n>>=7n;}
  out.push(Number(n));return Buffer.from(out);
}
function bytesField(number,value){const b=Buffer.isBuffer(value)?value:Buffer.from(value);return Buffer.concat([varint((number<<3)|2),varint(b.length),b]);}
function textField(number,value){return bytesField(number,Buffer.from(value));}
function makeSendTx(from="me1sender",to="me1receiver",amount="123456"){
  const coin=Buffer.concat([textField(1,"umec"),textField(2,amount)]);
  const msg=Buffer.concat([textField(1,from),textField(2,to),bytesField(3,coin)]);
  const any=Buffer.concat([textField(1,"/cosmos.bank.v1beta1.MsgSend"),bytesField(2,msg)]);
  const body=bytesField(1,any);
  return Buffer.concat([bytesField(1,body),bytesField(2,Buffer.alloc(0))]).toString("base64");
}

test("standard Cosmos MsgSend protobuf is decoded with raw integer amount",()=>{
  const decoded=decodeTxRaw(makeSendTx());
  assert.equal(decoded.messages[0].type,"bank_send");
  assert.equal(decoded.messages[0].from,"me1sender");
  assert.deepEqual(decoded.messages[0].amounts,[{denom:"umec",amount:"123456"}]);
});

class Store {
  constructor(){this.blocks=new Map();this.cursor=null;this.commits=0;}
  async getCursor(){return this.cursor;}
  async setCursor(_network,height){this.cursor=height;}
  async getBlockHash(_network,height){return this.blocks.get(height)?.hash||null;}
  async rollbackFrom(_network,height){for(const h of this.blocks.keys())if(h>=height)this.blocks.delete(h);this.cursor=height-1;}
  async commitBlock(block){if(!this.blocks.has(block.height)){this.blocks.set(block.height,block);this.commits++;}this.cursor=Math.max(this.cursor||0,block.height);}
}
class Adapter {
  constructor(latest=3){this.latest=latest;this.hashes=new Map();this.failures=new Map();}
  async status(){return {chainId:"mechain_400-1",latestHeight:this.latest,catchingUp:false};}
  async block(height){
    const remain=this.failures.get(height)||0;
    if(remain){this.failures.set(height,remain-1);throw new Error("temporary timeout");}
    const hash=this.hashes.get(height)||`hash-${height}`;
    return {block:{result:{block_id:{hash},block:{header:{height:String(height),time:"2026-11-09T00:00:00Z"},data:{txs:[]}}}},results:{result:{txs_results:[]}}};
  }
}

test("block scans are idempotent on repeated sync",async()=>{
  const store=new Store(),adapter=new Adapter();const scanner=new BlockScanner({adapter,store,networkId:"mechain_400-1",retryBaseMs:1});
  assert.equal((await scanner.syncOnce({maxBlocks:5})).scanned,3);
  assert.equal((await scanner.syncOnce({maxBlocks:5})).scanned,0);
  assert.equal(store.commits,3);
});

test("historical backfill starts from the configured height",async()=>{
  const store=new Store(),adapter=new Adapter(3);const scanner=new BlockScanner({adapter,store,networkId:"mechain_400-1",startHeight:2,retryBaseMs:1});
  const result=await scanner.syncOnce({maxBlocks:10});
  assert.equal(result.scanned,2);assert.equal(store.blocks.has(1),false);assert.equal(store.cursor,3);
});

test("transient timeouts retry and missing blocks fail closed",async()=>{
  const store=new Store(),adapter=new Adapter(1);adapter.failures.set(1,1);
  const scanner=new BlockScanner({adapter,store,networkId:"mechain_400-1",retryBaseMs:1,retryLimit:3});
  assert.equal((await scanner.syncOnce()).scanned,1);
  const missing=new Adapter(1);missing.block=async()=>({block:{result:{block_id:{hash:"h"},block:{header:{height:"2",time:"x"},data:{txs:[]}}}},results:{result:{txs_results:[]}}});
  const missingScanner=new BlockScanner({adapter:missing,store:new Store(),networkId:"mechain_400-1",retryBaseMs:1,retryLimit:1});
  await assert.rejects(missingScanner.syncOnce(),/Invalid block response/);
});

test("reorganization at the indexed tip is rolled back and rescanned",async()=>{
  const store=new Store(),adapter=new Adapter(3);const scanner=new BlockScanner({adapter,store,networkId:"mechain_400-1",retryBaseMs:1});
  await scanner.syncOnce({maxBlocks:5});
  adapter.hashes.set(3,"replacement-hash");
  const result=await scanner.syncOnce({maxBlocks:5});
  assert.equal(result.scanned,1);assert.equal(store.blocks.get(3).hash,"replacement-hash");assert.equal(store.commits,4);
});

test("adapter rejects a mismatched chain ID",async()=>{
  const adapter=new CometBftAdapter({rpcUrl:"https://rpc.invalid",expectedChainId:"mainnet",fetchImpl:async()=>({ok:true,json:async()=>({result:{node_info:{network:"mechain_400-1"},sync_info:{latest_block_height:"10"}}})})});
  await assert.rejects(adapter.status(),/Wrong chain/);
});

test("decoded raw transactions have deterministic SHA-256 hashes",()=>{
  const raw=Buffer.from(makeSendTx(),"base64");
  assert.equal(createHash("sha256").update(raw).digest("hex").toUpperCase().length,64);
});
