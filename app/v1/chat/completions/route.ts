import { relayChat } from "../../../api/gateway";
export const dynamic = "force-dynamic";
export async function POST(request:Request){return relayChat(request)}
