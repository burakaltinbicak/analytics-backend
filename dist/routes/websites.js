"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.websiteRoutes = void 0;
const index_1 = require("../db/index");
const schema_1 = require("../db/schema");
const zod_1 = require("zod");
const cache_1 = require("../db/cache");
const createWebsiteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    domain: zod_1.z.string().min(1)
});
const websiteRoutes = async (app) => {
    app.post('/api/websites', async (request, reply) => {
        try {
            const body = createWebsiteSchema.parse(request.body);
            const result = await index_1.db.insert(schema_1.websites).values({
                name: body.name,
                domain: body.domain
            }).returning();
            const website = result[0];
            cache_1.websiteCache.add(website.id);
            return {
                id: website.id,
                name: website.name,
                domain: website.domain,
                script: `<script async src="http://localhost:5000/tracker.js" data-website-id="${website.id}" data-api-url="http://localhost:5000"></script>`
            };
        }
        catch (err) {
            return reply.code(400).send({ error: "geçersiz veri." });
        }
    });
    app.get('/api/websites', async (request, reply) => {
        const result = await index_1.db.select().from(schema_1.websites);
        return result;
    });
};
exports.websiteRoutes = websiteRoutes;
