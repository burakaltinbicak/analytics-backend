import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { sessions, events } from '../db/schema'
import { eq, count, sql } from 'drizzle-orm'

export const statsRoutes = async (app: FastifyInstance) => {
    app.get('/api/websites/:id/stats', async (request, reply) => {
        const { id } = request.params as { id: string }

        // Toplam sayılar
        const [sessionCount] = await db
            .select({ count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))

        const [eventCount] = await db
            .select({ count: count() })
            .from(events)
            .where(eq(events.website_id, id))

        // Sayfa bazlı ziyaret
        const pageViews = await db
            .select({ url_path: events.url_path, count: count() })
            .from(events)
            .where(eq(events.website_id, id))
            .groupBy(events.url_path)

        // Tarayıcı dağılımı
        const browsers = await db
            .select({ browser: sessions.browser, count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))
            .groupBy(sessions.browser)

        // Cihaz dağılımı
        const devices = await db
            .select({ device: sessions.device, count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))
            .groupBy(sessions.device)

        // Ülke dağılımı
        const countries = await db
            .select({ country: sessions.country, count: count() })
            .from(sessions)
            .where(eq(sessions.website_id, id))
            .groupBy(sessions.country)

        // Event tipi dağılımı
        const eventTypes = await db
            .select({ eventname: events.eventname, count: count() })
            .from(events)
            .where(eq(events.website_id, id))
            .groupBy(events.eventname)

        // Scroll derinliği
        const scrollDepths = await db
            .select({
                depth: sql<number>`(${events.event_data}->>'depth')::int`,
                count: count()
            })
            .from(events)
            .where(eq(events.website_id, id))
            .groupBy(sql`(${events.event_data}->>'depth')::int`)

        // Ortalama sayfa süresi
        const avgDuration = await db
            .select({
                avg: sql<number>`avg((${events.event_data}->>'duration')::int)`
            })
            .from(events)
            .where(eq(events.website_id, id))

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
        }
    })
}