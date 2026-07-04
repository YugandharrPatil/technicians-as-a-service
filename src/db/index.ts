import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.DB_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

export const client = createClient({
	url: databaseUrl,
	authToken: databaseUrl.startsWith("file:") ? undefined : authToken,
});

export const db = drizzle(client, { schema });
