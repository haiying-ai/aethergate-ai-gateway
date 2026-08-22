export function hasImageInput(value:unknown):boolean{
  if(Array.isArray(value))return value.some(hasImageInput);
  if(!value||typeof value!=="object")return false;
  const item=value as Record<string,unknown>;
  if(item.type==="image_url"||item.type==="input_image"||item.type==="image")return true;
  return Object.values(item).some(hasImageInput);
}

export function imageCapableUpstreamModel(model:string,requiresVision:boolean){
  if(requiresVision&&model==="deepseek-v4-flash")return "deepseek-v4-flash-ga-260731";
  return model;
}

export function capabilityRouteModel(model:string,requiresVision:boolean){
  if(requiresVision&&model==="deepseek-v4-flash")return "doubao-seed-2.0-lite";
  return model;
}
