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
var import_path = __toESM(require("path"));
var import_static = __toESM(require("@fastify/static"));

// src/db/index.ts
var import_serverless = require("@neondatabase/serverless");
var import_neon_http = require("drizzle-orm/neon-http");
var import_dotenv = __toESM(require("dotenv"));
import_dotenv.default.config();
var sql = (0, import_serverless.neon)(process.env.DATABASE_URL);
var db = (0, import_neon_http.drizzle)(sql);

// src/index.ts
var import_drizzle_orm2 = require("drizzle-orm");

// src/db/schema.ts
var import_pg_core = require("drizzle-orm/pg-core");
var websites = (0, import_pg_core.pgTable)("websites", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  name: (0, import_pg_core.text)("name").notNull(),
  domain: (0, import_pg_core.text)("domain").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var sessions = (0, import_pg_core.pgTable)("sessions", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  website_id: (0, import_pg_core.uuid)("website_id").notNull().references(() => websites.id),
  referrer: (0, import_pg_core.text)("referrer"),
  language: (0, import_pg_core.text)("language"),
  screen: (0, import_pg_core.text)("screen"),
  country: (0, import_pg_core.text)("country"),
  browser: (0, import_pg_core.text)("browser"),
  os: (0, import_pg_core.text)("os"),
  device: (0, import_pg_core.text)("device"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var events = (0, import_pg_core.pgTable)("events", {
  id: (0, import_pg_core.uuid)("id").defaultRandom().primaryKey(),
  website_id: (0, import_pg_core.uuid)("website_id").notNull().references(() => websites.id),
  session_id: (0, import_pg_core.uuid)("session_id").notNull().references(() => sessions.id),
  eventname: (0, import_pg_core.text)("eventname").notNull(),
  url_path: (0, import_pg_core.text)("url_path").notNull(),
  event_data: (0, import_pg_core.jsonb)("event_data"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});

// src/routes/websites.ts
var import_zod = require("zod");

// src/db/cache.ts
var websiteCache = /* @__PURE__ */ new Set();
var sessionCache = /* @__PURE__ */ new Set();

// src/routes/websites.ts
var createWebsiteSchema = import_zod.z.object({
  name: import_zod.z.string().min(1),
  domain: import_zod.z.string().min(1)
});
var websiteRoutes = async (app2) => {
  app2.post("/api/websites", async (request, reply) => {
    try {
      const body = createWebsiteSchema.parse(request.body);
      const result = await db.insert(websites).values({
        name: body.name,
        domain: body.domain
      }).returning();
      const website = result[0];
      websiteCache.add(website.id);
      return {
        id: website.id,
        name: website.name,
        domain: website.domain,
        script: `<script async src="http://localhost:5000/tracker.js" data-website-id="${website.id}" data-api-url="http://localhost:5000"></script>`
      };
    } catch (err) {
      return reply.code(400).send({ error: "ge\xE7ersiz veri." });
    }
  });
  app2.get("/api/websites", async (request, reply) => {
    const result = await db.select().from(websites);
    return result;
  });
};

// src/routes/topla.ts
var import_zod2 = require("zod");
var import_geoip_lite = __toESM(require("geoip-lite"));
var import_ua_parser_js = require("ua-parser-js");

// src/db/writeBuffer.ts
var buffer = [];
var FLUSH_INTERVAL = 2e3;
var FLUSH_SIZE = 500;
var addToBuffer = (event) => {
  buffer.push(event);
  if (buffer.length >= FLUSH_SIZE) flush();
};
var flush = async () => {
  if (buffer.length === 0) return;
  const toWrite = buffer.splice(0, buffer.length);
  try {
    await db.insert(events).values(toWrite);
  } catch (err) {
    console.error("Flush hatasi:", err);
  }
};
var startBuffer = () => {
  setInterval(flush, FLUSH_INTERVAL);
  console.log("Write buffer ba\u015Flatildi");
};

// src/routes/topla.ts
var toplaSchema = import_zod2.z.object({
  website_id: import_zod2.z.string().uuid(),
  session_id: import_zod2.z.string(),
  event_name: import_zod2.z.string().min(1),
  url_path: import_zod2.z.string().min(1),
  referrer: import_zod2.z.string().nullable().optional(),
  language: import_zod2.z.string().optional(),
  screen: import_zod2.z.string().optional(),
  user_agent: import_zod2.z.string().optional(),
  event_data: import_zod2.z.record(import_zod2.z.string(), import_zod2.z.any()).optional()
});
var toplaRoutes = async (app2) => {
  app2.post("/api/topla", async (request, reply) => {
    let body;
    try {
      body = toplaSchema.parse(request.body);
    } catch (err) {
      return reply.code(400).send({ error: "Ge\xE7ersiz veri" });
    }
    if (!websiteCache.has(body.website_id)) {
      return reply.code(404).send({ error: "Site bulunamad\u0131" });
    }
    const ip = request.ip;
    const geo = import_geoip_lite.default.lookup(ip);
    const country = geo?.country ?? null;
    const parser = new import_ua_parser_js.UAParser(body.user_agent);
    const browser = parser.getBrowser().name ?? null;
    const os = parser.getOS().name ?? null;
    const device = parser.getDevice().type ?? "desktop";
    if (sessionCache.has(body.session_id)) {
      addToBuffer({
        website_id: body.website_id,
        session_id: body.session_id,
        eventname: body.event_name,
        url_path: body.url_path,
        event_data: body.event_data ?? null
      });
      return reply.code(200).send({ status: "ok" });
    }
    const session = await db.insert(sessions).values({
      id: body.session_id,
      website_id: body.website_id,
      referrer: body.referrer ?? null,
      language: body.language ?? null,
      screen: body.screen ?? null,
      country,
      browser,
      os,
      device
    }).returning();
    sessionCache.add(session[0].id);
    addToBuffer({
      website_id: body.website_id,
      session_id: session[0].id,
      eventname: body.event_name,
      url_path: body.url_path,
      event_data: body.event_data ?? null
    });
    return reply.code(200).send({ status: "ok" });
  });
  app2.get("/api/topla", async (request, reply) => {
    const sessionsResult = await db.select().from(sessions);
    const eventsResult = await db.select().from(events);
    return { sessions: sessionsResult, events: eventsResult };
  });
};

// src/middlewares/_cors.ts
var import_fastify_plugin = __toESM(require("fastify-plugin"));
var import_cors = __toESM(require("@fastify/cors"));
var corsMiddleware = (0, import_fastify_plugin.default)(async (app2) => {
  await app2.register(import_cors.default, {
    origin: "*"
  });
});

// src/middlewares/rateLimit.ts
var import_rate_limit = __toESM(require("@fastify/rate-limit"));
var import_fastify_plugin2 = __toESM(require("fastify-plugin"));
var rateLimitMiddleware = (0, import_fastify_plugin2.default)(async (app2) => {
  await app2.register(import_rate_limit.default, {
    max: 1e11,
    timeWindow: "1 minute"
  });
});

// src/routes/stats.ts
var import_drizzle_orm = require("drizzle-orm");
var statsRoutes = async (app2) => {
  app2.get("/api/websites/:id/stats", async (request, reply) => {
    const { id } = request.params;
    const sessionsResult = await db.select().from(sessions).where((0, import_drizzle_orm.eq)(sessions.website_id, id));
    const eventsResult = await db.select().from(events).where((0, import_drizzle_orm.eq)(events.website_id, id));
    return {
      sessions: sessionsResult,
      events: eventsResult
    };
  });
};

// src/middlewares/errorHandler.ts
var import_fastify_plugin3 = __toESM(require("fastify-plugin"));
var errorHandler = (0, import_fastify_plugin3.default)(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    if (error.validation) {
      return reply.status(400).send({
        error: "Ge\xE7ersiz veri",
        details: error.validation
      });
    }
    reply.status(error.statusCode ?? 500).send({
      error: error.message ?? "Sunucu hatasi"
    });
  });
});

// src/index.ts
import_dotenv2.default.config();
var app = (0, import_fastify.default)();
var start = async () => {
  try {
    await app.register(corsMiddleware);
    await app.register(errorHandler);
    await app.register(import_static.default, {
      root: import_path.default.join(process.cwd(), "public")
    });
    await app.register(rateLimitMiddleware);
    app.get("/health", async () => {
      return { status: "ok" };
    });
    app.get("/db-test", async () => {
      const result = await db.execute(import_drizzle_orm2.sql`SELECT 1`);
      return { status: "db ok" };
    });
    await app.register(websiteRoutes);
    await app.register(toplaRoutes);
    await app.register(statsRoutes);
    const allWebsites = await db.select({ id: websites.id }).from(websites);
    allWebsites.forEach((w) => websiteCache.add(w.id));
    console.log(`Cache y\xFCklendi: ${websiteCache.size} site`);
    const allSessions = await db.select({ id: sessions.id }).from(sessions);
    allSessions.forEach((s) => sessionCache.add(s.id));
    console.log(`Cache y\xFCklendi: ${sessionCache.size} session`);
    startBuffer();
    const shutdown = async (signal) => {
      console.log(`${signal} alindi, buffer flush ediliyor...`);
      await flush();
      await app.close();
      process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    await app.listen({ port: Number(process.env.PORT) || 5e3 });
    console.log("Server 5000 portunda calisiyor");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
