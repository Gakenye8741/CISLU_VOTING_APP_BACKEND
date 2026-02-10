// // Imports
// import "dotenv/config"
// import { drizzle } from "drizzle-orm/node-postgres"
// import { Client } from "pg"
// import * as schema from "../drizzle/schema"

// // define Client
// export const client =new Client({
//     connectionString: process.env.DATABASE_URL as string,
// })

// // establish connection
// const main = async ()=>{
//    await client.connect()
// }
// // Catch the errors
// main().catch(console.error);

// const db = drizzle(client, {schema,logger: true});

// export default db;
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // if needed by Neon, often required
  },
});

const db = drizzle(pool, { schema, logger: true });

export default db;