export type QuotaRule={id:string;name:string;windowSeconds:number;requestLimit:number|null;tokenLimit:number|null};
export type QuotaUsage={requests:number;tokens:number};

export function quotaExceeded(rule:QuotaRule,usage:QuotaUsage,nextTokens=0){
  if(rule.requestLimit!=null&&usage.requests+1>rule.requestLimit)return {code:"WINDOW_REQUEST_LIMIT",message:`${rule.name}：请求额度 ${usage.requests}/${rule.requestLimit}，本次请求将超限`};
  if(rule.tokenLimit!=null&&usage.tokens+nextTokens>rule.tokenLimit)return {code:"WINDOW_TOKEN_LIMIT",message:`${rule.name}：Token 额度 ${usage.tokens}/${rule.tokenLimit}，本次预计 ${nextTokens} Token 将超限`};
  return null;
}

export function windowLabel(seconds:number){
  if(seconds===3600)return "近 1 小时";
  if(seconds===18000)return "近 5 小时";
  if(seconds===604800)return "近 1 周";
  if(seconds===2592000)return "近 30 天";
  return `近 ${seconds} 秒`;
}
