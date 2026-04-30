import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { sessions, events } from '../db/schema'
import { eq, count, sql } from 'drizzle-orm'

export const statsRoutes = async (app: FastifyInstance) => {
    app.get('/api/websites/:id/stats', async (request, reply) => {
        const { id } = request.params as { id: string }

        // Frontend için raw data
        const sessionsResult = await db.select().from(sessions).where(eq(sessions.website_id, id))
        const eventsResult = await db.select().from(events).where(eq(events.website_id, id))

        // Grafik/metrikler için aggregate data
        const pageViews = await db
            .select({ url_path: events.url_path, count: count() })
            .from(events)
            .where(eq(events.website_id, id))
            .groupBy(events.url_path)

        const browsers = await db
            .select({ browser: sessions.browser, count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))
            .groupBy(sessions.browser)

        const devices = await db
            .select({ device: sessions.device, count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))
            .groupBy(sessions.device)

        const countries = await db
            .select({ country: sessions.country, count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))
            .groupBy(sessions.country)

        const scrollDepths = await db
            .select({
                depth: sql<number>`(${events.event_data}->>'depth')::int`,
                count: count()
            })
            .from(events)
            .where(eq(events.website_id, id))
            .groupBy(sql`(${events.event_data}->>'depth')::int`)

        const avgDuration = await db
            .select({
                avg: sql<number>`avg((${events.event_data}->>'duration')::int)`
            })
            .from(events)
            .where(eq(events.website_id, id))

        return {
            sessions: sessionsResult,
            events: eventsResult,
            pageViews,
            browsers,
            devices,
            countries,
            scrollDepths,
            avgDuration: Math.round(avgDuration[0].avg ?? 0)
        }
    })
}