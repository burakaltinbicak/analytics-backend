var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_fastify = __toESM(require("fastify"));
var import_dotenv2 = __toESM(require("dotenv"));

// src/db/index.ts
var import_serverless = require("@neondatabase/serverless");
var import_neon_http = require("drizzle-orm/neon-http");
var import_dotenv = __toESM(require("dotenv"));
import_dotenv.default.config();
var sql = (0, import_serverless.neon)(process.env.DATABASE_URL);
var db = (0, import_neon_http.drizzle)(sql);

// src/index.ts
var import_drizzle_orm = require("drizzle-orm");

// src/db/schema.ts
var import_pg_core = require("drizzle-orm/pg-core");
var websites = (0, import_pg_core.pgTable)("websites", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  domain: (0, import_pg_core.text)("domain").notNull(),
  created_at: (0, import_pg_core.timestamp)("created_at").notNull().defaultNow()
});
var sessions = (0, import_pg_core.pgTable)("sessions", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  website_id: (0, import_pg_core.uuid)("website_id").notNull().references(() => websites.id),
  referrer: (0, import_pg_core.text)("referrer"),
  language: (0, import_pg_core.text)("language"),
  screen: (0, import_pg_core.text)("screen")
});
var events = (0, import_pg_core.pgTable)("events", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  website_id: (0, import_pg_core.uuid)("website_id").notNull().references(() => websites.id),
  session_id: (0, import_pg_core.uuid)("session_id").notNull().references(() => sessions.id),
  eventname: (0, import_pg_core.text)("eventname").notNull(),
  url_path: (0, import_pg_core.text)("url_path").notNull()
});

// src/routes/websites.ts
var import_zod = require("zod");
var createWebsiteSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  domain: import_zod.z.string().min(1),
  created_at: import_zod.z.date().optional()
});
var websiteRoutes = async (app2) => {
  app2.post("/api/websites", async (request, reply) => {
    const body = createWebsiteSchema.parse(request.body);
    const result = await db.insert(websites).values({
      name: body.name,
      domain: body.domain
    }).returning();
    const website = result[0];
    return {
      id: website.id,
      name: website.name,
      domain: website.domain,
      script: `<script async src="http://localhost:5000/tracker.js" data-website-id="${website.id}" data-api-url="http://localhost:5000"></script>`
    };
  });
};

// src/index.ts
var import_static = __toESM(require("@fastify/static"));
var import_path = __toESM(require("path"));

// src/routes/topla.ts
var toplaRoutes = async (app2) => {
  app2.post("/api/topla", async (request, reply) => {
    const body = request.body;
    const session = await db.insert(sessions).values({
      website_id: body.website_id,
      referrer: body.referrer,
      language: body.language,
      screen: body.screen
    }).returning();
    await db.insert(events).values({
      website_id: body.website_id,
      session_id: session[0].id,
      eventname: body.event_name,
      url_path: body.url_path
    });
    return reply.code(200).send({ status: "ok" });
  });
};

// src/index.ts
var import_cors = __toESM(require("@fastify/cors"));
import_dotenv2.default.config();
var app = (0, import_fastify.default)();
app.get("/health", async () => {
  return { status: "ok" };
});
app.get("/db-test", async () => {
  const result = await db.execute(import_drizzle_orm.sql`SELECT 1`);
  return { status: "db ok" };
});
var start = async () => {
  try {
    await app.register(import_static.default, {
      root: import_path.default.join(process.cwd(), "public")
    });
    await app.register(import_cors.default, { origin: "*" });
    await app.register(websiteRoutes);
    await app.register(toplaRoutes);
    await app.listen({ port: Number(process.env.PORT) || 5e3 });
    console.log("Server 5000 portunda calisiyor");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
