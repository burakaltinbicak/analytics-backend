"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRoutes = void 0;
const index_1 = require("../db/index");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const statsRoutes = async (app) => {
    app.get('/api/websites/:id/stats', async (request, reply) => {
        const { id } = request.params;
        const sessionsResult = await index_1.db.select().from(schema_1.sessions).where((0, drizzle_orm_1.eq)(schema_1.sessions.website_id, id));
        const eventsResult = await index_1.db.select().from(schema_1.events).where((0, drizzle_orm_1.eq)(schema_1.events.website_id, id));
        return {
            sessions: sessionsResult,
            events: eventsResult
        };
    });
};
exports.statsRoutes = statsRoutes;
