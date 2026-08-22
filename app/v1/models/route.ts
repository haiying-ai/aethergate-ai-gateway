import { and, eq } from "drizzle-orm";
import { authenticate, gatewayEnabled } from "../../api/gateway";
import { getDb } from "../../../db";
import { publicModels } from "../../../db/schema";
export const dynamic="force-dynamic";
export async function GET(request:Request){if(!await gatewayEnabled())return Response.json({error:{message:"Gateway is stopped"}},{status:503});if(!await authenticate(request))return Response.json({error:{message:"Invalid API key"}},{status:401});const rows=await getDb().select({id:publicModels.name}).from(publicModels).where(and(eq(publicModels.status,"enabled")));return Response.json({object:"list",data:rows.map(r=>({id:r.id,object:"model",owned_by:"new-api-sites"}))})}
