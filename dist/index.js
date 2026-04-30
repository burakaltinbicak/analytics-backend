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
var import_drizzle_orm4 = require("drizzle-orm");

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
var import_drizzle_orm = require("drizzle-orm");
var import_zod2 = require("zod");

// src/db/cache.ts
var websiteCache = /* @__PURE__ */ new Set();
var sessionCache = /* @__PURE__ */ new Set();

// src/config.ts
var import_zod = require("zod");
var import_dotenv2 = __toESM(require("dotenv"));
import_dotenv2.default.config();
var envSchema = import_zod.z.object({
  DATABASE_URL: import_zod.z.string().url(),
  PORT: import_zod.z.coerce.number().default(5e3),
  API_URL: import_zod.z.string().url()
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("\u274C Ge\xE7ersiz environment variables:", parsed.error.format());
  process.exit(1);
}
var config = parsed.data;

// src/routes/websites.ts
var createWebsiteSchema = import_zod2.z.object({
  name: import_zod2.z.string().min(1),
  domain: import_zod2.z.string().min(1)
});
var websiteRoutes = async (app2) => {
  app2.post("/api/websites", async (request, reply) => {
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
      script: `<script async src="${config.API_URL}/tracker.js" data-website-id="${website.id}" data-api-url="${config.API_URL}"></script>`
    };
  });
  app2.get("/api/websites", async (request, reply) => {
    const allWebsites = await db.select().from(websites);
    if (allWebsites.length === 0) return [];
    const websiteIds = allWebsites.map((site) => site.id);
    const sessionCounts = await db.select({
      website_id: sessions.website_id,
      count: (0, import_drizzle_orm.count)()
    }).from(sessions).where(import_drizzle_orm.sql`${sessions.website_id} = ANY(${websiteIds}::uuid[])`).groupBy(sessions.website_id);
    const avgDurations = await db.select({
      website_id: events.website_id,
      avg: import_drizzle_orm.sql`avg((${events.event_data}->>'duration')::int)`
    }).from(events).where(import_drizzle_orm.sql`${events.website_id} = ANY(${websiteIds}::uuid[])`).groupBy(events.website_id);
    const sessionMap = new Map(sessionCounts.map((s) => [s.website_id, s.count]));
    const durationMap = new Map(avgDurations.map((d) => [d.website_id, Math.round(d.avg ?? 0)]));
    return allWebsites.map((site) => ({
      ...site,
      sessionCount: sessionMap.get(site.id) ?? 0,
      avgDuration: durationMap.get(site.id) ?? 0
    }));
  });
};

// src/routes/topla.ts
var import_zod3 = require("zod");
var import_geoip_lite = __toESM(require("geoip-lite"));
var import_ua_parser_js = require("ua-parser-js");

// src/db/writeBuffer.ts
var buffer = [];
var FLUSH_INTERVAL = 2e3;
var FLUSH_SIZE = 500;
var MAX_RETRIES = 3;
var isFlushing = false;
var addToBuffer = (event) => {
  buffer.push(event);
  if (buffer.length >= FLUSH_SIZE) flush();
};
var flush = async () => {
  if (buffer.length === 0) return;
  if (isFlushing) return;
  isFlushing = true;
  const toWrite = buffer.splice(0, buffer.length);
  try {
    await db.insert(events).values(toWrite);
  } catch (err) {
    console.error("Flush hatasi:", err);
    const retryable = toWrite.map((event) => ({
      ...event,
      _retries: (event._retries ?? 0) + 1
    })).filter((event) => event._retries < MAX_RETRIES);
    if (retryable.length > 0) {
      buffer.unshift(...retryable);
    }
    const dropped = toWrite.length - retryable.length;
    if (dropped > 0) {
      console.warn(`[Buffer] ${dropped} event max retry a\u015F\u0131ld\u0131, silindi.`);
    }
  } finally {
    isFlushing = false;
  }
};
var startBuffer = () => {
  setInterval(flush, FLUSH_INTERVAL);
  console.log("Write buffer ba\u015Flatildi");
};

// src/routes/topla.ts
var toplaSchema = import_zod3.z.object({
  website_id: import_zod3.z.string().uuid(),
  session_id: import_zod3.z.string(),
  event_name: import_zod3.z.string().min(1),
  url_path: import_zod3.z.string().min(1),
  referrer: import_zod3.z.string().nullable().optional(),
  language: import_zod3.z.string().optional(),
  screen: import_zod3.z.string().optional(),
  user_agent: import_zod3.z.string().optional(),
  event_data: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.any()).optional()
});
var batchSchema = import_zod3.z.object({
  events: import_zod3.z.array(toplaSchema).min(1).max(50)
});
async function processEvent(body, ip) {
  if (!websiteCache.has(body.website_id)) return;
  if (sessionCache.has(body.session_id)) {
    addToBuffer({
      website_id: body.website_id,
      session_id: body.session_id,
      eventname: body.event_name,
      url_path: body.url_path,
      event_data: body.event_data ?? null
    });
    return;
  }
  const geo = import_geoip_lite.default.lookup(ip);
  const country = geo?.country ?? null;
  const parser = new import_ua_parser_js.UAParser(body.user_agent);
  const browser = parser.getBrowser().name ?? null;
  const os = parser.getOS().name ?? null;
  const device = parser.getDevice().type ?? "desktop";
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
}
var toplaRoutes = async (app2) => {
  app2.post("/api/topla", async (request, reply) => {
    const body = toplaSchema.parse(request.body);
    await processEvent(body, request.ip);
    return reply.code(200).send({ status: "ok" });
  });
  app2.post("/api/topla/batch", async (request, reply) => {
    const body = batchSchema.parse(request.body);
    let processed = 0;
    for (const event of body.events) {
      await processEvent(event, request.ip);
      processed++;
    }
    return reply.code(200).send({ status: "ok", processed });
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
    max: 1e10,
    timeWindow: "1 minute"
  });
});

