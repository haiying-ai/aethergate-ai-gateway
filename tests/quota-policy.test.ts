import test from "node:test";
import assert from "node:assert/strict";
import {quotaExceeded} from "../app/api/quota.ts";

const rule=(overrides:Partial<Parameters<typeof quotaExceeded>[0]>={})=>({id:"r1",name:"5 小时保护",windowSeconds:18000,requestLimit:10,tokenLimit:1000,...overrides});

test("请求次数达到窗口上限时拒绝下一次调用",()=>{
  const result=quotaExceeded(rule(),{requests:10,tokens:100},50);
  assert.equal(result?.code,"WINDOW_REQUEST_LIMIT");
});

test("预计 Token 会使窗口额度超限时提前拒绝",()=>{
  const result=quotaExceeded(rule(),{requests:2,tokens:950},51);
  assert.equal(result?.code,"WINDOW_TOKEN_LIMIT");
});

test("仍有余量时允许调用",()=>{
  assert.equal(quotaExceeded(rule(),{requests:2,tokens:500},100),null);
});

test("只设置一种额度时另一种不参与限制",()=>{
  assert.equal(quotaExceeded(rule({requestLimit:null}),{requests:999,tokens:500},100),null);
});
