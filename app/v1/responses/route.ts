import { relayResponses } from "../../api/gateway";
export const dynamic="force-dynamic";
export async function POST(request:Request){return relayResponses(request)}
