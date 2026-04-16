"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toplaRoutes = void 0;
const index_1 = require("../db/index");
const schema_1 = require("../db/schema");
const zod_1 = require("zod");
const geoip_lite_1 = __importDefault(require("geoip-lite"));
const ua_parser_js_1 = require("ua-parser-js");
const cache_1 = require("../db/cache");
const writeBuffer_1 = require("../db/writeBuffer");
const toplaSchema = zod_1.z.object({
    website_id: zod_1.z.string().uuid(),
    session_id: zod_1.z.string(),
    event_name: zod_1.z.string().min(1),
    url_path: zod_1.z.string().min(1),
    referrer: zod_1.z.string().nullable().optional(),
    language: zod_1.z.string().optional(),
    screen: zod_1.z.string().optional(),
    user_agent: zod_1.z.string().optional(),
    event_data: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional()
});
const toplaRoutes = async (app) => {
    app.post('/api/topla', async (request, reply) => {
        let body;
        try {
            body = toplaSchema.parse(request.body);
        }
        catch (err) {
            return reply.code(400).send({ error: 'Geçersiz veri' });
        }
        if (!cache_1.websiteCache.has(body.website_id)) {
            return reply.code(404).send({ error: 'Site bulunamadı' });
        }
        const ip = request.ip;
        const geo = geoip_lite_1.default.lookup(ip);
        const country = geo?.country ?? null;
        const parser = new ua_parser_js_1.UAParser(body.user_agent);
        const browser = parser.getBrowser().name ?? null;
        const os = parser.getOS().name ?? null;
        const device = parser.getDevice().type ?? 'desktop';
        if (cache_1.sessionCache.has(body.session_id)) {
            (0, writeBuffer_1.addToBuffer)({
                website_id: body.website_id,
                session_id: body.session_id,
                eventname: body.event_name,
                url_path: body.url_path,
                event_data: body.event_data ?? null
            });
            return reply.code(200).send({ status: 'ok' });
        }
        const session = await index_1.db.insert(schema_1.sessions).values({
            id: body.session_id,
            website_id: body.website_id,
            referrer: body.referrer ?? null,
            language: body.language ?? null,
            screen: body.screen ?? null,
            country: country,
            browser: browser,
            os: os,
            device: device,
        }).returning();
        cache_1.sessionCache.add(session[0].id);
        (0, writeBuffer_1.addToBuffer)({
            website_id: body.website_id,
            session_id: session[0].id,
            eventname: body.event_name,
            url_path: body.url_path,
            event_data: body.event_data ?? null
        });
        return reply.code(200).send({ status: 'ok' });
    });
    app.get('/api/topla', async (request, reply) => {
        const sessionsResult = await index_1.db.select().from(schema_1.sessions);
        const eventsResult = await index_1.db.select().from(schema_1.events);
        return { sessions: sessionsResult, events: eventsResult };
    });
};
exports.toplaRoutes = toplaRoutes;
