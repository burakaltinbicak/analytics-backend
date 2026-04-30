import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { websites, sessions, events } from '../db/schema'
import { count, sql, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { websiteCache } from '../db/cache'
import { config } from '../config'

const createWebsiteSchema = z.object({
    name: z.string().min(1),
    domain: z.string().min(1)
})

export const websiteRoutes = async (app: FastifyInstance) => {

    app.post('/api/websites', async (request, reply) => {
        const body = createWebsiteSchema.parse(request.body)

        const result = await db.insert(websites).values({
            name: body.name,
            domain: body.domain
        }).returning()

        const website = result[0]
        websiteCache.add(website.id)

        return {
            id: website.id,
            name: website.name,
            domain: website.domain,
            script: `<script async src="${config.API_URL}/tracker.js" data-website-id="${website.id}" data-api-url="${config.API_URL}"></script>`
        }
    })

    app.get('/api/websites', async (request, reply) => {
        const allWebsites = await db.select().from(websites)

        if (allWebsites.length === 0) return []

        const websiteIds = allWebsites.map(site => site.id)

        const sessionCounts = await db
            .select({
                website_id: sessions.website_id,
                count: count()
            })
            .from(sessions)
            .where(inArray(sessions.website_id, websiteIds))
            .groupBy(sessions.website_id)

        const avgDurations = await db
            .select({
                website_id: events.website_id,
                avg: sql<number>`avg((${events.event_data}->>'duration')::int)`
            })
            .from(events)
            .where(inArray(events.website_id, websiteIds))
            .groupBy(events.website_id)

        const sessionMap = new Map(sessionCounts.map(s => [s.website_id, s.count]))
        const durationMap = new Map(avgDurations.map(d => [d.website_id, Math.round(d.avg ?? 0)]))

        return allWebsites.map(site => ({
            ...site,
            sessionCount: sessionMap.get(site.id) ?? 0,
            avgDuration: durationMap.get(site.id) ?? 0
        }))
    })
}