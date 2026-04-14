import { FastifyInstance } from 'fastify'
import { db } from '../db/index'
import { sessions, events, websites } from '../db/schema'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'
const toplaSchema = z.object({
    website_id: z.string().uuid(),
    session_id: z.string(),
    event_name: z.string().min(1),
    url_path: z.string().min(1),
    referrer: z.string().nullable().optional(),
    language: z.string().optional(),
    screen: z.string().optional(),
    user_agent: z.string().optional(),
    event_data: z.record(z.string(), z.any()).optional()

})

export const toplaRoutes = async (app: FastifyInstance) => {
    app.post('/api/topla', async (request, reply) => {
        let body: any
        try {
            body = toplaSchema.parse(request.body)
        } catch (err) {
            return reply.code(400).send({ error: 'Geçersiz veri' })
        }

        const website = await db.select().from(websites).where(eq(websites.id, body.website_id))
        if (website.length === 0) {
            return reply.code(404).send({ error: 'Site bulunamadı' })
        }

        const ip = request.ip
        const geo = geoip.lookup(ip)
        const country = geo?.country ?? null

        const parser = new UAParser(body.user_agent)
        const browser = parser.getBrowser().name ?? null
        const os = parser.getOS().name ?? null
        const device = parser.getDevice().type ?? 'desktop'

        const existingSession = await db.select().from(sessions).where(eq(sessions.id, body.session_id))

        if (existingSession.length > 0) {
            await db.insert(events).values({
                website_id: body.website_id,
                session_id: body.session_id,
                eventname: body.event_name,
                url_path: body.url_path,
                event_data: body.event_data ?? null
            })
            return reply.code(200).send({ status: 'ok' })
        }

        const session = await db.insert(sessions).values({
            id: body.session_id,
            website_id: body.website_id,
            referrer: body.referrer ?? null,
            language: body.language ?? null,
            screen: body.screen ?? null,
            country: country,
            browser: browser,
            os: os,
            device: device,
        }).returning()

        await db.insert(events).values({
            website_id: body.website_id,
            session_id: session[0].id,
            eventname: body.event_name,
            url_path: body.url_path,
            event_data: body.event_data ?? null
        })

        return reply.code(200).send({ status: 'ok' })
    })

    app.get('/api/topla', async (request, reply) => {
        const sessionsResult = await db.select().from(sessions)
        const eventsResult = await db.select().from(events)
        return { sessions: sessionsResult, events: eventsResult }
    })
}