// src/routes/stats.ts
var import_drizzle_orm2 = require("drizzle-orm");
var statsRoutes = async (app2) => {
  app2.get("/api/websites/:id/stats", async (request, reply) => {
    const { id } = request.params;
    const [sessionCount] = await db.select({ count: (0, import_drizzle_orm2.count)() }).from(sessions).where((0, import_drizzle_orm2.eq)(sessions.website_id, id));
    const [eventCount] = await db.select({ count: (0, import_drizzle_orm2.count)() }).from(events).where((0, import_drizzle_orm2.eq)(events.website_id, id));
    const pageViews = await db.select({ url_path: events.url_path, count: (0, import_drizzle_orm2.count)() }).from(events).where((0, import_drizzle_orm2.eq)(events.website_id, id)).groupBy(events.url_path);
    const browsers = await db.select({ browser: sessions.browser, count: (0, import_drizzle_orm2.count)() }).from(sessions).where((0, import_drizzle_orm2.eq)(sessions.website_id, id)).groupBy(sessions.browser);
    const devices = await db.select({ device: sessions.device, count: (0, import_drizzle_orm2.count)() }).from(sessions).where((0, import_drizzle_orm2.eq)(sessions.website_id, id)).groupBy(sessions.device);
    const countries = await db.select({ country: sessions.country, count: (0, import_drizzle_orm2.count)() }).from(sessions).where((0, import_drizzle_orm2.eq)(sessions.website_id, id)).groupBy(sessions.country);
    const eventTypes = await db.select({ eventname: events.eventname, count: (0, import_drizzle_orm2.count)() }).from(events).where((0, import_drizzle_orm2.eq)(events.website_id, id)).groupBy(events.eventname);
    const scrollDepths = await db.select({
      depth: import_drizzle_orm2.sql`(${events.event_data}->>'depth')::int`,
      count: (0, import_drizzle_orm2.count)()
    }).from(events).where((0, import_drizzle_orm2.eq)(events.website_id, id)).groupBy(import_drizzle_orm2.sql`(${events.event_data}->>'depth')::int`);
    const avgDuration = await db.select({
      avg: import_drizzle_orm2.sql`avg((${events.event_data}->>'duration')::int)`
    }).from(events).where((0, import_drizzle_orm2.eq)(events.website_id, id));
    return {
      sessionCount: sessionCount.count,
      eventCount: eventCount.count,
      pageViews,
      browsers,
      devices,
      countries,
      eventTypes,
      scrollDepths,
      avgDuration: Math.round(avgDuration[0].avg ?? 0)
    };
  });
};

// src/services/heatmap.service.ts
var import_drizzle_orm3 = require("drizzle-orm");
async function getHeatmapData(websiteId, urlPath) {
  const conditions = [(0, import_drizzle_orm3.eq)(events.website_id, websiteId)];
  if (urlPath) {
    conditions.push((0, import_drizzle_orm3.eq)(events.url_path, urlPath));
  }
  const result = await db.select().from(events).where((0, import_drizzle_orm3.and)(...conditions));
  const clicks = result.filter((e) => e.eventname === "click" && e.event_data).map((e) => {
    const data = e.event_data;
    return {
      x: data.xPercent,
      y: data.yPercent,
      screenWidth: data.screenWidth,
      screenHeight: data.screenHeight,
      text: data.text,
      tag: data.tag
    };
  }).filter((e) => e.x != null && e.y != null);
  const scrollDepths = result.filter((e) => e.eventname === "scroll" && e.event_data).map((e) => {
    const data = e.event_data;
    return {
      depth: data.depth,
      sessionId: e.session_id
    };
  }).filter((e) => e.depth != null);
  const sessionMaxDepths = /* @__PURE__ */ new Map();
  scrollDepths.forEach(({ depth, sessionId }) => {
    const current = sessionMaxDepths.get(sessionId) ?? 0;
    if (depth > current) sessionMaxDepths.set(sessionId, depth);
  });
  const uniqueDepths = Array.from(sessionMaxDepths.values());
  const sessionDurations = /* @__PURE__ */ new Map();
  result.filter((e) => e.eventname === "time_on_page" && e.event_data).forEach((e) => {
    const data = e.event_data;
    const duration = data.duration;
    if (duration == null) return;
    const current = sessionDurations.get(e.session_id) ?? 0;
    sessionDurations.set(e.session_id, current + duration);
  });
  const timeOnPage = Array.from(sessionDurations.values());
  return { clicks, scrollDepths: uniqueDepths, timeOnPage };
}

// src/routes/heatmap.ts
var heatmapRoutes = async (app2) => {
  app2.get("/api/websites/:id/heatmap", async (request, reply) => {
    const { id } = request.params;
    const { urlPath } = request.query;
    const data = await getHeatmapData(id, urlPath);
    return data;
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
      const result = await db.execute(import_drizzle_orm4.sql`SELECT 1`);
      return { status: "db ok" };
    });
    await app.register(websiteRoutes);
    await app.register(toplaRoutes);
    await app.register(statsRoutes);
    await app.register(heatmapRoutes);
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
    await app.listen({ port: config.PORT });
    console.log(`Server ${config.PORT} portunda calisiyor`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
