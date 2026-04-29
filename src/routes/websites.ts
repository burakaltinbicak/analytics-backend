import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { websites, sessions, events } from '../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { websiteCache } from '../db/cache'

const createWebsiteSchema = z.object({
    name: z.string().min(1),
    domain: z.string().min(1)
})

export const websiteRoutes = async (app: FastifyInstance) => {

    app.post('/api/websites', async (request, reply) => {
        try {
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
                script: `<script async src="http://localhost:5000/tracker.js" data-website-id="${website.id}" data-api-url="http://localhost:5000"></script>`
            }
        } catch (err) {
            return reply.code(400).send({ error: "geçersiz veri." })
        }
    })

    app.get('/api/websites', async (request, reply) => {
        const allWebsites = await db.select().from(websites)

        const result = await Promise.all(
            allWebsites.map(async (site) => {
                const siteSessions = await db
                    .select()
                    .from(sessions)
                    .where(eq(sessions.website_id, site.id))

                const siteEvents = await db
                    .select()
                    .from(events)
                    .where(eq(events.website_id, site.id))

                const sessionDurations = new Map<string, number>()
                siteEvents
                    .filter(e => e.eventname === 'time_on_page' && e.event_data)
                    .forEach(e => {
                        const data = e.event_data as Record<string, any>
                        const duration = data.duration as number
                        if (duration == null) return
                        const current = sessionDurations.get(e.session_id) ?? 0
                        sessionDurations.set(e.session_id, current + duration)
                    })

                const durations = Array.from(sessionDurations.values())
                const avgDuration = durations.length > 0
                    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
                    : 0

                return {
                    ...site,
                    sessionCount: siteSessions.length,
                    avgDuration
                }
            })
        )

        return result
    })
}