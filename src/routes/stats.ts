import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { sessions, events } from '../db/schema'
import { eq } from 'drizzle-orm'

export const statsRoutes = async (app: FastifyInstance) => {
    app.get('/api/websites/:id/stats', async (request, reply) => {
        const { id } = request.params as { id: string }

        const sessionsResult = await db.select().from(sessions).where(eq(sessions.website_id, id))
        const eventsResult = await db.select().from(events).where(eq(events.website_id, id))

        return {
            sessions: sessionsResult,
            events: eventsResult
        }
    })
}