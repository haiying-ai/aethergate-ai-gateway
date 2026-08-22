import assert from "node:assert/strict";
import test from "node:test";
import { billableUsage, consumeSseUsage, tokenUsage } from "../app/api/usage-metering.ts";

test("normalizes Chat and Responses usage fields",()=>{
  assert.deepEqual(tokenUsage({prompt_tokens:12,completion_tokens:5}),{inputTokens:12,outputTokens:5});
  assert.deepEqual(tokenUsage({usage:{input_tokens:20,output_tokens:8}}),{inputTokens:20,outputTokens:8});
});

test("extracts usage when an SSE JSON line spans chunks",()=>{
  const first=consumeSseUsage('data: {"choices":[],"usa',"");
  const second=consumeSseUsage('ge":{"prompt_tokens":30,"completion_tokens":9}}\n\n',first.carry);
  assert.deepEqual(second.usage,{inputTokens:30,outputTokens:9});
});

test("uses an input estimate when a stream omits usage",()=>{
  assert.deepEqual(billableUsage(null,77),{inputTokens:77,outputTokens:0});
});
