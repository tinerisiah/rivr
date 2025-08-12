import "dotenv/config";

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import WebSocket from "ws";
import * as schema from "@repo/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Enable WebSocket transport so transactions are supported with Neon
neonConfig.webSocketConstructor = WebSocket as unknown as typeof WebSocket;
neonConfig.useSecureWebSocket = process.env.NODE_ENV !== "development";

// Use Pool with neon-serverless (transaction support)
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });

export * from "@repo/schema";
