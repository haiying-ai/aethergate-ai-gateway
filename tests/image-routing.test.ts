import assert from "node:assert/strict";
import test from "node:test";
import { capabilityRouteModel, hasImageInput, imageCapableUpstreamModel } from "../app/api/image-input.ts";

test("detects OpenAI Chat Completions image_url input", () => {
  assert.equal(hasImageInput([{role:"user",content:[{type:"text",text:"describe"},{type:"image_url",image_url:{url:"data:image/png;base64,AA=="}}]}]), true);
});

test("detects Responses input_image input", () => {
  assert.equal(hasImageInput([{role:"user",content:[{type:"input_image",image_url:"https://example.com/a.png"}]}]), true);
});

test("does not classify text-only messages as image input", () => {
  assert.equal(hasImageInput([{role:"user",content:"hello"}]), false);
});

test("maps the Agent Plan image alias to the multimodal model version",()=>{
  assert.equal(imageCapableUpstreamModel("deepseek-v4-flash",true),"deepseek-v4-flash-ga-260731");
  assert.equal(imageCapableUpstreamModel("deepseek-v4-flash",false),"deepseek-v4-flash");
});

test("routes DeepSeek image requests to the Agent Plan vision model",()=>{
  assert.equal(capabilityRouteModel("deepseek-v4-flash",true),"doubao-seed-2.0-lite");
  assert.equal(capabilityRouteModel("deepseek-v4-flash",false),"deepseek-v4-flash");
});
