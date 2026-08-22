export type TokenUsage={inputTokens:number;outputTokens:number};

export function tokenUsage(value:unknown):TokenUsage|null{
  if(!value||typeof value!=="object")return null;
  const row=value as Record<string,unknown>;
  const input=Number(row.prompt_tokens??row.input_tokens);
  const output=Number(row.completion_tokens??row.output_tokens);
  if(Number.isFinite(input)||Number.isFinite(output))return {inputTokens:Number.isFinite(input)?Math.max(0,input):0,outputTokens:Number.isFinite(output)?Math.max(0,output):0};
  if(row.usage){const nested=tokenUsage(row.usage);if(nested)return nested}
  if(row.response){const nested=tokenUsage(row.response);if(nested)return nested}
  return null;
}

export function consumeSseUsage(chunk:string,carry:string){
  const source=carry+chunk,lines=source.split(/\r?\n/),nextCarry=lines.pop()||"";let usage:TokenUsage|null=null;
  for(const line of lines){
    if(!line.startsWith("data:"))continue;
    const data=line.slice(5).trim();if(!data||data==="[DONE]")continue;
    try{usage=tokenUsage(JSON.parse(data))||usage}catch{}
  }
  return {carry:nextCarry,usage};
}

export function billableUsage(usage:TokenUsage|null,estimatedInput:number):TokenUsage{
  return usage||{inputTokens:Math.max(0,estimatedInput),outputTokens:0};
}
